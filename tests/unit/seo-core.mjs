import test from "node:test";
import assert from "node:assert/strict";
import { buildCanonicalUrl, buildSeoFallback, isSafePublicUrl } from "../../src/lib/seo-core.mjs";

test("builds canonical URLs without query strings or fragments", () => {
  assert.equal(buildCanonicalUrl("https://example.com/", "/products/ring?page=2#details"), "https://example.com/products/ring");
  assert.equal(buildCanonicalUrl("https://example.com/shop", "/products"), "https://example.com/products");
});

test("rejects unsafe public URLs", () => {
  assert.equal(isSafePublicUrl("javascript:alert(1)"), false);
  assert.equal(isSafePublicUrl("//evil.example/image.jpg"), false);
  assert.equal(isSafePublicUrl("/uploads/image.webp"), true);
  assert.equal(isSafePublicUrl("https://example.com/image.webp"), true);
});

test("builds bounded English SEO fallbacks from source data", () => {
  const draft = buildSeoFallback({
    name: "Ruby Statement Ring",
    category: "Rings",
    description: "<p>A sculptural ring made for private-label and wholesale jewelry collections.</p>",
    image: "/products/ruby-ring.webp",
  });
  assert.equal(draft.title.length <= 70, true);
  assert.equal(draft.description.includes("<p>"), false);
  assert.equal(draft.description.length <= 170, true);
  assert.deepEqual(draft.keywords.slice(0, 2), ["ruby statement ring", "rings"]);
  assert.equal(draft.ogImage, "/products/ruby-ring.webp");
});
