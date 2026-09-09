import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("schema contains encrypted AI configuration and SEO metadata models", async () => {
  const schema = await readFile("prisma/schema.prisma", "utf8");
  assert.match(schema, /model AiProviderConfig/);
  assert.match(schema, /encryptedApiKey\s+String/);
  assert.match(schema, /model SeoMeta/);
  assert.match(schema, /targetType\s+String/);
  assert.match(schema, /targetKey\s+String/);
  assert.match(schema, /@@unique\(\[targetType, targetKey\]\)/);
});
