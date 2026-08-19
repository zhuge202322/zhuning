import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test, { after, before } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const tmpRoot = path.join(root, "tests", "api", ".tmp");
mkdirSync(tmpRoot, { recursive: true });
const tmp = mkdtempSync(path.join(tmpRoot, "missing-customer-secret-"));
const databasePath = path.join(tmp, "config.db");
const databaseUrl = `file:${databasePath.replaceAll("\\", "/")}`;
let server;
let baseUrl;

async function availablePort() {
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
    try { if ((await fetch(`${baseUrl}/account/login`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Timed out waiting for Next server");
}

before(async () => {
  new DatabaseSync(databasePath).close();
  const env = { ...process.env, DATABASE_URL: databaseUrl, ADMIN_JWT_SECRET: "admin-secret-only", CUSTOMER_JWT_SECRET: "" };
  execFileSync(process.execPath, [prismaCli, "db", "push", "--skip-generate", "--schema", path.join(root, "prisma", "schema.prisma")], { cwd: root, env, stdio: "pipe" });
  const port = await availablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [nextCli, "dev", "-p", String(port)], { cwd: root, env, stdio: "pipe", windowsHide: true });
  await waitForServer();
});

after(async () => {
  if (server && server.exitCode === null) { server.kill(); await new Promise((resolve) => server.once("exit", resolve)); }
  rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

test("customer auth routes return a configuration error without CUSTOMER_JWT_SECRET", async () => {
  const response = await fetch(`${baseUrl}/api/account/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "client@example.com", password: "password-123" }) });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Customer authentication is not configured" });
});

