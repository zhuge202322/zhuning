import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";

import { isAdminResponse, requireAdmin } from "@/lib/admin-guard";
import { internalErrorResponse } from "@/lib/api-route";
import { runMediaMaintenance } from "@/lib/media-lifecycle";
import { configuredUploadDirectory, MediaStorageError, removeStoredMedia, storeMediaBuffer, storeMediaStream } from "@/lib/media-storage";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/input-validation";

export const maxDuration = 300;
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

function strictContentLength(req: NextRequest, maximum: number) {
  const value = req.headers.get("content-length");
  if (!value || !/^\d+$/.test(value)) return null;
  const size = Number(value);
  return Number.isSafeInteger(size) && size > 0 && size <= maximum ? size : null;
}

function rawMetadata(req: NextRequest) {
  let originalName = "";
  try { originalName = decodeURIComponent(req.headers.get("x-filename") || ""); } catch { return null; }
  const mimeType = req.headers.get("x-mime-type") || "";
  const sizeValue = req.headers.get("x-file-size") || "";
  const declaredFileSize = /^\d+$/.test(sizeValue) ? Number(sizeValue) : 0;
  let alt = "";
  try { alt = decodeURIComponent(req.headers.get("x-alt") || ""); } catch { return null; }
  if (!originalName || mimeType !== "video/mp4" || !Number.isSafeInteger(declaredFileSize) || declaredFileSize <= 0 || declaredFileSize > VIDEO_REQUEST_MAX || alt.length > 1000) return null;
  const contentLength = strictContentLength(req, VIDEO_REQUEST_MAX);
  if (contentLength !== declaredFileSize) return null;
  return { originalName, mimeType, declaredFileSize, alt: alt.trim() };
}

function validAlt(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.length <= 1000 ? value.trim() : null;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  await retryPendingTombstones();
  const query = req.nextUrl.searchParams.get("q")?.trim() || "";
  const type = req.nextUrl.searchParams.get("type") || "all";
  const limitValue = req.nextUrl.searchParams.get("limit") || "24";
  const cursorValue = req.nextUrl.searchParams.get("cursor");
  if (!(["all", "image", "video"] as const).includes(type as "all")) return errorResponse("Invalid media type filter");
  if (query.length > 200) return errorResponse("Search query is too long");
  if (!/^\d+$/.test(limitValue) || Number(limitValue) < 1 || Number(limitValue) > 50) return errorResponse("Invalid pagination limit");
  if (cursorValue !== null && (!/^\d+$/.test(cursorValue) || Number(cursorValue) < 1)) return errorResponse("Invalid pagination cursor");
  const limit = Number(limitValue);
  const cursor = cursorValue === null ? null : Number(cursorValue);
  try {
    const assets = await prisma.mediaAsset.findMany({
      where: {
        status: "ACTIVE",
        ...(cursor ? { id: { lt: cursor } } : {}),
        ...(type === "image" ? { mimeType: { startsWith: "image/" } } : type === "video" ? { mimeType: { startsWith: "video/" } } : {}),
        ...(query ? { OR: [{ originalName: { contains: query } }, { alt: { contains: query } }] } : {}),
      },
      orderBy: { id: "desc" },
      take: limit + 1,
    });
    const hasMore = assets.length > limit;
    const items = hasMore ? assets.slice(0, limit) : assets;
    return NextResponse.json({ items, nextCursor: hasMore ? String(items.at(-1)?.id) : null });
  } catch (error) {
    return internalErrorResponse("List media assets failed", error);
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  await retryPendingTombstones();
  let stored;
  let alt = "";
  try {
    const contentType = req.headers.get("content-type")?.toLowerCase() || "";
    if (contentType === "application/octet-stream") {
      const metadata = rawMetadata(req);
      if (!metadata || !req.body) return errorResponse("Invalid video stream metadata");
      alt = metadata.alt;
      stored = await storeMediaStream({ stream: Readable.fromWeb(req.body as never), ...metadata });
    } else {
      if (!contentType.startsWith("multipart/form-data") || !strictContentLength(req, MULTIPART_REQUEST_MAX)) return errorResponse("Invalid multipart request size");
      let form: FormData;
      try { form = await req.formData(); } catch { return errorResponse("Invalid multipart body"); }
      const file = form.get("file");
      const parsedAlt = validAlt(form.get("alt"));
      if (!(file instanceof File)) return errorResponse("A media file is required");
      if (file.type.startsWith("video/")) return errorResponse("Video uploads must use the streaming protocol");
      if (parsedAlt === null) return errorResponse("Invalid alt text");
      alt = parsedAlt;
      stored = await storeMediaBuffer({ buffer: Buffer.from(await file.arrayBuffer()), originalName: file.name, mimeType: file.type });
    }
  } catch (error) {
    if (error instanceof MediaStorageError) return errorResponse(error.message);
    return internalErrorResponse("Store media asset failed", error);
  }
  try {
    const asset = await prisma.mediaAsset.create({ data: { ...stored, alt } });
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    await removeStoredMedia(stored.url).catch(() => undefined);
    return internalErrorResponse("Persist media asset failed", error);
  }
}
