import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { isAdminResponse, requireAdmin } from '@/lib/admin-guard';
import { errorResponse, uploadExtensionForMime, validateUploadMetadata } from '@/lib/input-validation';
import { acquireUploadLock, cleanupExpiredUploadSessions, releaseUploadLock } from '@/lib/upload-session-core.mjs';

export const maxDuration = 300;

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads'));
const UPLOAD_ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;
const UPLOAD_TOKEN_PATTERN = /^[a-f0-9]{32}$/;
const UPLOAD_SESSION_TTL_MS = Number(process.env.UPLOAD_SESSION_TTL_MS) || 24 * 60 * 60 * 1000;

class UploadInputError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

type ChunkState = {
  originalName: string;
  mimeType: string;
  declaredFileSize: number;
  total: number;
  nextIndex: number;
  uploadToken: string;
};

function uploadPath(filename: string) {
  if (!filename || filename.includes('\\') || filename.includes('/')) throw new UploadInputError('Invalid upload path');
  const resolved = path.resolve(UPLOAD_DIR, filename);
  const relative = path.relative(UPLOAD_DIR, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new UploadInputError('Invalid upload path');
  return resolved;
}

function removeFiles(...files: Array<string | undefined>) {
  for (const file of files) {
    if (!file) continue;
    try {
      fs.rmSync(file, { force: true });
    } catch (error) {
      console.error('Upload cleanup failed:', error);
    }
  }
}

function chunkPaths(uploadId: string) {
  return {
    temporaryPath: uploadPath(`temp-${uploadId}.part`),
    statePath: uploadPath(`temp-${uploadId}.json`),
    lockPath: uploadPath(`temp-${uploadId}.lock`),
  };
}

function readChunkState(statePath: string): ChunkState | null {
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as ChunkState;
    return state && typeof state === 'object' ? state : null;
  } catch {
    return null;
  }
}

function tokensMatch(received: string, expected: string) {
  if (!UPLOAD_TOKEN_PATTERN.test(received) || !UPLOAD_TOKEN_PATTERN.test(expected)) return false;
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

function cleanupAuthorizedChunkSession(req: NextRequest) {
  const uploadId = req.headers.get('x-upload-id') || '';
  const uploadToken = req.headers.get('x-upload-token') || '';
  if (!UPLOAD_ID_PATTERN.test(uploadId) || !UPLOAD_TOKEN_PATTERN.test(uploadToken)) return false;
  const { temporaryPath, statePath, lockPath } = chunkPaths(uploadId);
  const lock = acquireUploadLock(lockPath);
  if (!lock) return false;
  try {
  const state = readChunkState(statePath);
  if (!state || !tokensMatch(uploadToken, state.uploadToken)) return false;
  removeFiles(temporaryPath, statePath);
  return true;
  } finally {
    releaseUploadLock(lock);
  }
}

function requiredInteger(value: string | null, message: string) {
  if (!value || !/^\d+$/.test(value)) throw new UploadInputError(message);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new UploadInputError(message);
  return parsed;
}

function originalFilename(req: NextRequest) {
  const encoded = req.headers.get('x-filename');
  if (!encoded) return 'video.mp4';
  try {
    return decodeURIComponent(encoded);
  } catch {
    throw new UploadInputError('Invalid upload filename');
  }
}

function generatedFilename(extension: string) {
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`;
}

function validateStreamMetadata(req: NextRequest) {
  const originalName = originalFilename(req);
  const mimeType = req.headers.get('x-mime-type') || '';
  const declaredFileSize = requiredInteger(req.headers.get('x-file-size'), 'Invalid upload size');
  const validation = validateUploadMetadata({ originalName, mimeType, byteSize: declaredFileSize });
  if (!validation.ok) throw new UploadInputError(validation.error || 'Invalid upload metadata');
  const extension = uploadExtensionForMime(mimeType);
  if (!extension) throw new UploadInputError('Unsupported upload type');
  return { originalName, mimeType, declaredFileSize, extension };
}

async function handleMultipart(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new UploadInputError('Invalid multipart body');
  }
  const file = form.get('file');
  if (!(file instanceof File)) throw new UploadInputError('No file found in formData');

  const validation = validateUploadMetadata({ originalName: file.name, mimeType: file.type, byteSize: file.size });
  if (!validation.ok) throw new UploadInputError(validation.error || 'Invalid upload metadata');
  const extension = uploadExtensionForMime(file.type);
  if (!extension) throw new UploadInputError('Unsupported upload type');

  const finalFilename = generatedFilename(extension);
  const finalPath = uploadPath(finalFilename);
  try {
    fs.writeFileSync(finalPath, Buffer.from(await file.arrayBuffer()), { flag: 'wx' });
  } catch (error) {
    removeFiles(finalPath);
    throw error;
  }
  return NextResponse.json({ url: `/uploads/${finalFilename}` });
}

async function handleChunk(req: NextRequest, metadata: ReturnType<typeof validateStreamMetadata>) {
  const uploadId = req.headers.get('x-upload-id') || '';
  if (!UPLOAD_ID_PATTERN.test(uploadId)) throw new UploadInputError('Invalid upload id');

  const index = requiredInteger(req.headers.get('x-chunk-index'), 'Invalid chunk metadata');
  const total = requiredInteger(req.headers.get('x-chunk-total'), 'Invalid chunk metadata');
  const offset = requiredInteger(req.headers.get('x-chunk-offset'), 'Invalid chunk metadata');
  if (total < 1 || total > 10000 || index >= total) throw new UploadInputError('Invalid chunk metadata');

  const { temporaryPath, statePath, lockPath } = chunkPaths(uploadId);
  const lock = acquireUploadLock(lockPath);
  if (!lock) throw new UploadInputError('Upload is busy', 409);
  try {
  const cleanup = () => removeFiles(temporaryPath, statePath);

  let state: ChunkState;
  if (index === 0) {
    if (offset !== 0) {
      cleanup();
      throw new UploadInputError('Invalid first chunk offset');
    }
    if (fs.existsSync(temporaryPath) || fs.existsSync(statePath)) {
      throw new UploadInputError('Upload already exists', 409);
    }
    state = {
      originalName: metadata.originalName,
      mimeType: metadata.mimeType,
      declaredFileSize: metadata.declaredFileSize,
      total,
      nextIndex: 1,
      uploadToken: crypto.randomBytes(16).toString('hex'),
    };
  } else {
    if (!fs.existsSync(temporaryPath) || !fs.existsSync(statePath)) {
      cleanup();
      throw new UploadInputError('Unexpected chunk order', 409);
    }
    try {
      state = readChunkState(statePath) as ChunkState;
    } catch {
      state = null as never;
    }
    const uploadToken = req.headers.get('x-upload-token') || '';
    if (!state || !tokensMatch(uploadToken, state.uploadToken)) {
      throw new UploadInputError('Unexpected chunk order', 409);
    }
    const stateMatches = state.originalName === metadata.originalName
      && state.mimeType === metadata.mimeType
      && state.declaredFileSize === metadata.declaredFileSize
      && state.total === total
      && state.nextIndex === index;
    if (!stateMatches || fs.statSync(temporaryPath).size !== offset) {
      cleanup();
      throw new UploadInputError('Unexpected chunk order', 409);
    }
  }

  const chunk = Buffer.from(await req.arrayBuffer());
  if (chunk.length === 0 || offset + chunk.length > metadata.declaredFileSize) {
    cleanup();
    throw new UploadInputError('Invalid chunk size');
  }

  if (index === 0) {
    try {
      fs.writeFileSync(temporaryPath, chunk, { flag: 'wx' });
    } catch (error) {
      cleanup();
      throw error;
    }
  } else {
    try {
      fs.appendFileSync(temporaryPath, chunk);
    } catch (error) {
      cleanup();
      throw error;
    }
    state.nextIndex += 1;
  }

  const currentSize = fs.statSync(temporaryPath).size;
  const isLast = index === total - 1;
  if (!isLast && currentSize >= metadata.declaredFileSize) {
    cleanup();
    throw new UploadInputError('Invalid chunk size');
  }
  if (!isLast) {
    try {
      fs.writeFileSync(statePath, JSON.stringify(state), { flag: 'w' });
    } catch (error) {
      cleanup();
      throw error;
    }
    return NextResponse.json({ success: true, part: index, uploadToken: state.uploadToken });
  }

  if (currentSize !== metadata.declaredFileSize) {
    cleanup();
    throw new UploadInputError('Incomplete upload');
  }
  const finalFilename = generatedFilename(metadata.extension);
  const finalPath = uploadPath(finalFilename);
  try {
    fs.renameSync(temporaryPath, finalPath);
    removeFiles(statePath);
  } catch (error) {
    removeFiles(temporaryPath, statePath, finalPath);
    throw error;
  }
  return NextResponse.json({ url: `/uploads/${finalFilename}` });
  } finally {
    releaseUploadLock(lock);
  }
}

async function handleDirect(req: NextRequest, metadata: ReturnType<typeof validateStreamMetadata>) {
  if (!req.body) throw new UploadInputError('Empty body stream');
  const finalFilename = generatedFilename(metadata.extension);
  const finalPath = uploadPath(finalFilename);
  let received = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;
      callback(received <= metadata.declaredFileSize ? null : new UploadInputError('Upload exceeds declared size'), chunk);
    },
  });

  try {
    await pipeline(Readable.fromWeb(req.body as never), limiter, fs.createWriteStream(finalPath, { flags: 'wx' }));
    if (received !== metadata.declaredFileSize) throw new UploadInputError('Incomplete upload');
  } catch (error) {
    removeFiles(finalPath);
    throw error;
  }
  return NextResponse.json({ url: `/uploads/${finalFilename}` });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  cleanupExpiredUploadSessions(UPLOAD_DIR, { ttlMs: UPLOAD_SESSION_TTL_MS });
  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.toLowerCase().startsWith('multipart/form-data')) return await handleMultipart(req);

    const chunkHeaders = ['x-upload-id', 'x-chunk-index', 'x-chunk-total', 'x-chunk-offset'];
    const chunkContextHeaders = [...chunkHeaders, 'x-upload-token'];
    const presentChunkHeaders = chunkHeaders.filter((header) => req.headers.has(header));
    const hasChunkContext = chunkContextHeaders.some((header) => req.headers.has(header));
    if (hasChunkContext && presentChunkHeaders.length !== chunkHeaders.length) {
      throw new UploadInputError('Invalid chunk metadata');
    }
    const metadata = validateStreamMetadata(req);
    return presentChunkHeaders.length === chunkHeaders.length
      ? await handleChunk(req, metadata)
      : await handleDirect(req, metadata);
  } catch (error) {
    if (error instanceof UploadInputError) {
      cleanupAuthorizedChunkSession(req);
      return errorResponse(error.message, error.status);
    }
    console.error('Upload failed:', error);
    return errorResponse('Server upload internal error', 500);
  }
}
