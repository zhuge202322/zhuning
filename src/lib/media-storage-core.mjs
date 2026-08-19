import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { createFile as createMp4File } from "mp4box";
import sharp from "sharp";

const IMAGE_MAX_BYTES = 20 * 1024 * 1024;
const VIDEO_MAX_BYTES = 200 * 1024 * 1024;
const STORED_FILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|avif|mp4)$/i;

const TYPES = {
  "image/jpeg": { extension: ".jpg", sourceExtensions: [".jpg", ".jpeg"], kind: "image", sharpFormats: ["jpeg"] },
  "image/png": { extension: ".png", sourceExtensions: [".png"], kind: "image", sharpFormats: ["png"] },
  "image/webp": { extension: ".webp", sourceExtensions: [".webp"], kind: "image", sharpFormats: ["webp"] },
  "image/avif": { extension: ".avif", sourceExtensions: [".avif"], kind: "image", sharpFormats: ["heif", "avif"] },
  "video/mp4": { extension: ".mp4", sourceExtensions: [".mp4"], kind: "video" },
};

export class MediaStorageError extends Error {
  constructor(message, code = "INVALID_MEDIA") {
    super(message);
    this.name = "MediaStorageError";
    this.code = code;
  }
}

export function configuredUploadDirectory() {
  return path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads"));
}

function hasPrefix(buffer, bytes) {
  return buffer.length >= bytes.length && bytes.every((byte, index) => buffer[index] === byte);
}

function hasExpectedSignature(buffer, mimeType) {
  if (mimeType === "image/jpeg") return hasPrefix(buffer, [0xff, 0xd8, 0xff]);
  if (mimeType === "image/png") return hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mimeType === "image/webp") return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (mimeType === "image/avif") return buffer.length >= 16 && buffer.subarray(4, 8).toString("ascii") === "ftyp" && ["avif", "avis"].includes(buffer.subarray(8, 12).toString("ascii"));
  return false;
}

const MP4_PARSE_CHUNK_BYTES = 1024 * 1024;

function asMp4BoxBuffer(buffer, fileStart) {
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  Object.defineProperty(arrayBuffer, "fileStart", { value: fileStart, enumerable: true });
  return arrayBuffer;
}

function createMp4Inspector() {
  const parser = createMp4File();
  let info = null;
  let parserError = null;
  parser.onError = (error) => { parserError = typeof error === "string" ? error : "Invalid MP4 video container"; };
  parser.onReady = (readyInfo) => { info = readyInfo; };
  return {
    append(buffer, fileStart) {
      try { parser.appendBuffer(asMp4BoxBuffer(buffer, fileStart)); } catch (error) {
        throw new MediaStorageError(error instanceof Error ? error.message : "Invalid MP4 video container", "SIGNATURE_MISMATCH");
      }
      if (parserError) throw new MediaStorageError(parserError, "SIGNATURE_MISMATCH");
    },
    finish() {
      try { parser.flush(); } catch (error) {
        throw new MediaStorageError(error instanceof Error ? error.message : "Invalid MP4 video container", "SIGNATURE_MISMATCH");
      }
      if (parserError) throw new MediaStorageError(parserError, "SIGNATURE_MISMATCH");
      const videoTracks = Array.isArray(info?.tracks) ? info.tracks.filter((track) => track?.video) : [];
      const validVideo = videoTracks.some((track) => typeof track.codec === "string" && track.codec.length > 0 && Number(track.nb_samples) > 0 && Number(track.duration) > 0 && Number(track.timescale) > 0);
      if (!validVideo || Number(info?.duration) <= 0 || Number(info?.timescale) <= 0) throw new MediaStorageError("MP4 must contain a non-empty video track", "SIGNATURE_MISMATCH");
      return { durationMs: Math.round((info.duration / info.timescale) * 1000) };
    },
  };
}

async function inspectMp4Buffer(buffer) {
  const inspector = createMp4Inspector();
  for (let offset = 0; offset < buffer.length; offset += MP4_PARSE_CHUNK_BYTES) inspector.append(buffer.subarray(offset, Math.min(buffer.length, offset + MP4_PARSE_CHUNK_BYTES)), offset);
  return inspector.finish();
}

async function inspectMp4File(filePath, byteSize) {
  const handle = await fs.promises.open(filePath, "r");
  try {
    const inspector = createMp4Inspector();
    for (let offset = 0; offset < byteSize; offset += MP4_PARSE_CHUNK_BYTES) {
      const buffer = Buffer.alloc(Math.min(MP4_PARSE_CHUNK_BYTES, byteSize - offset));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, offset);
      if (bytesRead !== buffer.length) throw new MediaStorageError("Truncated MP4 video", "SIGNATURE_MISMATCH");
      inspector.append(buffer, offset);
    }
    return inspector.finish();
  } finally {
    await handle.close();
  }
}

function validateOriginalName(originalName, type) {
  if (typeof originalName !== "string" || !originalName || originalName.length > 255 || /[\\/]/.test(originalName) || originalName.includes("..")) {
    throw new MediaStorageError("Invalid upload filename");
  }
  const extension = path.extname(originalName).toLowerCase();
  if (!type.sourceExtensions.includes(extension)) throw new MediaStorageError("Upload extension does not match its type");
}

function containedPath(uploadDir, fileName) {
  const root = path.resolve(uploadDir);
  const resolved = path.resolve(root, fileName);
  const relative = path.relative(root, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || relative !== fileName) {
    throw new MediaStorageError("Invalid media path");
  }
  return resolved;
}

export function resolveStoredMediaPath(url, uploadDir = configuredUploadDirectory()) {
  if (typeof url !== "string" || !url.startsWith("/uploads/") || url.includes("?") || url.includes("#")) {
    throw new MediaStorageError("Invalid stored media URL");
  }
  let fileName;
  try {
    fileName = decodeURIComponent(url.slice("/uploads/".length));
  } catch {
    throw new MediaStorageError("Invalid stored media URL");
  }
  if (!STORED_FILE_PATTERN.test(fileName) || fileName.includes("/") || fileName.includes("\\")) {
    throw new MediaStorageError("Invalid stored media URL");
  }
  return containedPath(uploadDir, fileName);
}

export async function inspectMediaBuffer({ buffer, originalName, mimeType }) {
  if (!Buffer.isBuffer(buffer)) throw new MediaStorageError("Invalid upload body");
  const type = TYPES[mimeType];
  if (!type) throw new MediaStorageError("Unsupported upload type");
  validateOriginalName(originalName, type);
  const maximum = type.kind === "video" ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
  if (buffer.length === 0 || buffer.length > maximum) throw new MediaStorageError("Invalid upload size", "INVALID_SIZE");
  if (mimeType === "video/mp4") await inspectMp4Buffer(buffer);
  else if (!hasExpectedSignature(buffer, mimeType)) throw new MediaStorageError("File content does not match its type", "SIGNATURE_MISMATCH");

  let width = null;
  let height = null;
  if (type.kind === "image") {
    let metadata;
    try {
      metadata = await sharp(buffer, { failOn: "error" }).metadata();
    } catch {
      throw new MediaStorageError("Invalid or corrupt image", "SIGNATURE_MISMATCH");
    }
    if (!type.sharpFormats.includes(metadata.format) || !metadata.width || !metadata.height) {
      throw new MediaStorageError("File content does not match its type", "SIGNATURE_MISMATCH");
    }
    width = metadata.width;
    height = metadata.height;
  }

  return { type, byteSize: buffer.length, width, height, durationMs: null };
}

export async function storeMediaStream({ stream, originalName, mimeType, declaredFileSize, uploadDir = configuredUploadDirectory(), randomUUID = crypto.randomUUID }) {
  const type = TYPES[mimeType];
  if (!type || type.kind !== "video") throw new MediaStorageError("Raw streaming is supported only for MP4 video");
  validateOriginalName(originalName, type);
  if (!Number.isSafeInteger(declaredFileSize) || declaredFileSize <= 0 || declaredFileSize > VIDEO_MAX_BYTES) throw new MediaStorageError("Invalid upload size", "INVALID_SIZE");
  const root = path.resolve(uploadDir);
  fs.mkdirSync(root, { recursive: true });
  const id = randomUUID();
  const temporaryPath = containedPath(root, `.upload-${id}.part`);
  const fileName = `${id}${type.extension}`;
  if (!STORED_FILE_PATTERN.test(fileName)) throw new MediaStorageError("Invalid generated filename");
  const finalPath = containedPath(root, fileName);
  let received = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      received += chunk.length;
      callback(received <= declaredFileSize ? null : new MediaStorageError("Upload exceeds declared size", "INVALID_SIZE"), chunk);
    },
  });
  try {
    await pipeline(stream, limiter, fs.createWriteStream(temporaryPath, { flags: "wx" }));
    if (received !== declaredFileSize) throw new MediaStorageError("Incomplete upload", "INVALID_SIZE");
    const inspected = await inspectMp4File(temporaryPath, received);
    fs.linkSync(temporaryPath, finalPath);
    fs.unlinkSync(temporaryPath);
    return { originalName, fileName, url: `/uploads/${fileName}`, mimeType, byteSize: received, width: null, height: null, durationMs: inspected.durationMs };
  } catch (error) {
    await fs.promises.rm(temporaryPath, { force: true }).catch(() => undefined);
    await fs.promises.rm(finalPath, { force: true }).catch(() => undefined);
    if (error?.code === "EEXIST") throw new MediaStorageError("Generated media filename already exists", "FILE_EXISTS");
    throw error;
  }
}

export async function storeMediaBuffer({ buffer, originalName, mimeType, uploadDir = configuredUploadDirectory(), randomUUID = crypto.randomUUID }) {
  const inspected = await inspectMediaBuffer({ buffer, originalName, mimeType });
  const fileName = `${randomUUID()}${inspected.type.extension}`;
  if (!STORED_FILE_PATTERN.test(fileName)) throw new MediaStorageError("Invalid generated filename");
  const finalPath = containedPath(uploadDir, fileName);
  fs.mkdirSync(path.resolve(uploadDir), { recursive: true });
  try {
    fs.writeFileSync(finalPath, buffer, { flag: "wx" });
  } catch (error) {
    if (error?.code === "EEXIST") throw new MediaStorageError("Generated media filename already exists", "FILE_EXISTS");
    throw error;
  }
  return {
    originalName,
    fileName,
    url: `/uploads/${fileName}`,
    mimeType,
    byteSize: inspected.byteSize,
    width: inspected.width,
    height: inspected.height,
    durationMs: inspected.durationMs,
  };
}

export async function removeStoredMedia(url, uploadDir = configuredUploadDirectory()) {
  const filePath = resolveStoredMediaPath(url, uploadDir);
  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}
