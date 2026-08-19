import assert from "node:assert/strict";
import test from "node:test";

import { collectLocalMediaUrls, inspectLocalMediaUrls } from "../../src/lib/media-asset-validation-core.mjs";

test("collects unique local upload URLs from structured and rich-text input", () => {
  assert.deepEqual(collectLocalMediaUrls({
    image: "/uploads/a.jpg",
    html: '<img src="/uploads/b.webp"><img src="/uploads/a.jpg">',
    remote: "https://example.com/uploads/c.jpg",
  }), ["/uploads/a.jpg", "/uploads/b.webp"]);
});

test("does not collect path traversal or URL-prefix fragments", () => {
  assert.deepEqual(collectLocalMediaUrls(["/uploads/../x.jpg", "prefix/uploads/x.jpg", "/uploads/x.jpg-thumb"]), []);
});

test("reports every suspicious uploads target instead of silently skipping it", () => {
  const result = inspectLocalMediaUrls([
    "/uploads/file.jpg?x=1", "/uploads/file.jpg#x", "/uploads/%66ile.jpg",
    "/uploads\\file.jpg", "/uploads/../file.jpg", "https://example.com/uploads/file.jpg",
  ]);
  assert.deepEqual(result.urls, []);
  assert.equal(result.invalid.length, 6);
});

test("canonicalizes legacy query and hash URLs to their base for reference scanning", () => {
  const result = inspectLocalMediaUrls('<img src="/uploads/file.jpg?width=200"><a href="/uploads/file.jpg#download">');
  assert.deepEqual(result.legacyBases, ["/uploads/file.jpg"]);
});
