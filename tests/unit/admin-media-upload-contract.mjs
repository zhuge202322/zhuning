import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const adminComponents = path.join(repositoryRoot, "src", "components", "admin");

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : /\.(?:ts|tsx)$/.test(entry.name) ? [target] : [];
  });
}

test("admin UI uploads media only through the MediaAsset API", () => {
  const offenders = sourceFiles(adminComponents)
    .filter((file) => readFileSync(file, "utf8").includes("/api/admin/upload"))
    .map((file) => path.relative(repositoryRoot, file));
  assert.deepEqual(offenders, []);
});

test("media clients use cursor items, localized load more, and raw MP4 headers", () => {
  for (const name of ["MediaLibrary.tsx", "MediaPicker.tsx"]) {
    const source = readFileSync(path.join(adminComponents, name), "utf8");
    assert.equal(source.includes("data.assets"), false, name);
    assert.equal(source.includes("data.items"), true, name);
    assert.equal(source.includes("nextCursor"), true, name);
    assert.equal(source.includes("加载更多"), true, name);
  }
  const uploadSource = readFileSync(path.join(adminComponents, "uploadMediaAsset.ts"), "utf8");
  assert.equal(uploadSource.includes("application/octet-stream"), true);
  assert.equal(uploadSource.includes("x-file-size"), true);
  assert.equal(uploadSource.includes("x-expected-updated-at"), true);
});
