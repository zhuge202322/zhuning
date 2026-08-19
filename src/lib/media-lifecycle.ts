import fs from "node:fs";

import type { Prisma, PrismaClient } from "@prisma/client";
import { cleanupPendingTombstones, finalizeStagedDeletion, findAssetTombstones, restoreStagedDeletion } from "@/lib/media-lifecycle-core.mjs";
import { findMediaReferences } from "@/lib/media-references";
import { configuredUploadDirectory, resolveStoredMediaPath } from "@/lib/media-storage";

type MediaClient = PrismaClient | Prisma.TransactionClient;
const reconciliationTimes = new Map<string, number>();

async function pathExists(filePath: string) {
  try { await fs.promises.access(filePath); return true; } catch { return false; }
}

export async function reconcileDeletingMediaAssets(client: PrismaClient, uploadDir = configuredUploadDirectory()) {
  const assets = await client.mediaAsset.findMany({ where: { status: "DELETING" } });
  let reconciled = 0;
  for (const asset of assets) {
    const originalPath = resolveStoredMediaPath(asset.url, uploadDir);
    const tombstonePaths = await findAssetTombstones(uploadDir, asset.id, asset.fileName, "delete");
    const tombstonePath = tombstonePaths[0] || null;
    const originalExists = await pathExists(originalPath);
    const tombstoneExists = tombstonePath ? await pathExists(tombstonePath) : false;
    await client.$transaction(async (transaction) => {
      const current = await transaction.mediaAsset.findUnique({ where: { id: asset.id } });
      if (!current || current.status !== "DELETING" || current.url !== asset.url) return;
      const references = await findMediaReferences(current.url, transaction);
      if (references.length) {
        if (!originalExists && tombstoneExists && tombstonePath) {
          const restored = await restoreStagedDeletion({ originalPath, tombstonePath });
          if (!restored) throw new Error(`Could not restore referenced media asset ${asset.id}`);
        } else if (!originalExists) {
          console.error(`Referenced deleting media asset ${asset.id} has no recoverable file`);
          return;
        } else if (tombstoneExists && tombstonePath) {
          await finalizeStagedDeletion({ originalPath, tombstonePath });
        }
        await transaction.mediaAsset.updateMany({ where: { id: asset.id, status: "DELETING", url: asset.url }, data: { status: "ACTIVE" } });
        reconciled += 1;
        return;
      }
      if (tombstoneExists && tombstonePath) {
        await transaction.mediaAsset.deleteMany({ where: { id: asset.id, status: "DELETING", url: asset.url } });
        await finalizeStagedDeletion({ originalPath, tombstonePath });
        reconciled += 1;
        return;
      }
      if (originalExists) {
        await transaction.mediaAsset.updateMany({ where: { id: asset.id, status: "DELETING", url: asset.url }, data: { status: "ACTIVE" } });
        reconciled += 1;
        return;
      }
      await transaction.mediaAsset.deleteMany({ where: { id: asset.id, status: "DELETING", url: asset.url } });
      console.error(`Removed unrecoverable deleting media asset ${asset.id}`);
      reconciled += 1;
    });
    for (const duplicate of tombstonePaths.slice(1)) await fs.promises.rm(duplicate, { force: true });
  }
  return { reconciled };
}

export async function runMediaMaintenance(client: PrismaClient, options: { uploadDir?: string; intervalMs?: number; tombstoneMinAgeMs?: number } = {}) {
  const uploadDir = options.uploadDir || configuredUploadDirectory();
  const intervalMs = options.intervalMs ?? 30_000;
  const now = Date.now();
  const previous = reconciliationTimes.get(uploadDir) || 0;
  if (intervalMs <= 0 || now - previous >= intervalMs) {
    reconciliationTimes.set(uploadDir, now);
    await reconcileDeletingMediaAssets(client, uploadDir);
  }
  return cleanupPendingTombstones(uploadDir, { minIntervalMs: intervalMs, minAgeMs: options.tombstoneMinAgeMs ?? 10 * 60_000 });
}
