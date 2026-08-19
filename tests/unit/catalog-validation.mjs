import assert from "node:assert/strict";
import test from "node:test";

import { validateCategoryInput, validatePostInput, validateProductInput } from "../../src/lib/input-validation-core.mjs";

test("product scalar schema rejects coercion and invalid numeric values", () => {
  assert.equal(validateProductInput({ name: "Ring", slug: "ring", featured: "false" }, "create").ok, false);
  assert.equal(validateProductInput({ name: "Ring", slug: "ring", description: {} }, "create").ok, false);
  assert.equal(validateProductInput({ name: "Ring", slug: "ring", price: "12.00" }, "create").ok, false);
  assert.equal(validateProductInput({ name: "Ring", slug: "ring", price: -1 }, "create").ok, false);
  assert.equal(validateProductInput({ name: "Ring", slug: "ring", sortOrder: 1.5 }, "create").ok, false);
  assert.equal(validateProductInput({ name: "Ring", slug: "ring", price: null, featured: false, sortOrder: 2 }, "create").ok, true);
});

test("catalog create requires identity fields while update accepts validated partial fields", () => {
  assert.equal(validateProductInput({ featured: true }, "create").ok, false);
  assert.equal(validateProductInput({ featured: true }, "update").ok, true);
  assert.equal(validateCategoryInput({ sortOrder: 3 }, "create").ok, false);
  assert.equal(validateCategoryInput({ sortOrder: 3 }, "update").ok, true);
  assert.equal(validatePostInput({ excerpt: "Edited" }, "create").ok, false);
  assert.equal(validatePostInput({ excerpt: "Edited" }, "update").ok, true);
});

test("category and post scalar schemas reject wrong values", () => {
  assert.equal(validateCategoryInput({ name: "Rings", slug: "rings", sortOrder: "1" }, "create").ok, false);
  assert.equal(validateCategoryInput({ name: "Rings", slug: "rings", nameFr: {} }, "create").ok, false);
  assert.equal(validatePostInput({ title: "News", slug: "news", date: "not-a-date" }, "create").ok, false);
  assert.equal(validatePostInput({ title: "News", slug: "news", date: 1 }, "create").ok, false);
  assert.equal(validatePostInput({ title: "News", slug: "news", content: {} }, "create").ok, false);
});
