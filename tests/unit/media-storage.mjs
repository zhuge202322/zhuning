import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import test, { after } from "node:test";

import sharp from "sharp";

import {
  MediaStorageError,
  removeStoredMedia,
  resolveStoredMediaPath,
  storeMediaBuffer,
  storeMediaStream,
} from "../../src/lib/media-storage-core.mjs";

const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), "zhuning-media-storage-"));

after(() => rmSync(temporaryDirectory, { recursive: true, force: true }));

async function imageBuffer(format) {
  return sharp({
    create: { width: 3, height: 2, channels: 4, background: { r: 180, g: 20, b: 40, alpha: 1 } },
  }).toFormat(format).toBuffer();
}

function validMp4() {
  return readFileSync(path.resolve(process.cwd(), "public/company/craft-process-1.mp4"));
}

function box(type, ...payloads) {
  const payload = Buffer.concat(payloads);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(payload.length + 8, 0);
  header.write(type, 4, 4, "ascii");
  return Buffer.concat([header, payload]);
}

function forgedFtypOnly() {
  return box("ftyp", Buffer.from("isom"), Buffer.alloc(4), Buffer.from("isommp42"));
}

test("stores JPEG, PNG, WebP, AVIF and MP4 with normalized random names", async () => {
  const cases = [
    ["photo.jpeg", "image/jpeg", await imageBuffer("jpeg"), ".jpg"],
    ["photo.png", "image/png", await imageBuffer("png"), ".png"],
    ["photo.webp", "image/webp", await imageBuffer("webp"), ".webp"],
    ["photo.avif", "image/avif", await imageBuffer("avif"), ".avif"],
    ["clip.mp4", "video/mp4", validMp4(), ".mp4"],
  ];

  for (const [originalName, mimeType, buffer, extension] of cases) {
    const stored = await storeMediaBuffer({ buffer, originalName, mimeType, uploadDir: temporaryDirectory });
    assert.match(stored.fileName, new RegExp(`^[0-9a-f-]{36}\\${extension}$`));
    assert.equal(stored.url, `/uploads/${stored.fileName}`);
    assert.equal(stored.byteSize, buffer.length);
    assert.deepEqual(readFileSync(path.join(temporaryDirectory, stored.fileName)), buffer);
    if (mimeType.startsWith("image/")) {
      assert.equal(stored.width, 3);
      assert.equal(stored.height, 2);
    } else {
      assert.equal(stored.width, null);
      assert.equal(stored.height, null);
      assert.equal(stored.durationMs, null);
    }
  }
});

test("rejects MIME, extension, and actual signature mismatches", async () => {
  const jpeg = await imageBuffer("jpeg");
  const invalid = [
    { originalName: "photo.png", mimeType: "image/jpeg", buffer: jpeg },
    { originalName: "photo.jpg", mimeType: "image/png", buffer: jpeg },
    { originalName: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from("not an image") },
    { originalName: "clip.mp4", mimeType: "video/mp4", buffer: forgedFtypOnly() },
  ];
  for (const input of invalid) {
    await assert.rejects(storeMediaBuffer({ ...input, uploadDir: temporaryDirectory }), MediaStorageError);
  }
});

test("streams a valid MP4 to disk and rejects incomplete streams without leftovers", async () => {
  const video = validMp4();
  const stored = await storeMediaStream({
    stream: Readable.from([video.subarray(0, 13), video.subarray(13)]),
    originalName: "stream.mp4", mimeType: "video/mp4", declaredFileSize: video.length,
    uploadDir: temporaryDirectory,
  });
  assert.equal(readFileSync(path.join(temporaryDirectory, stored.fileName)).length, video.length);
  const before = new Set(readdirSync(temporaryDirectory));
  await assert.rejects(storeMediaStream({
    stream: Readable.from([video]), originalName: "short.mp4", mimeType: "video/mp4",
    declaredFileSize: video.length + 1, uploadDir: temporaryDirectory,
  }), MediaStorageError);
  assert.deepEqual(new Set(readdirSync(temporaryDirectory)), before);
  assert.equal(existsSync(path.join(temporaryDirectory, "short.mp4")), false);
});

test("rejects a declared stream larger than the video limit before reading", async () => {
  await assert.rejects(storeMediaStream({
    stream: Readable.from([]), originalName: "large.mp4", mimeType: "video/mp4",
    declaredFileSize: 200 * 1024 * 1024 + 1, uploadDir: temporaryDirectory,
  }), (error) => error instanceof MediaStorageError && error.code === "INVALID_SIZE");
});

test("rejects SVG, HTML, executables, unsafe names, empty files, and oversized files", async () => {
  const invalid = [
    { originalName: "x.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg><script>alert(1)</script></svg>") },
    { originalName: "x.html", mimeType: "text/html", buffer: Buffer.from("<html></html>") },
    { originalName: "x.exe", mimeType: "application/x-msdownload", buffer: Buffer.from("MZ") },
    { originalName: "../x.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff]) },
    { originalName: "x.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(0) },
    { originalName: "x.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(20 * 1024 * 1024 + 1) },
  ];
  for (const input of invalid) {
    await assert.rejects(storeMediaBuffer({ ...input, uploadDir: temporaryDirectory }), MediaStorageError);
  }
});

test("keeps resolved storage paths inside UPLOAD_DIR", () => {
  const safeName = "11111111-1111-4111-8111-111111111111.jpg";
  assert.equal(resolveStoredMediaPath(`/uploads/${safeName}`, temporaryDirectory), path.join(temporaryDirectory, safeName));
  for (const unsafe of ["/uploads/../outside.jpg", "/uploads/%2e%2e/outside.jpg", "/uploads/a/b.jpg", "C:\\outside.jpg", "/other/file.jpg"]) {
    assert.throws(() => resolveStoredMediaPath(unsafe, temporaryDirectory), MediaStorageError);
  }
});

test("uses exclusive writes and does not overwrite an existing generated name", async () => {
  const collisionId = "00000000-0000-4000-8000-000000000000";
  const existingPath = path.join(temporaryDirectory, `${collisionId}.jpg`);
  writeFileSync(existingPath, "keep me");
  await assert.rejects(storeMediaBuffer({
    buffer: await imageBuffer("jpeg"),
    originalName: "photo.jpg",
    mimeType: "image/jpeg",
    uploadDir: temporaryDirectory,
    randomUUID: () => collisionId,
  }), (error) => error instanceof MediaStorageError && error.code === "FILE_EXISTS");
  assert.equal(readFileSync(existingPath, "utf8"), "keep me");
});

test("removes only contained stored media files", async () => {
  const stored = await storeMediaBuffer({
    buffer: await imageBuffer("png"), originalName: "photo.png", mimeType: "image/png", uploadDir: temporaryDirectory,
  });
  assert.equal(await removeStoredMedia(stored.url, temporaryDirectory), true);
  assert.equal(await removeStoredMedia(stored.url, temporaryDirectory), false);
  await assert.rejects(removeStoredMedia("/uploads/../outside.png", temporaryDirectory), MediaStorageError);
});
