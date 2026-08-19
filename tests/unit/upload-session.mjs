import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  acquireUploadLock,
  cleanupExpiredUploadSessions,
  releaseUploadLock,
} from "../../src/lib/upload-session-core.mjs";

test("upload lock directory creation is atomic", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "upload-lock-"));
  try {
    const lockPath = path.join(directory, "temp-session.lock");
    const first = acquireUploadLock(lockPath);
    assert.ok(first);
    assert.deepEqual(readdirSync(lockPath), [first.owner]);
    assert.equal(acquireUploadLock(lockPath), null);
    releaseUploadLock(first);
    const next = acquireUploadLock(lockPath);
    assert.ok(next);
    releaseUploadLock(next);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("an old lock handle cannot remove a replacement owner directory", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "upload-owner-"));
  try {
    const lockPath = path.join(directory, "temp-session.lock");
    const first = acquireUploadLock(lockPath);
    assert.ok(first);
    rmSync(lockPath, { recursive: true });
    const replacement = acquireUploadLock(lockPath);
    assert.ok(replacement);

    releaseUploadLock(first);
    assert.deepEqual(readdirSync(lockPath), [replacement.owner]);
    releaseUploadLock(replacement);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("expired upload sessions are removed while fresh sessions remain", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "upload-expiry-"));
  try {
    const oldLock = path.join(directory, "temp-old-session.lock");
    mkdirSync(oldLock);
    writeFileSync(path.join(oldLock, "old-owner"), "");
    for (const suffix of ["part", "json"]) writeFileSync(path.join(directory, `temp-old-session.${suffix}`), "x");
    for (const suffix of ["part", "json"]) writeFileSync(path.join(directory, `temp-fresh-session.${suffix}`), "x");
    const old = new Date(Date.now() - 700_000);
    for (const target of [oldLock, path.join(oldLock, "old-owner"), ...["part", "json"].map((suffix) => path.join(directory, `temp-old-session.${suffix}`))]) {
      utimesSync(target, old, old);
    }
    cleanupExpiredUploadSessions(directory, { now: Date.now(), ttlMs: 60_000, force: true });
    assert.deepEqual(readdirSync(directory).sort(), ["temp-fresh-session.json", "temp-fresh-session.part"]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("cleanup preserves a fresh lock owner and its session", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "upload-clean-owner-"));
  try {
    const lockPath = path.join(directory, "temp-owned-session.lock");
    const lock = acquireUploadLock(lockPath);
    const partPath = path.join(directory, "temp-owned-session.part");
    const statePath = path.join(directory, "temp-owned-session.json");
    writeFileSync(partPath, "x");
    writeFileSync(statePath, "{}");
    const old = new Date(Date.now() - 700_000);
    utimesSync(partPath, old, old);
    utimesSync(statePath, old, old);

    cleanupExpiredUploadSessions(directory, { now: Date.now(), ttlMs: 60_000, force: true });
    assert.equal(existsSync(lockPath), true);
    assert.equal(existsSync(partPath), true);
    assert.equal(existsSync(statePath), true);
    releaseUploadLock(lock);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
