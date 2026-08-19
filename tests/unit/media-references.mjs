import assert from "node:assert/strict";
import test from "node:test";

import { containsExactMediaUrl, replaceExactMediaUrl } from "../../src/lib/media-references-core.mjs";

const oldUrl = "/uploads/11111111-1111-4111-8111-111111111111.jpg";
const newUrl = "/uploads/22222222-2222-4222-8222-222222222222.jpg";

test("finds exact media URLs embedded in rich HTML", () => {
  assert.equal(containsExactMediaUrl(`<p>Before</p><img src="${oldUrl}" alt="Ring"><p>After</p>`, oldUrl), true);
  assert.equal(containsExactMediaUrl(`background-image: url('${oldUrl}')`, oldUrl), true);
});

test("does not treat URL prefixes, suffixes, or query variants as exact references", () => {
  for (const value of [`${oldUrl}-thumb`, `${oldUrl}.backup`, `${oldUrl}?width=200`, `prefix${oldUrl}`]) {
    assert.equal(containsExactMediaUrl(value, oldUrl), false, value);
  }
});

test("replaces only exact rich-text URL occurrences", () => {
  const html = `<img src="${oldUrl}"><a href="${oldUrl}?download=1">query</a><span>${oldUrl}-thumb</span>`;
  assert.equal(
    replaceExactMediaUrl(html, oldUrl, newUrl),
    `<img src="${newUrl}"><a href="${oldUrl}?download=1">query</a><span>${oldUrl}-thumb</span>`,
  );
});
