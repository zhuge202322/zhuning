import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("admin navigation and AI SEO manager expose the reviewed workflow in Chinese", async () => {
  const nav = await readFile("src/components/admin/AdminShell.tsx", "utf8");
  const manager = await readFile("src/components/admin/AiSeoManager.tsx", "utf8");
  assert.match(nav, /AI SEO 优化/);
  assert.match(nav, /\/admin\/ai-seo/);
  assert.match(manager, /type="password"/);
  assert.match(manager, /生成 SEO 草稿/);
  assert.match(manager, /保存 SEO/);
  assert.match(manager, /最多选择 20/);
  assert.doesNotMatch(manager, /encryptedApiKey/);
});
