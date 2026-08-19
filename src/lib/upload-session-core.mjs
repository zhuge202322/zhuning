import { randomBytes } from "node:crypto";
import { closeSync, mkdirSync, openSync, readdirSync, rmdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

let lastCleanupAt = 0;
export const MIN_UPLOAD_SESSION_TTL_MS = 10 * 60 * 1000;
const CLEANUP_MARKER = "__cleanup__";

function ownerPath(lockPath, owner) {
  return path.join(lockPath, owner);
}

function removeEmptyLockDirectory(lockPath) {
  try {
    rmdirSync(lockPath);
    return true;
  } catch {
    return false;
  }
}

export function acquireUploadLock(lockPath) {
  const owner = randomBytes(16).toString("hex");
  try {
    mkdirSync(lockPath);
  } catch (error) {
    if (error?.code === "EEXIST") return null;
    throw error;
  }

  try {
    writeFileSync(ownerPath(lockPath, owner), "", { flag: "wx" });
    return { path: lockPath, owner };
  } catch (error) {
    removeEmptyLockDirectory(lockPath);
    throw error;
  }
}

export function releaseUploadLock(lock) {
  if (!lock) return;
  try {
    rmSync(ownerPath(lock.path, lock.owner));
  } catch {
    return;
  }
  // This succeeds only while no replacement owner or cleanup claim exists.
  removeEmptyLockDirectory(lock.path);
}

function existingMtimes(paths) {
  return paths.flatMap((file) => {
    try { return [statSync(file).mtimeMs]; } catch { return []; }
  });
}

function claimExpiredSession(lockPath, dataPaths, now, ttlMs) {
  const mtimes = existingMtimes([lockPath, ...dataPaths]);
  if (mtimes.length === 0 || mtimes.some((mtime) => now - mtime <= ttlMs)) return null;

  const markerPath = path.join(lockPath, CLEANUP_MARKER);
  let fd;
  try {
    fd = openSync(markerPath, "wx");
    closeSync(fd);
  } catch (error) {
    if (fd !== undefined) try { closeSync(fd); } catch {}
    if (["EEXIST", "ENOENT", "ENOTDIR"].includes(error?.code)) return null;
    throw error;
  }

  // Recheck after claiming. The directory remains present, so no new owner can enter.
  const currentMtimes = existingMtimes(dataPaths);
  if (currentMtimes.some((mtime) => now - mtime <= ttlMs)) {
    try { rmSync(markerPath); } catch {}
    return null;
  }
  return markerPath;
}

export function cleanupExpiredUploadSessions(directory, options = {}) {
  const now = options.now ?? Date.now();
  const ttlMs = Math.max(options.ttlMs ?? 24 * 60 * 60 * 1000, MIN_UPLOAD_SESSION_TTL_MS);
  const scanIntervalMs = Math.max(options.scanIntervalMs ?? 5 * 60 * 1000, 0);
  if (!options.force && now - lastCleanupAt < scanIntervalMs) return 0;
  lastCleanupAt = now;

  const sessions = new Set();
  for (const name of readdirSync(directory)) {
    const match = /^temp-([A-Za-z0-9_-]{8,80})\.(?:part|json|lock)$/.exec(name);
    if (match) sessions.add(match[1]);
  }

  let removed = 0;
  for (const sessionId of sessions) {
    const partPath = path.join(directory, `temp-${sessionId}.part`);
    const statePath = path.join(directory, `temp-${sessionId}.json`);
    const lockPath = path.join(directory, `temp-${sessionId}.lock`);
    const dataPaths = [partPath, statePath];

    let markerPath = claimExpiredSession(lockPath, dataPaths, now, ttlMs);
    if (!markerPath) {
      const lock = acquireUploadLock(lockPath);
      if (!lock) continue;
      markerPath = ownerPath(lock.path, lock.owner);
    }

    try {
      const mtimes = existingMtimes(dataPaths);
      if (mtimes.length > 0 && mtimes.every((mtime) => now - mtime > ttlMs)) {
        for (const file of dataPaths) {
          try {
            rmSync(file);
            removed += 1;
          } catch {}
        }
      }
    } finally {
      try { rmSync(markerPath); } catch {}
      try {
        for (const entry of readdirSync(lockPath, { withFileTypes: true })) {
          if (entry.isFile()) try { rmSync(path.join(lockPath, entry.name)); } catch {}
        }
      } catch {}
      removeEmptyLockDirectory(lockPath);
    }
  }
  return removed;
}
