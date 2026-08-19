import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test, { after, before } from "node:test";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const seedScript = path.join(root, "scripts", "seed-cms.mjs");
const tmpRoot = path.join(root, "tests", "api", ".tmp");
mkdirSync(tmpRoot, { recursive: true });
const tmp = mkdtempSync(path.join(tmpRoot, "customer-auth-"));
const databasePath = path.join(tmp, "auth.db");
const databaseUrl = `file:${databasePath.replaceAll("\\", "/")}`;
let server;
let baseUrl;
let prisma;
let adminCookie;
let customerCookie;

async function port() {
  return new Promise((resolve, reject) => {
    const socket = createServer();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const address = socket.address();
      socket.close(() => resolve(address.port));
    });
  });
}

async function waitForServer() {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Next server exited with ${server.exitCode}`);
    try { if ((await fetch(`${baseUrl}/admin/login`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Timed out waiting for Next server");
}

async function json(pathname, body, cookie) {
  return fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

before(async () => {
  new DatabaseSync(databasePath).close();
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    ADMIN_USERNAME: "task5-admin",
    ADMIN_PASSWORD: "task5-admin-password-123",
    ADMIN_JWT_SECRET: "task5-admin-secret-2026",
    CUSTOMER_JWT_SECRET: "task5-customer-secret-2026",
  };
  execFileSync(process.execPath, [prismaCli, "db", "push", "--skip-generate", "--schema", path.join(root, "prisma", "schema.prisma")], { cwd: root, env, stdio: "pipe" });
  execFileSync(process.execPath, [seedScript], { cwd: root, env, stdio: "pipe" });
  baseUrl = `http://127.0.0.1:${await port()}`;
  server = spawn(process.execPath, [nextCli, "dev", "-p", baseUrl.split(":").at(-1)], { cwd: root, env, stdio: "pipe", windowsHide: true });
  await waitForServer();
  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const adminLogin = await json("/api/admin/login", { username: "task5-admin", password: "task5-admin-password-123" });
  adminCookie = adminLogin.headers.get("set-cookie")?.split(";", 1)[0];
});

after(async () => {
  await prisma?.$disconnect();
  if (server && server.exitCode === null) {
    server.kill();
    await new Promise((resolve) => server.once("exit", resolve));
  }
  rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

test("registers a normalized customer and never exposes the password hash", async () => {
  assert.equal((await json("/api/account/register", { name: "Short", email: "short@example.com", password: "123" })).status, 400);
  const response = await json("/api/account/register", {
    name: "Ada Client",
    email: "  ADA@Example.COM ",
    password: "strong-pass-123",
    marketingOptIn: true,
  });
  const body = await response.json();
  assert.equal(response.status, 201, JSON.stringify(body));
  assert.equal(body.customer.email, "ada@example.com");
  assert.equal("passwordHash" in body.customer, false);
  customerCookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(customerCookie?.startsWith("muxcor_customer="));
  assert.ok(adminCookie?.startsWith("myklens_admin="));
});

test("does not let registration claim a legacy inquiry customer", async () => {
  const legacy = await prisma.customer.create({
    data: {
      name: "Legacy Inquiry",
      email: "legacy@example.com",
      phone: "+1 555 0111",
      status: "INQUIRY",
      notes: "Internal account history",
    },
  });
  const response = await json("/api/account/register", {
    name: "Account Claim",
    email: "LEGACY@example.com",
    password: "strong-pass-456",
    phone: "+1 555 0999",
  });
  const body = await response.json();
  assert.equal(response.status, 409, JSON.stringify(body));
  assert.match(body.error, /contact support/i);
  const stored = await prisma.customer.findUnique({ where: { id: legacy.id } });
  assert.equal(stored.passwordHash, null);
  assert.equal(stored.name, "Legacy Inquiry");
  assert.equal(stored.phone, "+1 555 0111");
  assert.equal(stored.notes, "Internal account history");
});

test("customer and administrator cookies cannot cross authentication boundaries", async () => {
  assert.equal((await fetch(`${baseUrl}/api/account/session`, { headers: { cookie: adminCookie } })).status, 401);
  assert.equal((await fetch(`${baseUrl}/api/admin/customers`, { headers: { cookie: customerCookie } })).status, 401);
  const session = await fetch(`${baseUrl}/api/account/session`, { headers: { cookie: customerCookie } });
  assert.equal(session.status, 200);
  assert.equal((await session.json()).customer.email, "ada@example.com");
});

test("rejects disabled customers and invalidates sessions through authVersion", async () => {
  const customer = await prisma.customer.findUnique({ where: { email: "ada@example.com" } });
  await prisma.customer.update({ where: { id: customer.id }, data: { status: "DISABLED", disabledAt: new Date(), authVersion: { increment: 1 } } });
  assert.equal((await json("/api/account/login", { email: "ada@example.com", password: "strong-pass-123" })).status, 403);
  assert.equal((await fetch(`${baseUrl}/api/account/session`, { headers: { cookie: customerCookie } })).status, 401);
});

test("login updates lastLoginAt and logout clears only the customer cookie", async () => {
  await prisma.customer.update({ where: { email: "ada@example.com" }, data: { status: "ACTIVE", disabledAt: null } });
  const login = await json("/api/account/login", { email: "ADA@example.com", password: "strong-pass-123" });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok((await prisma.customer.findUnique({ where: { email: "ada@example.com" } })).lastLoginAt);
  const logout = await fetch(`${baseUrl}/api/account/logout`, { method: "POST", headers: { cookie: `${cookie}; ${adminCookie}` } });
  const setCookie = logout.headers.get("set-cookie") || "";
  assert.match(setCookie, /muxcor_customer=/);
  assert.doesNotMatch(setCookie, /myklens_admin=/);
});

test("returns 400 for malformed JSON instead of a framework error", async () => {
  const response = await fetch(`${baseUrl}/api/account/login`, { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid JSON body" });
});
