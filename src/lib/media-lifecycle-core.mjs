import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const STORED_FILENAME_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(?:jpg|png|webp|avif|mp4)";
const TOMBSTONE_PATTERN = new RegExp(`^(?:\\.delete-${UUID_PATTERN}|\\.(?:delete|replace)-asset-\\d+-${UUID_PATTERN}-${STORED_FILENAME_PATTERN})\\.tombstone$`, "i");
const ASSET_TOMBSTONE_PATTERN = new RegExp(`^\\.(delete|replace)-asset-(\\d+)-(${UUID_PATTERN})-(${STORED_FILENAME_PATTERN})\\.tombstone$`, "i");
const cleanupTimes = new Map();

/**
 * @param {string} originalPath
 * @param {(() => string) | { assetId: number, kind?: "delete" | "replace" }} metadataOrRandomUUID
 * @param {() => string} suppliedRandomUUID
 */
export async function stageStoredMediaDeletion(originalPath, metadataOrRandomUUID = crypto.randomUUID, suppliedRandomUUID = crypto.randomUUID) {
  const metadata = typeof metadataOrRandomUUID === "object" && metadataOrRandomUUID !== null ? metadataOrRandomUUID : null;
  const randomUUID = typeof metadataOrRandomUUID === "function" ? metadataOrRandomUUID : suppliedRandomUUID;
  const token = randomUUID();
  const fileName = path.basename(originalPath);
  const kind = metadata?.kind === "replace" ? "replace" : "delete";
  const tombstoneName = metadata
    ? `.${kind}-asset-${metadata.assetId}-${token}-${fileName}.tombstone`
    : `.delete-${token}.tombstone`;
  if (metadata && !TOMBSTONE_PATTERN.test(tombstoneName)) throw new Error("Invalid media tombstone metadata");
  const tombstonePath = path.join(path.dirname(originalPath), tombstoneName);
  await fs.promises.rename(originalPath, tombstonePath);
  return { originalPath, tombstonePath };
}

export function parseAssetTombstoneName(name) {
  const match = ASSET_TOMBSTONE_PATTERN.exec(name);
  return match ? { kind: match[1].toLowerCase(), assetId: Number(match[2]), fileName: match[4] } : null;
}

export async function findAssetTombstones(uploadDir, assetId, fileName, kind = "delete") {
  const root = path.resolve(uploadDir);
  let entries;
  try { entries = await fs.promises.readdir(root, { withFileTypes: true }); } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  return entries.flatMap((entry) => {
    if (!entry.isFile()) return [];
    const parsed = parseAssetTombstoneName(entry.name);
    if (!parsed || parsed.kind !== kind || parsed.assetId !== assetId || parsed.fileName !== fileName) return [];
    const candidate = path.resolve(root, entry.name);
    return path.dirname(candidate) === root ? [candidate] : [];
  });
}

export async function restoreStagedDeletion(staged) {
  try {
    await fs.promises.link(staged.tombstonePath, staged.originalPath);
    await fs.promises.unlink(staged.tombstonePath);
    return true;
  } catch (error) {
    if (error?.code === "EEXIST") return false;
    throw error;
  }
}

export async function finalizeStagedDeletion(staged) {
  await fs.promises.rm(staged.tombstonePath, { force: true });
}

export async function cleanupReplacedMedia(oldUrl, remove, log = console.error) {
  try {
    await remove(oldUrl);
    return {};
  } catch (error) {
    log(`Old media cleanup failed for ${oldUrl}: ${error instanceof Error ? error.message : String(error)}`);
    return { cleanupWarning: "Old media file could not be removed and requires later cleanup." };
  }
}

export async function cleanupReplacedMediaFile(originalPath, assetId, { randomUUID = crypto.randomUUID, finalize = finalizeStagedDeletion, log = console.error } = {}) {
  let staged;
  try {
    staged = await stageStoredMediaDeletion(originalPath, { assetId, kind: "replace" }, randomUUID);
  } catch (error) {
    log(`Old media staging failed for asset ${assetId}: ${error instanceof Error ? error.message : String(error)}`);
    return { cleanupWarning: "Old media file could not be staged and requires later cleanup." };
  }
  try {
    await finalize(staged);
    return {};
  } catch (error) {
    log(`Old media tombstone cleanup failed for asset ${assetId}: ${error instanceof Error ? error.message : String(error)}`);
    return { cleanupWarning: "Old media file could not be removed and requires later cleanup." };
  }
}

export async function cleanupPendingTombstones(uploadDir, { minIntervalMs = 30_000, minAgeMs = 10 * 60_000, now = Date.now } = {}) {
  const root = path.resolve(uploadDir);
  const previous = cleanupTimes.get(root) || 0;
  const current = now();
  if (minIntervalMs > 0 && current - previous < minIntervalMs) return { removed: 0, skipped: true };
  cleanupTimes.set(root, current);
  let entries;
  try { entries = await fs.promises.readdir(root, { withFileTypes: true }); } catch (error) {
    if (error?.code === "ENOENT") return { removed: 0, skipped: false };
    throw error;
  }
  let removed = 0;
  for (const entry of entries) {
    if (!entry.isFile() || !TOMBSTONE_PATTERN.test(entry.name)) continue;
    const candidate = path.resolve(root, entry.name);
    if (path.dirname(candidate) !== root) continue;
    try {
      const stat = await fs.promises.stat(candidate);
      if (minAgeMs > 0 && current - stat.mtimeMs < minAgeMs) continue;
      await fs.promises.unlink(candidate); removed += 1;
    } catch (error) {
      if (error?.code !== "ENOENT") console.error(`Pending tombstone cleanup failed for ${entry.name}:`, error);
    }
  }
  return { removed, skipped: false };
}

export const cleanupStaleTombstones = cleanupPendingTombstones;
