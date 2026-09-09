import test from "node:test";
import assert from "node:assert/strict";
import {
  decryptApiKey,
  encryptApiKey,
  maskApiKey,
  parseAiSeoResponse,
  validateAiConfig,
} from "../../src/lib/ai-seo-core.mjs";

test("encrypts an API key with authenticated encryption", () => {
  const encrypted = encryptApiKey("sk-test-value", "long-admin-secret", () => Buffer.alloc(12, 7));
  assert.notEqual(encrypted, "sk-test-value");
  assert.equal(encrypted.includes("sk-test-value"), false);
  assert.equal(decryptApiKey(encrypted, "long-admin-secret"), "sk-test-value");
  assert.throws(() => decryptApiKey(encrypted, "wrong-secret"));
});

test("masks API keys without exposing the original value", () => {
  assert.equal(maskApiKey("sk-abcdefghijklmnop"), "••••mnop");
  assert.equal(maskApiKey("short"), "••••hort");
});

test("validates HTTPS AI configuration", () => {
  assert.equal(validateAiConfig({ endpoint: "http://example.com/v1/chat/completions", model: "gpt-test", enabled: true }).ok, false);
  const result = validateAiConfig({ endpoint: "https://example.com/v1/chat/completions", model: "gpt-test", enabled: true, apiKey: "" });
  assert.equal(result.ok, true);
  assert.equal(result.value.endpoint, "https://example.com/v1/chat/completions");
});

test("parses a fenced AI JSON response", () => {
  const result = parseAiSeoResponse('```json\n{"title":"Luxury ring","description":"A refined ring for wholesale buyers.","keywords":["ring"," luxury jewelry "]}\n```');
  assert.equal(result.ok, true);
  assert.deepEqual(result.draft.keywords, ["ring", "luxury jewelry"]);
  assert.equal(result.draft.robots, "index,follow");
});

test("rejects incomplete or overlong AI SEO content", () => {
  assert.equal(parseAiSeoResponse('{"title":"Only a title"}').ok, false);
  assert.equal(parseAiSeoResponse(JSON.stringify({ title: "x".repeat(71), description: "Valid description", keywords: [] })).ok, false);
  assert.equal(parseAiSeoResponse(JSON.stringify({ title: "Valid title", description: "x".repeat(171), keywords: [] })).ok, false);
});

test("drops an unsafe optional Open Graph image", () => {
  const result = parseAiSeoResponse(JSON.stringify({
    title: "Luxury necklace",
    description: "A polished necklace collection for international buyers.",
    keywords: "necklace, wholesale jewelry",
    ogImage: "javascript:alert(1)",
  }));
  assert.equal(result.ok, true);
  assert.equal(result.draft.ogImage, "");
});
