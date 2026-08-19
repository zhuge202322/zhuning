import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test, { after, before } from "node:test";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

import {
  normalizePageOrder,
  validatePageSectionInput,
  validateSiteSettingInput,
} from "../../src/lib/cms-registry-core.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const prismaCli = path.join(repositoryRoot, "node_modules", "prisma", "build", "index.js");
const nextCli = path.join(repositoryRoot, "node_modules", "next", "dist", "bin", "next");
const seedScript = path.join(repositoryRoot, "scripts", "seed-cms.mjs");
const temporaryRoot = path.join(repositoryRoot, "tests", "api", ".tmp");
mkdirSync(temporaryRoot, { recursive: true });
const temporaryDirectory = mkdtempSync(path.join(temporaryRoot, "cms-api-"));
const databasePath = path.join(temporaryDirectory, "cms-api.db");
const uploadDirectory = path.join(temporaryDirectory, "uploads");
const databaseUrl = `file:${databasePath.replaceAll("\\", "/")}`;
const adminUsername = "api-admin";
const adminPassword = "api-admin-password-123";
const sessionSecret = "api-test-session-secret-2026";
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

before(async () => {
  new DatabaseSync(databasePath).close();
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    ADMIN_USERNAME: adminUsername,
    ADMIN_PASSWORD: adminPassword,
    ADMIN_JWT_SECRET: sessionSecret,
    UPLOAD_DIR: uploadDirectory,
  };
  execFileSync(process.execPath, [prismaCli, "db", "push", "--skip-generate", "--schema", path.join(repositoryRoot, "prisma", "schema.prisma")], { cwd: repositoryRoot, env, stdio: "pipe" });
  execFileSync(process.execPath, [seedScript], { cwd: repositoryRoot, env, stdio: "pipe" });
  execFileSync(process.execPath, [nextCli, "build"], { cwd: repositoryRoot, env, stdio: "pipe" });

  const port = await availablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [nextCli, "start", "-p", String(port)], { cwd: repositoryRoot, env, stdio: "pipe", windowsHide: true });
  await waitForServer(baseUrl, server);
  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  const login = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: adminUsername, password: adminPassword }),
  });
  assert.equal(login.status, 200);
  adminCookie = login.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(adminCookie?.startsWith("myklens_admin="));
});

after(async () => {
  await prisma?.$disconnect();
  if (server && server.exitCode === null) {
    server.kill();
    await new Promise((resolve) => server.once("exit", resolve));
  }
  rmSync(temporaryDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

test("accepts registered settings and rejects unknown keys", () => {
  assert.deepEqual(validateSiteSettingInput({ key: "site.name", value: "Muxcor" }), {
    ok: true,
    value: { key: "site.name", value: "Muxcor", type: "text", group: "brand" },
  });
  assert.deepEqual(validateSiteSettingInput({ key: "site.unknown", value: "x" }), {
    ok: false,
    error: "Unknown site setting",
  });
});

test("validates URL settings and section links", () => {
  assert.equal(validateSiteSettingInput({ key: "social.instagram", value: "javascript:alert(1)" }).ok, false);
  assert.equal(validateSiteSettingInput({ key: "site.logo", value: "tel:+123" }).ok, false);
  assert.equal(validatePageSectionInput({ pageKey: "home", sectionKey: "hero", buttonHref: "javascript:alert(1)" }).ok, false);
  assert.equal(validatePageSectionInput({ pageKey: "home", sectionKey: "hero", buttonHref: "/\\\\evil.example/x" }).ok, false);
  assert.equal(validatePageSectionInput({ pageKey: "home", sectionKey: "hero", buttonHref: "/products" }).ok, true);
  assert.equal(validatePageSectionInput({ pageKey: "customization", sectionKey: "hero", buttonHref: "mailto:sales@example.com" }).ok, true);
  assert.equal(validatePageSectionInput({ pageKey: "home", sectionKey: "hero", mediaUrl: "mailto:x@example.com" }).ok, false);
  assert.equal(validatePageSectionInput({ pageKey: "home", sectionKey: "hero", mediaUrl: "/\\\\evil.example/x" }).ok, false);
});

test("rejects unknown sections and malformed structured content", () => {
  assert.deepEqual(validatePageSectionInput({ pageKey: "home", sectionKey: "unknown" }), {
    ok: false,
    error: "Unknown page section",
  });
  assert.equal(validatePageSectionInput({ pageKey: "home", sectionKey: "hero", dataJson: "[]" }).ok, false);
  assert.equal(validatePageSectionInput({ pageKey: "home", sectionKey: "hero", dataJson: "not-json" }).ok, false);
  assert.equal(validatePageSectionInput({ pageKey: "home", sectionKey: "hero", dataJson: '{"slides":[]}' }).ok, true);
  assert.equal(validatePageSectionInput({ pageKey: "home", sectionKey: "hero", dataJson: '{"slides":[{"image":"javascript:alert(1)"}]}' }).ok, false);
  assert.equal(validatePageSectionInput({
    pageKey: "home",
    sectionKey: "hero",
    dataJson: JSON.stringify({ slides: [{
      image: "/company/hero.webp",
      alt: "Company hero",
      kicker: "Company",
      title: "Built for sourcing",
      copy: "A complete and safe slide payload.",
      imageMode: "cover",
    }] }),
  }).ok, true);
  for (const [pageKey, sectionKey, dataJson] of [
    ["home", "hero", '{"slides":"not-an-array"}'],
    ["home", "proof", '{"stats":{}}'],
    ["home", "categories", '{"cards":["bad"]}'],
    ["customization", "process", '{"steps":[{"number":1,"title":"Bad","copy":"Bad"}]}'],
    ["product-detail", "editorial", '{"groups":[{"id":"x","panels":"bad"}]}'],
  ]) {
    assert.equal(validatePageSectionInput({ pageKey, sectionKey, dataJson }).ok, false, `${pageKey}.${sectionKey}`);
  }
});

test("normalizes ordering only for a complete section list on one page", () => {
  const order = normalizePageOrder("returns", ["refunds", "hero", "commitment", "window", "exchanges", "exclusions"]);
  assert.deepEqual(order, [
    { sectionKey: "refunds", sortOrder: 0 },
    { sectionKey: "hero", sortOrder: 10 },
    { sectionKey: "commitment", sortOrder: 20 },
    { sectionKey: "window", sortOrder: 30 },
    { sectionKey: "exchanges", sortOrder: 40 },
    { sectionKey: "exclusions", sortOrder: 50 },
  ]);
  assert.throws(() => normalizePageOrder("returns", ["hero", "hero"]), /complete unique section list/);
  assert.throws(() => normalizePageOrder("returns", ["hero", "about"]), /complete unique section list/);
});

test("settings and sections routes enforce auth and persist validated writes", async () => {
  for (const target of ["settings", "sections?pageKey=home"]) {
    assert.equal((await fetch(`${baseUrl}/api/admin/${target}`)).status, 401);
  }
  assert.equal((await fetch(`${baseUrl}/api/admin/settings`, { method: "PUT", body: "not-json" })).status, 401);
  assert.equal((await fetch(`${baseUrl}/api/admin/sections`, { method: "POST", body: "not-json" })).status, 401);

  const request = (pathname, init = {}) => fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: { ...init.headers, cookie: adminCookie },
  });
  assert.equal((await request("/api/admin/settings")).status, 200);
  assert.equal((await request("/api/admin/sections?pageKey=home")).status, 200);
  assert.equal((await request("/api/admin/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: "not-json" })).status, 400);

  const unknownSettingCount = await prisma.siteSetting.count();
  const unknownSetting = await request("/api/admin/settings", {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: "site.unknown", value: "x" }),
  });
  assert.equal(unknownSetting.status, 400);
  assert.equal(await prisma.siteSetting.count(), unknownSettingCount);

  const settingWrite = await request("/api/admin/settings", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: "site.name", value: "API Muxcor" }),
  });
  assert.equal(settingWrite.status, 200);
  assert.equal((await prisma.siteSetting.findUnique({ where: { key: "site.name" } })).value, "API Muxcor");

  const unknownSectionCount = await prisma.pageSection.count();
  const unknownSection = await request("/api/admin/sections", {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ pageKey: "home", sectionKey: "unknown", title: "x" }),
  });
  assert.equal(unknownSection.status, 400);
  assert.equal(await prisma.pageSection.count(), unknownSectionCount);

  const sectionWrite = await request("/api/admin/sections", {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ pageKey: "returns", sectionKey: "hero", title: "API Return Policy", enabled: false, dataJson: "{}" }),
  });
  assert.equal(sectionWrite.status, 200);
  const savedSection = await prisma.pageSection.findUnique({ where: { pageKey_sectionKey: { pageKey: "returns", sectionKey: "hero" } } });
  assert.equal(savedSection.title, "API Return Policy");
  assert.equal(savedSection.enabled, false);

  const returnsOrder = ["refunds", "hero", "commitment", "window", "exchanges", "exclusions"];
  assert.equal((await request("/api/admin/sections", {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "reorder", pageKey: "returns", sectionKeys: returnsOrder }),
  })).status, 200);
  const ordered = await prisma.pageSection.findMany({ where: { pageKey: "returns" }, orderBy: { sortOrder: "asc" } });
  assert.deepEqual(ordered.map((section) => section.sectionKey), returnsOrder);
  const orderedResponse = await request("/api/admin/sections?pageKey=returns");
  assert.deepEqual((await orderedResponse.json()).sections.map((section) => section.sectionKey), returnsOrder);
  assert.equal((await prisma.pageSection.findUnique({ where: { pageKey_sectionKey: { pageKey: "home", sectionKey: "hero" } } })).sortOrder, 0);

  const dataBefore = (await prisma.pageSection.findUnique({ where: { pageKey_sectionKey: { pageKey: "home", sectionKey: "hero" } } })).dataJson;
  assert.equal((await request("/api/admin/sections", {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ pageKey: "home", sectionKey: "hero", title: "Title only update" }),
  })).status, 200);
  assert.equal((await prisma.pageSection.findUnique({ where: { pageKey_sectionKey: { pageKey: "home", sectionKey: "hero" } } })).dataJson, dataBefore);
});

test("settings and sections APIs merge missing and empty rows with CMS defaults", async () => {
  const request = (pathname) => fetch(`${baseUrl}${pathname}`, { headers: { cookie: adminCookie } });
  await prisma.siteSetting.delete({ where: { key: "site.name" } });
  await prisma.siteSetting.update({ where: { key: "site.logo" }, data: { value: "" } });
  const settingsResponse = await request("/api/admin/settings");
  assert.equal(settingsResponse.status, 200);
  const settings = (await settingsResponse.json()).settings;
  assert.equal(settings.find((setting) => setting.key === "site.name").value, "Muxcor");
  assert.equal(settings.find((setting) => setting.key === "site.name").id, null);
  assert.equal(settings.find((setting) => setting.key === "site.logo").value, "/company/muxcor-logo.png");

  await prisma.pageSection.delete({ where: { pageKey_sectionKey: { pageKey: "home", sectionKey: "proof" } } });
  await prisma.pageSection.update({
    where: { pageKey_sectionKey: { pageKey: "home", sectionKey: "hero" } },
    data: { title: "", mediaUrl: "", dataJson: "{}" },
  });
  const sectionsResponse = await request("/api/admin/sections?pageKey=home");
  assert.equal(sectionsResponse.status, 200);
  const sections = (await sectionsResponse.json()).sections;
  const hero = sections.find((section) => section.sectionKey === "hero");
  const proof = sections.find((section) => section.sectionKey === "proof");
  assert.equal(hero.title, "Jewelry categories, sourced with clarity.");
  assert.equal(hero.mediaUrl, "/products/ruby-oval-pendant-necklace.png");
  assert.ok(JSON.parse(hero.dataJson).slides.length > 0);
  assert.equal(proof.id, null);
  assert.ok(JSON.parse(proof.dataJson).stats.length > 0);
});

test("admin JSON routes reject malformed bodies with a consistent error payload", async () => {
  const authenticatedRoutes = [
    ["/api/admin/products", "POST"],
    ["/api/admin/categories", "POST"],
    ["/api/admin/posts", "POST"],
    ["/api/admin/media", "PUT"],
    ["/api/admin/change-password", "POST"],
    ["/api/admin/settings", "PUT"],
    ["/api/admin/sections", "PUT"],
  ];
  for (const [pathname, method] of authenticatedRoutes) {
    const response = await fetch(`${baseUrl}${pathname}`, {
      method,
      headers: { "content-type": "application/json", cookie: adminCookie },
      body: "not-json",
    });
    assert.equal(response.status, 400, pathname);
    assert.deepEqual(await response.json(), { error: "Invalid JSON body" }, pathname);
  }

  const login = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "not-json",
  });
  assert.equal(login.status, 400);
  assert.deepEqual(await login.json(), { error: "Invalid JSON body" });
});

test("media updates accept media URLs only and are atomic", async () => {
  await prisma.siteMedia.createMany({
    data: [
      { key: "api.hero", url: "/original-hero.webp", label: "Hero" },
      { key: "api.logo", url: "/original-logo.webp", label: "Logo" },
    ],
  });
  const request = (items) => fetch(`${baseUrl}/api/admin/media`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ items }),
  });

  for (const url of ["mailto:sales@example.com", "tel:+123456"]) {
    const response = await request([{ key: "api.hero", url }]);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid media item" });
  }

  const partialAttempt = await request([
    { key: "api.hero", url: "/changed.webp" },
    { key: "api.missing", url: "/missing.webp" },
  ]);
  assert.equal(partialAttempt.status, 404);
  assert.deepEqual(await partialAttempt.json(), { error: "Media record not found" });
  assert.equal((await prisma.siteMedia.findUnique({ where: { key: "api.hero" } })).url, "/original-hero.webp");

  const success = await request([
    { key: "api.hero", url: "/changed.webp" },
    { key: "api.logo", url: "https://cdn.example.com/logo.webp" },
  ]);
  assert.equal(success.status, 200);
  assert.deepEqual(
    (await prisma.siteMedia.findMany({ where: { key: { in: ["api.hero", "api.logo"] } }, orderBy: { key: "asc" } })).map(({ key, url }) => ({ key, url })),
    [
      { key: "api.hero", url: "/changed.webp" },
      { key: "api.logo", url: "https://cdn.example.com/logo.webp" },
    ],
  );
});

test("admin CRUD routes map unique conflicts and missing records", async () => {
  const headers = { "content-type": "application/json", cookie: adminCookie };
  const category = await prisma.category.create({ data: { name: "API Rings", slug: "api-rings" } });
  const product = await prisma.product.create({ data: { name: "API Ring", slug: "api-ring" } });
  const post = await prisma.post.create({ data: { title: "API Post", slug: "api-post" } });

  const conflicts = [
    ["/api/admin/categories", { name: "Duplicate", slug: category.slug }],
    ["/api/admin/products", { name: "Duplicate", slug: product.slug }],
    ["/api/admin/posts", { title: "Duplicate", slug: post.slug }],
  ];
  for (const [pathname, body] of conflicts) {
    const response = await fetch(`${baseUrl}${pathname}`, { method: "POST", headers, body: JSON.stringify(body) });
    assert.equal(response.status, 409, pathname);
    assert.deepEqual(await response.json(), { error: "A record with that unique value already exists" }, pathname);
  }

  const missingWrites = [
    ["/api/admin/categories/999999", "PUT", { name: "Missing", slug: "missing-category" }],
    ["/api/admin/products/999999", "DELETE"],
    ["/api/admin/posts/999999", "PUT", { title: "Missing", slug: "missing-post" }],
  ];
  for (const [pathname, method, body] of missingWrites) {
    const response = await fetch(`${baseUrl}${pathname}`, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    assert.equal(response.status, 404, pathname);
    assert.deepEqual(await response.json(), { error: "Record not found" }, pathname);
  }
});

test("catalog write routes reject malformed nested data and unsafe media URLs", async () => {
  const headers = { "content-type": "application/json", cookie: adminCookie };
  const post = (pathname, body, method = "POST") => fetch(`${baseUrl}${pathname}`, {
    method, headers, body: JSON.stringify(body),
  });
  const invalidProducts = [
    { name: "Bad categories", slug: "bad-categories", categoryIds: "1" },
    { name: "Bad image list", slug: "bad-image-list", images: {} },
    { name: "Bad image", slug: "bad-image", images: [{ src: "javascript:alert(1)" }] },
    { name: "Bad sku list", slug: "bad-sku-list", skus: {} },
    { name: "Bad sku image", slug: "bad-sku-image", skus: [{ name: "SKU", images: ["mailto:x@example.com"] }] },
    { name: "Bad PDF", slug: "bad-pdf", specsPdf: "tel:+123" },
  ];
  for (const body of invalidProducts) {
    const response = await post("/api/admin/products", body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.ok(typeof (await response.json()).error === "string");
  }

  for (const body of [
    { name: "Bad category", slug: "bad-category", imageUrl: "mailto:x@example.com" },
    { title: "Bad post", slug: "bad-post", featuredImage: "javascript:alert(1)" },
  ]) {
    const pathname = "title" in body ? "/api/admin/posts" : "/api/admin/categories";
    const response = await post(pathname, body);
    assert.equal(response.status, 400);
    assert.ok(typeof (await response.json()).error === "string");
  }

  const updateProduct = await prisma.product.create({ data: { name: "Validation target", slug: "validation-target" } });
  const updateResponse = await post(`/api/admin/products/${updateProduct.id}`, {
    name: "Validation target", slug: "validation-target", images: [{ nope: true }], categoryIds: [], skus: [],
  }, "PUT");
  assert.equal(updateResponse.status, 400);
});

test("catalog write routes reject invalid writable scalar fields", async () => {
  const headers = { "content-type": "application/json", cookie: adminCookie };
  const request = (pathname, body, method = "POST") => fetch(`${baseUrl}${pathname}`, { method, headers, body: JSON.stringify(body) });
  for (const body of [
    { name: "Bad featured", slug: "bad-featured", featured: "false" },
    { name: "Bad description", slug: "bad-description", description: {} },
    { name: "Bad price", slug: "bad-price", price: "12.00" },
    { name: "Bad order", slug: "bad-order", sortOrder: 1.5 },
  ]) assert.equal((await request("/api/admin/products", body)).status, 400);
  assert.equal((await request("/api/admin/categories", { name: "Bad category order", slug: "bad-category-order", sortOrder: "1" })).status, 400);
  assert.equal((await request("/api/admin/posts", { title: "Bad date", slug: "bad-date", date: "not-a-date" })).status, 400);
  assert.equal((await request("/api/admin/posts", { title: "Bad content", slug: "bad-content", content: {} })).status, 400);
});

test("savePage validates every section before an atomic page update", async () => {
  const original = await prisma.pageSection.findUnique({ where: { pageKey_sectionKey: { pageKey: "returns", sectionKey: "hero" } } });
  const response = await fetch(`${baseUrl}/api/admin/sections`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({
      action: "savePage",
      pageKey: "returns",
      sections: [
        { pageKey: "returns", sectionKey: "hero", title: "Should not persist", dataJson: "{}", enabled: true },
        { pageKey: "returns", sectionKey: "commitment", dataJson: "{}", enabled: true },
        { pageKey: "returns", sectionKey: "window", dataJson: "{}", enabled: true },
        { pageKey: "returns", sectionKey: "exchanges", dataJson: "{}", enabled: true },
        { pageKey: "returns", sectionKey: "exclusions", dataJson: "{}", enabled: true },
        { pageKey: "returns", sectionKey: "refunds", dataJson: '{"bad":true}', enabled: true },
      ],
    }),
  });
  assert.equal(response.status, 400);
  assert.equal((await prisma.pageSection.findUnique({ where: { pageKey_sectionKey: { pageKey: "returns", sectionKey: "hero" } } })).title, original.title);

  const success = await fetch(`${baseUrl}/api/admin/sections`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({
      action: "savePage",
      pageKey: "returns",
      sections: ["refunds", "hero", "commitment", "window", "exchanges", "exclusions"].map((sectionKey, index) => ({
        pageKey: "returns", sectionKey, title: sectionKey === "hero" ? "Atomic page title" : "", dataJson: "{}", enabled: true, sortOrder: index * 10,
      })),
    }),
  });
  assert.equal(success.status, 200);
  const saved = await prisma.pageSection.findMany({ where: { pageKey: "returns" }, orderBy: { sortOrder: "asc" } });
  assert.deepEqual(saved.map((section) => section.sectionKey), ["refunds", "hero", "commitment", "window", "exchanges", "exclusions"]);
  assert.equal(saved.find((section) => section.sectionKey === "hero").title, "Atomic page title");
});

test("savePage rejects mixed page keys without partial updates", async () => {
  const original = await prisma.pageSection.findUnique({ where: { pageKey_sectionKey: { pageKey: "privacy", sectionKey: "hero" } } });
  const sectionKeys = ["hero", "commitment", "information", "usage", "protection", "choices"];
  const sections = sectionKeys.map((sectionKey, index) => ({
    pageKey: "privacy", sectionKey, title: sectionKey === "hero" ? "Must not persist" : "", dataJson: "{}", enabled: true, sortOrder: index * 10,
  }));
  sections[3].pageKey = "returns";
  const response = await fetch(`${baseUrl}/api/admin/sections`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ action: "savePage", pageKey: "privacy", sections }),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Section page does not match pageKey" });
  assert.equal((await prisma.pageSection.findUnique({ where: { pageKey_sectionKey: { pageKey: "privacy", sectionKey: "hero" } } })).title, original.title);
});

test("upload route rejects unsafe identifiers and MIME-extension mismatches", async () => {
  const upload = (headers, body = Buffer.from("abc")) => fetch(`${baseUrl}/api/admin/upload`, {
    method: "POST",
    headers: {
      "content-type": "application/octet-stream",
      "x-filename": "image.png",
      "x-mime-type": "image/png",
      "x-file-size": String(body.length),
      "x-chunk-index": "0",
      "x-chunk-total": "1",
      "x-chunk-offset": "0",
      cookie: adminCookie,
      ...headers,
    },
    body,
  });

  for (const uploadId of ["../escape-id", "bad\\escape-id"]) {
    const response = await upload({ "x-upload-id": uploadId });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid upload id" });
  }

  const mismatch = await upload({ "x-upload-id": "valid-upload-id", "x-filename": "image.jpg" });
  assert.equal(mismatch.status, 400);
  assert.deepEqual(await mismatch.json(), { error: "Upload extension does not match its type" });
  assert.deepEqual(readdirSync(uploadDirectory), []);

  const svgStream = await upload({ "x-upload-id": "valid-svg-upload", "x-filename": "vector.svg", "x-mime-type": "image/svg+xml" });
  assert.equal(svgStream.status, 400);
  const form = new FormData();
  form.set("file", new File(["<svg></svg>"], "vector.svg", { type: "image/svg+xml" }));
  const svgMultipart = await fetch(`${baseUrl}/api/admin/upload`, { method: "POST", headers: { cookie: adminCookie }, body: form });
  assert.equal(svgMultipart.status, 400);
});

test("chunk uploads enforce offsets, declared size, limits, and clean failed files", async () => {
  const upload = (headers, body = Buffer.from("abc")) => {
    const requestHeaders = {
      "content-type": "application/octet-stream",
      "x-filename": "image.png",
      "x-mime-type": "image/png",
      "x-file-size": "6",
      "x-upload-id": "chunk-test-id",
      "x-chunk-index": "0",
      "x-chunk-total": "2",
      "x-chunk-offset": "0",
      cookie: adminCookie,
      ...headers,
    };
    for (const [key, value] of Object.entries(requestHeaders)) {
      if (value === undefined) delete requestHeaders[key];
    }
    return fetch(`${baseUrl}/api/admin/upload`, {
    method: "POST",
    headers: requestHeaders,
    body,
  });
  };

  const outOfOrder = await upload({ "x-upload-id": "order-test-id", "x-chunk-index": "1", "x-chunk-offset": "3" });
  assert.equal(outOfOrder.status, 409);
  assert.deepEqual(await outOfOrder.json(), { error: "Unexpected chunk order" });

  const firstChunk = await upload({});
  assert.equal(firstChunk.status, 200);
  const firstChunkToken = (await firstChunk.json()).uploadToken;
  assert.ok(firstChunkToken);
  const wrongOffset = await upload({ "x-upload-token": firstChunkToken, "x-chunk-index": "1", "x-chunk-offset": "2" });
  assert.equal(wrongOffset.status, 409);
  assert.deepEqual(await wrongOffset.json(), { error: "Unexpected chunk order" });
  assert.deepEqual(readdirSync(uploadDirectory), []);

  const mimeFirst = await upload({ "x-upload-id": "mime-switch-id" });
  assert.equal(mimeFirst.status, 200);
  const mimeToken = (await mimeFirst.json()).uploadToken;
  assert.ok(mimeToken);
  const switchedMime = await upload({
    "x-upload-id": "mime-switch-id",
    "x-upload-token": mimeToken,
    "x-filename": "image.jpg",
    "x-mime-type": "image/jpeg",
    "x-chunk-index": "1",
    "x-chunk-offset": "3",
  });
  assert.equal(switchedMime.status, 409);
  assert.deepEqual(await switchedMime.json(), { error: "Unexpected chunk order" });
  assert.deepEqual(readdirSync(uploadDirectory), []);

  const protectedFirst = await upload({ "x-upload-id": "protected-upload-id" });
  const protectedToken = (await protectedFirst.json()).uploadToken;
  const guessedId = await upload({
    "x-upload-id": "protected-upload-id",
    "x-upload-token": "wrong-token",
    "x-chunk-index": "1",
    "x-chunk-offset": "2",
  });
  assert.equal(guessedId.status, 409);
  assert.deepEqual(readdirSync(uploadDirectory).sort(), ["temp-protected-upload-id.json", "temp-protected-upload-id.part"]);
  const guessedOversize = await upload({
    "x-upload-id": "protected-upload-id",
    "x-upload-token": "wrong-token",
    "x-chunk-index": "1",
    "x-chunk-offset": "5",
  });
  assert.equal(guessedOversize.status, 409);
  assert.deepEqual(readdirSync(uploadDirectory).sort(), ["temp-protected-upload-id.json", "temp-protected-upload-id.part"]);
  const duplicateFirst = await upload({ "x-upload-id": "protected-upload-id" });
  assert.equal(duplicateFirst.status, 409);
  assert.deepEqual(readdirSync(uploadDirectory).sort(), ["temp-protected-upload-id.json", "temp-protected-upload-id.part"]);
  const missingChunkHeader = await upload({
    "x-upload-id": "protected-upload-id",
    "x-upload-token": protectedToken,
    "x-chunk-index": "1",
    "x-chunk-offset": undefined,
  });
  assert.equal(missingChunkHeader.status, 400);
  assert.deepEqual(readdirSync(uploadDirectory), []);

  const incomplete = await upload({
    "x-upload-id": "size-test-id",
    "x-file-size": "4",
    "x-chunk-total": "1",
  });
  assert.equal(incomplete.status, 400);
  assert.deepEqual(await incomplete.json(), { error: "Incomplete upload" });
  assert.deepEqual(readdirSync(uploadDirectory), []);

  const tooLarge = await upload({
    "x-upload-id": "large-test-id",
    "x-file-size": String(20 * 1024 * 1024 + 1),
  });
  assert.equal(tooLarge.status, 400);
  assert.deepEqual(await tooLarge.json(), { error: "Invalid upload size" });
  assert.deepEqual(readdirSync(uploadDirectory), []);
});

test("admin auth rejects customer-role cookies and enforces the password policy", async () => {
  const customerToken = await new SignJWT({ id: 1, username: adminUsername, role: "customer" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(sessionSecret));
  assert.equal((await fetch(`${baseUrl}/api/admin/settings`, { headers: { cookie: `myklens_admin=${customerToken}` } })).status, 401);
  assert.ok((await prisma.adminUser.findUnique({ where: { username: adminUsername } })).id > 0);

  const oldCookie = adminCookie;
  const request = (body) => fetch(`${baseUrl}/api/admin/change-password`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify(body),
  });
  assert.equal((await request({ currentPassword: adminPassword, newPassword: "ShortPass1" })).status, 400);
  const newPassword = "new-api-password-456";
  assert.equal((await request({ currentPassword: adminPassword, newPassword })).status, 200);
  assert.equal((await fetch(`${baseUrl}/api/admin/settings`, { headers: { cookie: oldCookie } })).status, 401);
  assert.equal((await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: adminUsername, password: adminPassword }),
  })).status, 401);
  assert.equal((await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "wrong-admin", password: newPassword }),
  })).status, 401);
  const newLogin = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: adminUsername, password: newPassword }),
  });
  assert.equal(newLogin.status, 200);
  const newCookie = newLogin.headers.get("set-cookie")?.split(";", 1)[0];
  assert.equal((await fetch(`${baseUrl}/api/admin/settings`, { headers: { cookie: newCookie } })).status, 200);
  adminCookie = newCookie;
});

test("all admin CMS routes fail closed when a second administrator exists", async () => {
  const second = await prisma.adminUser.create({ data: { username: "second-admin", passwordHash: "not-used" } });
  try {
    for (const target of ["settings", "sections?pageKey=home"]) {
      const response = await fetch(`${baseUrl}/api/admin/${target}`, { headers: { cookie: adminCookie } });
      assert.equal(response.status, 500);
    }
  } finally {
    await prisma.adminUser.delete({ where: { id: second.id } });
  }
});
