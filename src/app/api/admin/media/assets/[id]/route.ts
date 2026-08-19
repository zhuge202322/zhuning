import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";

import { isAdminResponse, requireAdmin } from "@/lib/admin-guard";
import { internalErrorResponse, parseJsonObject } from "@/lib/api-route";
import { findMediaReferences, migrateMediaReferences } from "@/lib/media-references";
import { cleanupReplacedMediaFile, finalizeStagedDeletion, restoreStagedDeletion, stageStoredMediaDeletion } from "@/lib/media-lifecycle-core.mjs";
import { runMediaMaintenance } from "@/lib/media-lifecycle";
import { configuredUploadDirectory, MediaStorageError, removeStoredMedia, resolveStoredMediaPath, storeMediaBuffer, storeMediaStream } from "@/lib/media-storage";
import { prisma } from "@/lib/prisma";
import { errorResponse, parsePositiveId } from "@/lib/input-validation";

type Context = { params: Promise<{ id: string }> };
const MULTIPART_REQUEST_MAX = 21 * 1024 * 1024;
const VIDEO_REQUEST_MAX = 200 * 1024 * 1024;
const TOMBSTONE_CLEANUP_INTERVAL_MS = process.env.MEDIA_TOMBSTONE_CLEANUP_INTERVAL_MS === undefined ? 30_000 : Number(process.env.MEDIA_TOMBSTONE_CLEANUP_INTERVAL_MS);
const TOMBSTONE_CLEANUP_MIN_AGE_MS = process.env.MEDIA_TOMBSTONE_CLEANUP_MIN_AGE_MS === undefined ? 10 * 60_000 : Number(process.env.MEDIA_TOMBSTONE_CLEANUP_MIN_AGE_MS);

async function retryPendingTombstones() {
  await runMediaMaintenance(prisma, {
    uploadDir: configuredUploadDirectory(),
    intervalMs: Number.isFinite(TOMBSTONE_CLEANUP_INTERVAL_MS) ? Math.max(0, TOMBSTONE_CLEANUP_INTERVAL_MS) : 30_000,
    tombstoneMinAgeMs: Number.isFinite(TOMBSTONE_CLEANUP_MIN_AGE_MS) ? Math.max(0, TOMBSTONE_CLEANUP_MIN_AGE_MS) : 10 * 60_000,
  });
}

class MediaConflictError extends Error {}
class MediaNotFoundError extends Error {}
class MediaInUseError extends Error {
  constructor(readonly references: Awaited<ReturnType<typeof findMediaReferences>>) {
    super("Media asset is in use");
  }
}

function mediaClass(mimeType: string) {
  return mimeType.startsWith("image/") ? "image" : mimeType.startsWith("video/") ? "video" : "other";
}

function requestLength(req: NextRequest, maximum: number) {
  const value = req.headers.get("content-length") || "";
  const parsed = /^\d+$/.test(value) ? Number(value) : 0;
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : null;
}

async function requestedId(context: Context) {
  return parsePositiveId((await context.params).id);
}

export async function PATCH(req: NextRequest, context: Context) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  await retryPendingTombstones();
  const id = await requestedId(context);
  if (!id) return errorResponse("Invalid media asset id");
  const parsed = await parseJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const existing = await prisma.mediaAsset.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!existing) return errorResponse("Media asset not found", 404);
  if (typeof parsed.data.alt !== "string" || parsed.data.alt.length > 1000 || typeof parsed.data.expectedUpdatedAt !== "string" || Number.isNaN(Date.parse(parsed.data.expectedUpdatedAt)) || Object.keys(parsed.data).some((key) => !["alt", "expectedUpdatedAt"].includes(key))) {
    return errorResponse("Invalid alt text");
  }
  const expectedUpdatedAt = new Date(parsed.data.expectedUpdatedAt);
  try {
    const changed = await prisma.mediaAsset.updateMany({
      where: { id, status: "ACTIVE", updatedAt: expectedUpdatedAt },
      data: { alt: parsed.data.alt.trim() },
    });
    if (changed.count !== 1) return errorResponse("Media asset changed or is not active; reload and try again", 409);
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) return errorResponse("Media asset not found", 404);
    return NextResponse.json({ asset });
  } catch (error) {
    return internalErrorResponse("Update media metadata failed", error);
  }
}

export async function PUT(req: NextRequest, context: Context) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  await retryPendingTombstones();
  const id = await requestedId(context);
  if (!id) return errorResponse("Invalid media asset id");
  const existing = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!existing) return errorResponse("Media asset not found", 404);
  let stored;
  let altValue: string | null = null;
  let expectedUpdatedAt = "";
  try {
    const contentType = req.headers.get("content-type")?.toLowerCase() || "";
    if (contentType === "application/octet-stream") {
      let originalName = "";
      try { originalName = decodeURIComponent(req.headers.get("x-filename") || ""); } catch { return errorResponse("Invalid upload filename"); }
      const mimeType = req.headers.get("x-mime-type") || "";
      const sizeValue = req.headers.get("x-file-size") || "";
      const declaredFileSize = /^\d+$/.test(sizeValue) ? Number(sizeValue) : 0;
      expectedUpdatedAt = req.headers.get("x-expected-updated-at") || "";
      try { altValue = decodeURIComponent(req.headers.get("x-alt") || "") || null; } catch { return errorResponse("Invalid alt text"); }
      if (!req.body || !originalName || mimeType !== "video/mp4" || requestLength(req, VIDEO_REQUEST_MAX) !== declaredFileSize) return errorResponse("Invalid video stream metadata");
      if (mediaClass(existing.mimeType) !== "video") return errorResponse("Replacement must use the same media type");
      stored = await storeMediaStream({ stream: Readable.fromWeb(req.body as never), originalName, mimeType, declaredFileSize });
    } else {
      if (!contentType.startsWith("multipart/form-data") || !requestLength(req, MULTIPART_REQUEST_MAX)) return errorResponse("Invalid multipart request size");
      let form: FormData;
      try { form = await req.formData(); } catch { return errorResponse("Invalid multipart body"); }
      const file = form.get("file");
      const formAlt = form.get("alt");
      const formExpected = form.get("expectedUpdatedAt");
      if (!(file instanceof File)) return errorResponse("A media file is required");
      if (file.type.startsWith("video/")) return errorResponse("Video replacement must use the streaming protocol");
      if (formAlt !== null && (typeof formAlt !== "string" || formAlt.length > 1000)) return errorResponse("Invalid alt text");
      altValue = typeof formAlt === "string" ? formAlt : null;
      expectedUpdatedAt = typeof formExpected === "string" ? formExpected : "";
      if (mediaClass(existing.mimeType) !== mediaClass(file.type)) return errorResponse("Replacement must use the same media type");
      stored = await storeMediaBuffer({ buffer: Buffer.from(await file.arrayBuffer()), originalName: file.name, mimeType: file.type });
    }
    if (!expectedUpdatedAt || Number.isNaN(Date.parse(expectedUpdatedAt))) {
      await removeStoredMedia(stored.url).catch(() => undefined);
      return errorResponse("expectedUpdatedAt is required");
    }
  } catch (error) {
    if (error instanceof MediaStorageError) return errorResponse(error.message);
    return internalErrorResponse("Store replacement media failed", error);
  }
  try {
    const asset = await prisma.$transaction(async (transaction) => {
      const current = await transaction.mediaAsset.findUnique({ where: { id } });
      if (!current) throw new MediaNotFoundError();
      if (current.updatedAt.toISOString() !== expectedUpdatedAt || current.url !== existing.url) throw new MediaConflictError();
      if (mediaClass(current.mimeType) !== mediaClass(stored.mimeType)) throw new MediaConflictError();
      const updated = await transaction.mediaAsset.updateMany({
        where: { id, updatedAt: current.updatedAt, url: current.url },
        data: { ...stored, alt: typeof altValue === "string" ? altValue.trim() : current.alt },
      });
      if (updated.count !== 1) throw new MediaConflictError();
      await migrateMediaReferences(transaction, current.url, stored.url);
      const result = await transaction.mediaAsset.findUnique({ where: { id } });
      if (!result) throw new MediaConflictError();
      return result;
    });
    const cleanup = await cleanupReplacedMediaFile(resolveStoredMediaPath(existing.url), id);
    return NextResponse.json({ asset, ...cleanup });
  } catch (error) {
    await removeStoredMedia(stored.url).catch(() => undefined);
    if (error instanceof MediaConflictError) return errorResponse("Media asset changed; reload and try again", 409);
    if (error instanceof MediaNotFoundError) return errorResponse("Media asset not found", 404);
    return internalErrorResponse("Replace media asset failed", error);
  }
}

export async function DELETE(_req: NextRequest, context: Context) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  await retryPendingTombstones();
  const id = await requestedId(context);
  if (!id) return errorResponse("Invalid media asset id");
  let deleting;
  try {
    deleting = await prisma.$transaction(async (transaction) => {
      const current = await transaction.mediaAsset.findUnique({ where: { id } });
      if (!current || current.status !== "ACTIVE") throw new MediaNotFoundError();
      const references = await findMediaReferences(current.url, transaction);
      if (references.length) throw new MediaInUseError(references);
      const changed = await transaction.mediaAsset.updateMany({ where: { id, url: current.url, updatedAt: current.updatedAt, status: "ACTIVE" }, data: { status: "DELETING" } });
      if (changed.count !== 1) throw new MediaConflictError();
      return transaction.mediaAsset.findUniqueOrThrow({ where: { id } });
    });
  } catch (error) {
    if (error instanceof MediaNotFoundError) return errorResponse("Media asset not found", 404);
    if (error instanceof MediaInUseError) return NextResponse.json({ error: error.message, references: error.references }, { status: 409 });
    if (error instanceof MediaConflictError) return errorResponse("Media asset changed; reload and try again", 409);
    return internalErrorResponse("Prepare media deletion failed", error);
  }

  let staged;
  try {
    staged = await stageStoredMediaDeletion(resolveStoredMediaPath(deleting.url), { assetId: id, kind: "delete" });
  } catch (error) {
    await prisma.mediaAsset.updateMany({ where: { id, status: "DELETING", url: deleting.url, updatedAt: deleting.updatedAt }, data: { status: "ACTIVE" } });
    return internalErrorResponse("Stage media deletion failed", error);
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const deleted = await transaction.mediaAsset.deleteMany({ where: { id, status: "DELETING", url: deleting.url, updatedAt: deleting.updatedAt } });
      if (deleted.count !== 1) throw new MediaConflictError();
    });
    try {
      await finalizeStagedDeletion(staged);
    } catch (cleanupError) {
      console.error("Delete tombstone cleanup failed:", cleanupError);
      return NextResponse.json({ ok: true, cleanupWarning: "Deleted media tombstone was queued for later cleanup." });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    let restored = false;
    try {
      restored = await restoreStagedDeletion(staged);
      if (!restored) console.error(`Media delete restore skipped because ${staged.originalPath} already exists`);
    } catch (restoreError) {
      console.error("Restore staged media deletion failed:", restoreError);
    }
    if (restored) await prisma.mediaAsset.updateMany({ where: { id, status: "DELETING", url: deleting.url, updatedAt: deleting.updatedAt }, data: { status: "ACTIVE" } });
    if (error instanceof MediaNotFoundError) return errorResponse("Media asset not found", 404);
    if (error instanceof MediaInUseError) return NextResponse.json({ error: error.message, references: error.references }, { status: 409 });
    if (error instanceof MediaConflictError) return errorResponse("Media asset changed; reload and try again", 409);
    return internalErrorResponse("Delete media asset failed", error);
  }
}
