import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

import {
  cleanupPendingTombstones,
  cleanupReplacedMediaFile,
  cleanupReplacedMedia,
  finalizeStagedDeletion,
  restoreStagedDeletion,
  stageStoredMediaDeletion,
} from "../../src/lib/media-lifecycle-core.mjs";

const directory = mkdtempSync(path.join(os.tmpdir(), "media-lifecycle-"));
after(() => rmSync(directory, { recursive: true, force: true }));

test("stages deletion by same-directory rename and restores without overwriting", async () => {
  const originalPath = path.join(directory, "asset.mp4");
  writeFileSync(originalPath, "old");
  const staged = await stageStoredMediaDeletion(originalPath, () => "token");
  assert.equal(existsSync(originalPath), false);
  assert.equal(readFileSync(staged.tombstonePath, "utf8"), "old");
  assert.equal(await restoreStagedDeletion(staged), true);
  assert.equal(readFileSync(originalPath, "utf8"), "old");

  const stagedAgain = await stageStoredMediaDeletion(originalPath, () => "token2");
  writeFileSync(originalPath, "new");
  assert.equal(await restoreStagedDeletion(stagedAgain), false);
  assert.equal(readFileSync(originalPath, "utf8"), "new");
  await finalizeStagedDeletion(stagedAgain);
});

test("asset deletion tombstones encode the asset id and original filename", async () => {
  const originalPath = path.join(directory, "11111111-1111-4111-8111-111111111111.png");
  writeFileSync(originalPath, "asset");
  const staged = await stageStoredMediaDeletion(
    originalPath,
    { assetId: 42, kind: "delete" },
    () => "22222222-2222-4222-8222-222222222222",
  );
  assert.equal(
    path.basename(staged.tombstonePath),
    ".delete-asset-42-22222222-2222-4222-8222-222222222222-11111111-1111-4111-8111-111111111111.png.tombstone",
  );
  await finalizeStagedDeletion(staged);
});

test("replacement cleanup failure preserves success and returns a warning", async () => {
  const messages = [];
  const result = await cleanupReplacedMedia("/uploads/old.mp4", async () => { throw new Error("locked"); }, (message) => messages.push(message));
  assert.deepEqual(result, { cleanupWarning: "Old media file could not be removed and requires later cleanup." });
  assert.equal(messages.length, 1);
});

test("replacement cleanup stages a retryable asset tombstone when final deletion fails", async () => {
  const originalPath = path.join(directory, "33333333-3333-4333-8333-333333333333.png");
  writeFileSync(originalPath, "old");
  const result = await cleanupReplacedMediaFile(originalPath, 77, {
    randomUUID: () => "44444444-4444-4444-8444-444444444444",
    finalize: async () => { throw new Error("locked"); },
    log: () => undefined,
  });
  assert.equal(result.cleanupWarning, "Old media file could not be removed and requires later cleanup.");
  assert.equal(existsSync(originalPath), false);
  const tombstone = path.join(directory, ".replace-asset-77-44444444-4444-4444-8444-444444444444-33333333-3333-4333-8333-333333333333.png.tombstone");
  assert.equal(existsSync(tombstone), true);
  const retry = await cleanupPendingTombstones(directory, { minIntervalMs: 0, minAgeMs: 0 });
  assert.equal(retry.removed, 1);
});

test("pending tombstone cleanup retries only strict contained queue files", async () => {
  const valid = path.join(directory, ".delete-11111111-1111-4111-8111-111111111111.tombstone");
  const unrelated = path.join(directory, ".delete-not-safe.tombstone");
  writeFileSync(valid, "pending");
  writeFileSync(unrelated, "keep");
  const result = await cleanupPendingTombstones(directory, { minIntervalMs: 0, minAgeMs: 0 });
  assert.equal(result.removed, 1);
  assert.equal(existsSync(valid), false);
  assert.equal(existsSync(unrelated), true);
});
