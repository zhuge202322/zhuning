import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test, { after, before } from "node:test";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { stageStoredMediaDeletion } from "../../src/lib/media-lifecycle-core.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const prismaCli = path.join(repositoryRoot, "node_modules", "prisma", "build", "index.js");
const nextCli = path.join(repositoryRoot, "node_modules", "next", "dist", "bin", "next");
const seedScript = path.join(repositoryRoot, "scripts", "seed-cms.mjs");
const temporaryRoot = path.join(repositoryRoot, "tests", "api", ".tmp");
mkdirSync(temporaryRoot, { recursive: true });
const temporaryDirectory = mkdtempSync(path.join(temporaryRoot, "media-assets-"));
const databasePath = path.join(temporaryDirectory, "media.db");
const uploadDirectory = path.join(temporaryDirectory, "uploads");
const databaseUrl = `file:${databasePath.replaceAll("\\", "/")}`;
const adminUsername = "media-admin";
const adminPassword = "media-admin-password-123";
let server;
let baseUrl;
let prisma;
let adminCookie;

async function availablePort() {
  return await new Promise((resolve, reject) => {
    const socket = createServer();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const address = socket.address();
      socket.close(() => resolve(address.port));
    });
  });
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Next server exited with code ${child.exitCode}`);
    try {
      const response = await fetch(`${url}/admin/login`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Timed out waiting for Next server");
}

async function pngFile(name, color = { r: 160, g: 20, b: 40, alpha: 1 }) {
  const bytes = await sharp({ create: { width: 8, height: 6, channels: 4, background: color } }).png().toBuffer();
  return new File([bytes], name, { type: "image/png" });
}

function request(pathname, init = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: { ...init.headers, cookie: adminCookie },
  });
}

function mp4File(name = "clip.mp4") {
  return new File([validMp4Bytes()], name, { type: "video/mp4" });
}

function mp4Box(type, ...payloads) {
  const payload = Buffer.concat(payloads);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(payload.length + 8, 0);
  header.write(type, 4, 4, "ascii");
  return Buffer.concat([header, payload]);
}

function validMp4Bytes() {
  return readFileSync(path.resolve(repositoryRoot, "public/company/craft-process-1.mp4"));
}

async function upload(name, alt = "") {
  const form = new FormData();
  form.append("file", await pngFile(name));
  form.append("alt", alt);
  const response = await request("/api/admin/media/assets", { method: "POST", body: form });
  const body = await response.json();
  assert.equal(response.status, 201, JSON.stringify(body));
  return body.asset;
}

before(async () => {
  new DatabaseSync(databasePath).close();
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    ADMIN_USERNAME: adminUsername,
    ADMIN_PASSWORD: adminPassword,
    ADMIN_JWT_SECRET: "media-api-test-session-secret-2026",
    UPLOAD_DIR: uploadDirectory,
    MEDIA_TOMBSTONE_CLEANUP_INTERVAL_MS: "0",
    MEDIA_TOMBSTONE_CLEANUP_MIN_AGE_MS: "0",
  };
  execFileSync(process.execPath, [prismaCli, "db", "push", "--skip-generate", "--schema", path.join(repositoryRoot, "prisma", "schema.prisma")], { cwd: repositoryRoot, env, stdio: "pipe" });
  execFileSync(process.execPath, [seedScript], { cwd: repositoryRoot, env, stdio: "pipe" });
  const port = await availablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [nextCli, "dev", "-p", String(port)], { cwd: repositoryRoot, env, stdio: "pipe", windowsHide: true });
  await waitForServer(baseUrl, server);
  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const login = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: adminUsername, password: adminPassword }),
  });
  assert.equal(login.status, 200);
  adminCookie = login.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(adminCookie);
});

after(async () => {
  await prisma?.$disconnect();
  if (server && server.exitCode === null) {
    server.kill();
    await new Promise((resolve) => server.once("exit", resolve));
  }
  rmSync(temporaryDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

test("media asset routes require an administrator", async () => {
  assert.equal((await fetch(`${baseUrl}/api/admin/media/assets`)).status, 401);
  const form = new FormData();
  form.append("file", await pngFile("unauthorized.png"));
  assert.equal((await fetch(`${baseUrl}/api/admin/media/assets`, { method: "POST", body: form })).status, 401);
});

test("uploads, persists, lists, searches, and filters media assets", async () => {
  const image = await upload("scarlet-ring.png", "Scarlet ring");
  assert.equal(image.originalName, "scarlet-ring.png");
  assert.equal(image.mimeType, "image/png");
  assert.equal(image.width, 8);
  assert.equal(image.height, 6);
  assert.equal(image.alt, "Scarlet ring");
  assert.ok(existsSync(path.join(uploadDirectory, image.fileName)));

  const list = await (await request("/api/admin/media/assets")).json();
  assert.ok(list.items.some((asset) => asset.id === image.id));
  const searched = await (await request("/api/admin/media/assets?q=scarlet")).json();
  assert.deepEqual(searched.items.map((asset) => asset.id), [image.id]);
  const images = await (await request("/api/admin/media/assets?type=image")).json();
  assert.ok(images.items.some((asset) => asset.id === image.id));
  const videos = await (await request("/api/admin/media/assets?type=video")).json();
  assert.ok(videos.items.every((asset) => asset.mimeType.startsWith("video/")));
  assert.equal((await request("/api/admin/media/assets?type=invalid")).status, 400);
});

test("streams MP4 uploads and rejects multipart video and forged ftyp-only files", async () => {
  const video = validMp4Bytes();
  const streamed = await request("/api/admin/media/assets", {
    method: "POST",
    headers: { "content-type": "application/octet-stream", "x-filename": "stream.mp4", "x-mime-type": "video/mp4", "x-file-size": String(video.length), "x-alt": encodeURIComponent("Stream video") },
    body: video,
  });
  const streamedBody = await streamed.json();
  assert.equal(streamed.status, 201, JSON.stringify(streamedBody));
  assert.equal(streamedBody.asset.mimeType, "video/mp4");
  assert.equal(streamedBody.asset.alt, "Stream video");

  const multipart = new FormData();
  multipart.append("file", mp4File());
  assert.equal((await request("/api/admin/media/assets", { method: "POST", body: multipart })).status, 400);

  const forged = mp4Box("ftyp", Buffer.from("isom"), Buffer.alloc(4), Buffer.from("isommp42"));
  assert.equal((await request("/api/admin/media/assets", {
    method: "POST",
    headers: { "content-type": "application/octet-stream", "x-filename": "forged.mp4", "x-mime-type": "video/mp4", "x-file-size": String(forged.length) },
    body: forged,
  })).status, 400);
});

test("lists media with fixed cursor pagination", async () => {
  const created = [await upload("page-one.png"), await upload("page-two.png"), await upload("page-three.png")];
  const firstResponse = await request("/api/admin/media/assets?q=page-&limit=2");
  const first = await firstResponse.json();
  assert.equal(firstResponse.status, 200);
  assert.equal(first.items.length, 2);
  assert.ok(first.nextCursor);
  const second = await (await request(`/api/admin/media/assets?q=page-&limit=2&cursor=${first.nextCursor}`)).json();
  assert.equal(second.items.length, 1);
  assert.equal(second.nextCursor, null);
  assert.deepEqual(new Set([...first.items, ...second.items].map((asset) => asset.id)), new Set(created.map((asset) => asset.id)));
  assert.equal((await request("/api/admin/media/assets?limit=51")).status, 400);
  assert.equal((await request("/api/admin/media/assets?cursor=bad")).status, 400);
});

test("lists only ACTIVE assets and writers reject DELETING URLs", async () => {
  const asset = await upload("status-filter.png");
  await prisma.category.create({ data: { name: "Existing deleting reference", slug: `existing-deleting-${asset.id}`, imageUrl: asset.url } });
  await prisma.mediaAsset.update({ where: { id: asset.id }, data: { status: "DELETING" } });
  rmSync(path.join(uploadDirectory, asset.fileName), { force: true });
  const list = await (await request("/api/admin/media/assets?q=status-filter")).json();
  assert.deepEqual(list.items, []);
  const response = await request("/api/admin/categories", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Deleting media", slug: `deleting-media-${asset.id}`, imageUrl: asset.url }),
  });
  assert.equal(response.status, 400);
});

test("replaces MP4 through the raw stream protocol", async () => {
  const video = validMp4Bytes();
  const uploaded = await request("/api/admin/media/assets", {
    method: "POST", headers: { "content-type": "application/octet-stream", "x-filename": "before.mp4", "x-mime-type": "video/mp4", "x-file-size": String(video.length) }, body: video,
  });
  const uploadedBody = await uploaded.json();
  assert.equal(uploaded.status, 201, JSON.stringify(uploadedBody));
  const asset = uploadedBody.asset;
  const response = await request(`/api/admin/media/assets/${asset.id}`, {
    method: "PUT",
    headers: { "content-type": "application/octet-stream", "x-filename": "after.mp4", "x-mime-type": "video/mp4", "x-file-size": String(video.length), "x-expected-updated-at": asset.updatedAt },
    body: video,
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.asset.originalName, "after.mp4");
});

test("rejects unsafe uploads and malformed multipart input", async () => {
  const svg = new FormData();
  svg.append("file", new File(["<svg><script>alert(1)</script></svg>"], "unsafe.svg", { type: "image/svg+xml" }));
  assert.equal((await request("/api/admin/media/assets", { method: "POST", body: svg })).status, 400);
  const fake = new FormData();
  fake.append("file", new File(["not png"], "fake.png", { type: "image/png" }));
  assert.equal((await request("/api/admin/media/assets", { method: "POST", body: fake })).status, 400);
  assert.equal((await request("/api/admin/media/assets", { method: "POST", body: "bad multipart" })).status, 400);
});

test("updates alt metadata and maps invalid or missing records", async () => {
  const asset = await upload("alt-edit.png");
  const updated = await request(`/api/admin/media/assets/${asset.id}`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ alt: "Edited alt", expectedUpdatedAt: asset.updatedAt }),
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).asset.alt, "Edited alt");
  assert.equal((await request(`/api/admin/media/assets/${asset.id}`, { method: "PATCH", body: "not-json" })).status, 400);
  assert.equal((await request(`/api/admin/media/assets/${asset.id}`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ alt: 12 }),
  })).status, 400);
  assert.equal((await request("/api/admin/media/assets/999999", {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ alt: "Missing" }),
  })).status, 404);
});

test("replaces a file without leaving the old physical resource", async () => {
  const asset = await upload("before-replace.png", "Before");
  const oldPath = path.join(uploadDirectory, asset.fileName);
  const form = new FormData();
  form.append("file", await pngFile("after-replace.png", { r: 10, g: 100, b: 180, alpha: 1 }));
  form.append("alt", "After");
  form.append("expectedUpdatedAt", asset.updatedAt);
  const response = await request(`/api/admin/media/assets/${asset.id}`, { method: "PUT", body: form });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.asset.id, asset.id);
  assert.equal(body.asset.originalName, "after-replace.png");
  assert.equal(body.asset.alt, "After");
  assert.equal(existsSync(oldPath), false);
  assert.equal(existsSync(path.join(uploadDirectory, body.asset.fileName)), true);
  assert.equal((await request("/api/admin/media/assets/999999", { method: "PUT", body: form })).status, 404);
});

test("replacement migrates existing URL references to the new file", async () => {
  const asset = await upload("replace-referenced.png");
  const category = await prisma.category.create({ data: { name: "Replace reference", slug: `replace-reference-${asset.id}`, imageUrl: asset.url } });
  const form = new FormData();
  form.append("file", await pngFile("replacement-reference.png"));
  form.append("expectedUpdatedAt", asset.updatedAt);
  const response = await request(`/api/admin/media/assets/${asset.id}`, { method: "PUT", body: form });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.notEqual(body.asset.url, asset.url);
  assert.equal((await prisma.category.findUnique({ where: { id: category.id } })).imageUrl, body.asset.url);
});

test("replacement rejects crossing image and video media classes", async () => {
  const image = await upload("image-class.png");
  const form = new FormData();
  form.append("file", mp4File());
  form.append("expectedUpdatedAt", image.updatedAt);
  const response = await request(`/api/admin/media/assets/${image.id}`, { method: "PUT", body: form });
  assert.equal(response.status, 400);
  const current = await prisma.mediaAsset.findUnique({ where: { id: image.id } });
  assert.equal(current.url, image.url);
});

test("replacement rejects a stale expectedUpdatedAt and preserves current file and references", async () => {
  const asset = await upload("stale-replace.png");
  const category = await prisma.category.create({ data: { name: "Stale reference", slug: `stale-reference-${asset.id}`, imageUrl: asset.url } });
  const patched = await request(`/api/admin/media/assets/${asset.id}`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ alt: "Newer metadata", expectedUpdatedAt: asset.updatedAt }),
  });
  assert.equal(patched.status, 200);
  const beforeFiles = new Set(readdirSync(uploadDirectory));
  const form = new FormData();
  form.append("file", await pngFile("stale-new.png"));
  form.append("expectedUpdatedAt", asset.updatedAt);
  const response = await request(`/api/admin/media/assets/${asset.id}`, { method: "PUT", body: form });
  assert.equal(response.status, 409);
  assert.equal((await prisma.mediaAsset.findUnique({ where: { id: asset.id } })).url, asset.url);
  assert.equal((await prisma.category.findUnique({ where: { id: category.id } })).imageUrl, asset.url);
  assert.deepEqual(new Set(readdirSync(uploadDirectory)), beforeFiles);
});

test("PATCH rejects missing or stale versions and DELETING assets", async () => {
  const asset = await upload("patch-version.png");
  assert.equal((await request(`/api/admin/media/assets/${asset.id}`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ alt: "No version" }),
  })).status, 400);
  const stale = await request(`/api/admin/media/assets/${asset.id}`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ alt: "Stale", expectedUpdatedAt: "2020-01-01T00:00:00.000Z" }),
  });
  assert.equal(stale.status, 409);
  await prisma.mediaAsset.update({ where: { id: asset.id }, data: { status: "DELETING" } });
  const deleting = await request(`/api/admin/media/assets/${asset.id}`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ alt: "Blocked", expectedUpdatedAt: asset.updatedAt }),
  });
  assert.equal(deleting.status, 409);
});

test("refuses deletion while referenced and identifies references", async () => {
  const asset = await upload("referenced.png");
  const category = await prisma.category.create({ data: { name: "Referenced category", slug: `referenced-${asset.id}`, imageUrl: asset.url } });
  const response = await request(`/api/admin/media/assets/${asset.id}`, { method: "DELETE" });
  const body = await response.json();
  assert.equal(response.status, 409);
  assert.equal(body.error, "Media asset is in use");
  assert.ok(body.references.some((reference) => reference.type === "Category" && reference.id === category.id));
  assert.ok(await prisma.mediaAsset.findUnique({ where: { id: asset.id } }));
  assert.ok(existsSync(path.join(uploadDirectory, asset.fileName)));
  assert.equal(readdirSync(uploadDirectory).some((name) => name.startsWith(".delete-")), false);
});

test("refuses deletion for Product and Post rich-text references", async () => {
  const asset = await upload("rich-delete.png");
  const product = await prisma.product.create({
    data: { name: "Rich product", slug: `rich-product-${asset.id}`, description: `<p><img src="${asset.url}"></p>`, specsFr: `<a href="${asset.url}">Spec</a>` },
  });
  const post = await prisma.post.create({
    data: { title: "Rich post", slug: `rich-post-${asset.id}`, content: `<figure><img src="${asset.url}"></figure>`, excerptAr: `<p>${asset.url}</p>` },
  });
  const response = await request(`/api/admin/media/assets/${asset.id}`, { method: "DELETE" });
  const body = await response.json();
  assert.equal(response.status, 409);
  assert.ok(body.references.some((reference) => reference.type === "Product" && reference.id === product.id && reference.field === "description"));
  assert.ok(body.references.some((reference) => reference.type === "Product" && reference.id === product.id && reference.field === "specsFr"));
  assert.ok(body.references.some((reference) => reference.type === "Post" && reference.id === post.id && reference.field === "content"));
  assert.ok(body.references.some((reference) => reference.type === "Post" && reference.id === post.id && reference.field === "excerptAr"));
});

test("legacy query and hash references block deletion by canonical base URL", async () => {
  const asset = await upload("legacy-reference.png");
  const product = await prisma.product.create({
    data: { name: "Legacy media reference", slug: `legacy-media-${asset.id}`, description: `<img src="${asset.url}?width=300"><a href="${asset.url}#download">Download</a>` },
  });
  const response = await request(`/api/admin/media/assets/${asset.id}`, { method: "DELETE" });
  const body = await response.json();
  assert.equal(response.status, 409);
  assert.ok(body.references.some((reference) => reference.type === "Product" && reference.id === product.id && reference.field === "description"));
});

test("replacement migrates exact Product and Post rich-text URLs without replacing URL prefixes", async () => {
  const asset = await upload("rich-replace.png");
  const product = await prisma.product.create({
    data: {
      name: "Replace rich product", slug: `replace-rich-product-${asset.id}`,
      descriptionEs: `<img src="${asset.url}"><img src="${asset.url}-thumb">`,
      formula: `<a href="${asset.url}">Formula</a>`,
    },
  });
  const post = await prisma.post.create({
    data: { title: "Replace rich post", slug: `replace-rich-post-${asset.id}`, excerptFr: `<p>${asset.url}</p>`, contentAr: `<img src="${asset.url}">` },
  });
  const form = new FormData();
  form.append("file", await pngFile("rich-replacement.png"));
  form.append("expectedUpdatedAt", asset.updatedAt);
  const response = await request(`/api/admin/media/assets/${asset.id}`, { method: "PUT", body: form });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
  const updatedPost = await prisma.post.findUnique({ where: { id: post.id } });
  assert.equal(updatedProduct.descriptionEs, `<img src="${body.asset.url}"><img src="${asset.url}-thumb">`);
  assert.equal(updatedProduct.formula, `<a href="${body.asset.url}">Formula</a>`);
  assert.equal(updatedPost.excerptFr, `<p>${body.asset.url}</p>`);
  assert.equal(updatedPost.contentAr, `<img src="${body.asset.url}">`);
});

test("deletes an unreferenced asset from the database and disk", async () => {
  const asset = await upload("delete-me.png");
  const filePath = path.join(uploadDirectory, asset.fileName);
  const response = await request(`/api/admin/media/assets/${asset.id}`, { method: "DELETE" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(await prisma.mediaAsset.findUnique({ where: { id: asset.id } }), null);
  assert.equal(existsSync(filePath), false);
  assert.equal(readdirSync(uploadDirectory).some((name) => name.startsWith(".delete-")), false);
  assert.equal((await request(`/api/admin/media/assets/${asset.id}`, { method: "DELETE" })).status, 404);
});

test("failed physical staging conditionally restores ACTIVE status", async () => {
  const asset = await upload("missing-physical.png");
  rmSync(path.join(uploadDirectory, asset.fileName), { force: true });
  const response = await request(`/api/admin/media/assets/${asset.id}`, { method: "DELETE" });
  assert.equal(response.status, 500);
  assert.equal((await prisma.mediaAsset.findUnique({ where: { id: asset.id } })).status, "ACTIVE");
});

test("media maintenance reconciles interrupted DELETING assets", async () => {
  const restoreOriginal = await upload("reconcile-original.png");
  await prisma.mediaAsset.update({ where: { id: restoreOriginal.id }, data: { status: "DELETING" } });

  const finishDelete = await upload("reconcile-delete.png");
  await prisma.mediaAsset.update({ where: { id: finishDelete.id }, data: { status: "DELETING" } });
  const finishStaged = await stageStoredMediaDeletion(
    path.join(uploadDirectory, finishDelete.fileName),
    { assetId: finishDelete.id, kind: "delete" },
  );

  const restoreReferenced = await upload("reconcile-reference.png");
  const category = await prisma.category.create({
    data: { name: "Reconcile reference", slug: `reconcile-reference-${restoreReferenced.id}`, imageUrl: restoreReferenced.url },
  });
  await prisma.mediaAsset.update({ where: { id: restoreReferenced.id }, data: { status: "DELETING" } });
  const referencedStaged = await stageStoredMediaDeletion(
    path.join(uploadDirectory, restoreReferenced.fileName),
    { assetId: restoreReferenced.id, kind: "delete" },
  );

  const missing = await upload("reconcile-missing.png");
  await prisma.mediaAsset.update({ where: { id: missing.id }, data: { status: "DELETING" } });
  rmSync(path.join(uploadDirectory, missing.fileName), { force: true });

  assert.equal((await request("/api/admin/media/assets?q=reconcile")).status, 200);

  assert.equal((await prisma.mediaAsset.findUnique({ where: { id: restoreOriginal.id } })).status, "ACTIVE");
  assert.equal(existsSync(path.join(uploadDirectory, restoreOriginal.fileName)), true);
  assert.equal(await prisma.mediaAsset.findUnique({ where: { id: finishDelete.id } }), null);
  assert.equal(existsSync(finishStaged.tombstonePath), false);
  assert.equal((await prisma.mediaAsset.findUnique({ where: { id: restoreReferenced.id } })).status, "ACTIVE");
  assert.equal(existsSync(path.join(uploadDirectory, restoreReferenced.fileName)), true);
  assert.equal(existsSync(referencedStaged.tombstonePath), false);
  assert.equal((await prisma.category.findUnique({ where: { id: category.id } })).imageUrl, restoreReferenced.url);
  assert.equal(await prisma.mediaAsset.findUnique({ where: { id: missing.id } }), null);
});

test("media API retries persistent tombstone cleanup", async () => {
  const tombstone = path.join(uploadDirectory, ".delete-33333333-3333-4333-8333-333333333333.tombstone");
  mkdirSync(uploadDirectory, { recursive: true });
  (await import("node:fs")).writeFileSync(tombstone, "pending");
  assert.equal((await request("/api/admin/media/assets")).status, 200);
  assert.equal(existsSync(tombstone), false);
});

test("admin writers reject unknown local upload URLs transactionally", async () => {
  const orphan = "/uploads/99999999-9999-4999-8999-999999999999.jpg";
  const suffix = `${Date.now()}`;
  const mediaRow = await prisma.siteMedia.create({ data: { key: `test-media-${suffix}`, label: "Test media" } });
  const cases = [
    ["POST", "/api/admin/categories", { name: "Orphan category", slug: `orphan-category-${suffix}`, imageUrl: orphan }],
    ["POST", "/api/admin/posts", { title: "Orphan post", slug: `orphan-post-${suffix}`, featuredImage: orphan }],
    ["POST", "/api/admin/products", { name: "Orphan product", slug: `orphan-product-${suffix}`, images: [{ src: orphan, alt: "" }] }],
    ["PUT", "/api/admin/settings", { settings: [{ key: "site.logo", value: orphan }] }],
    ["PUT", "/api/admin/sections", { pageKey: "home", sectionKey: "hero", mediaUrl: orphan }],
    ["PUT", "/api/admin/media", { items: [{ key: mediaRow.key, url: orphan }] }],
  ];
  for (const [method, pathname, body] of cases) {
    const response = await request(pathname, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    assert.equal(response.status, 400, `${pathname}: ${await response.text()}`);
  }
});

test("admin writers reject non-canonical uploads targets", async () => {
  const suffix = `${Date.now()}`;
  const invalidTargets = [
    "/uploads/file.jpg?width=200",
    "/uploads/file.jpg#preview",
    "/uploads/%66ile.jpg",
    "/uploads\\file.jpg",
    "/uploads/../file.jpg",
    "https://example.com/uploads/file.jpg",
  ];
  for (const [index, imageUrl] of invalidTargets.entries()) {
    const response = await request("/api/admin/categories", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: `Invalid target ${index}`, slug: `invalid-target-${suffix}-${index}`, imageUrl }),
    });
    assert.equal(response.status, 400, `${imageUrl}: ${await response.text()}`);
  }
});

test("admin writers accept a persisted local MediaAsset URL", async () => {
  const asset = await upload("valid-writer.png");
  const response = await request("/api/admin/categories", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Valid media category", slug: `valid-media-${asset.id}`, imageUrl: asset.url }),
  });
  assert.equal(response.status, 200, await response.text());
});

test("product update preserves unchanged imported product media but rejects new legacy URLs", async () => {
  const suffix = `${Date.now()}`;
  const legacy = {
    image: "/uploads/imported-products/rings/main.jpg",
    skuImage: "/uploads/imported-products/rings/sku-main.webp",
    skuGallery: "/uploads/imported-products/rings/sku-side.png",
    specsPdf: "/uploads/imported-products/rings/specs.pdf",
    formulaPdf: "/uploads/imported-products/rings/formula.pdf",
  };
  const product = await prisma.product.create({
    data: {
      name: "Imported ring",
      slug: `imported-ring-${suffix}`,
      specsPdf: legacy.specsPdf,
      formulaPdf: legacy.formulaPdf,
      images: { create: [{ src: legacy.image, alt: "Imported ring" }] },
      skus: {
        create: [{
          name: "18K Gold",
          image: legacy.skuImage,
          images: { create: [{ src: legacy.skuGallery }] },
        }],
      },
    },
    include: { images: true, skus: { include: { images: true } } },
  });

  const titleOnly = await request(`/api/admin/products/${product.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Imported ring title only" }),
  });
  assert.equal(titleOnly.status, 200, await titleOnly.text());

  const preserved = await request(`/api/admin/products/${product.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Imported ring renamed",
      images: [{ src: legacy.image, alt: "Imported ring" }],
      specsPdf: legacy.specsPdf,
      formulaPdf: legacy.formulaPdf,
      skus: [{ name: "18K Gold", image: legacy.skuImage, images: [legacy.skuImage, legacy.skuGallery] }],
    }),
  });
  assert.equal(preserved.status, 200, await preserved.text());
  const current = await prisma.product.findUnique({
    where: { id: product.id },
    include: { images: true, skus: { include: { images: true } } },
  });
  assert.equal(current.name, "Imported ring renamed");
  assert.equal(current.images[0].src, legacy.image);
  assert.equal(current.skus[0].image, legacy.skuImage);
  assert.deepEqual(current.skus[0].images.map((image) => image.src), [legacy.skuImage, legacy.skuGallery]);
  assert.equal(current.specsPdf, legacy.specsPdf);
  assert.equal(current.formulaPdf, legacy.formulaPdf);

  const changed = await request(`/api/admin/products/${product.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ images: [{ src: "/uploads/imported-products/rings/new-main.jpg", alt: "Changed" }] }),
  });
  assert.equal(changed.status, 400);

  const created = await request("/api/admin/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "New legacy product", slug: `new-legacy-${suffix}`, images: [{ src: legacy.image, alt: "" }] }),
  });
  assert.equal(created.status, 400);
});
