import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCategoryPlan,
  deduplicateProductRows,
  importProductSlug,
  isCompleteProductRow,
  normalizeProductRow,
  slugifyImportValue,
} from "../../src/lib/product-import-core.mjs";

test("normalizes source rows without losing the English product fields", () => {
  const row = normalizeProductRow({
    rootCategory: "Jewelry sets（284）",
    sourceCategory: "Crystal & Gemstone Collection",
    name: "  Crystal Necklace  ",
    sku: " AMJ-001 ",
    material: "Rhinestone",
    price: "2.920168731",
    weight: "20cm*15cm*5cm",
    packaging: "6",
  });

  assert.deepEqual(row, {
    rootCategory: "Jewelry sets",
    sourceCategory: "Crystal & Gemstone Collection",
    name: "Crystal Necklace",
    sku: "AMJ-001",
    material: "Rhinestone",
    price: 2.920168731,
    weight: "20cm*15cm*5cm",
    packaging: "6",
  });
});

test("rejects blank product rows and keeps repeated SKU rows idempotent", () => {
  assert.equal(isCompleteProductRow({ name: "", sku: "AMJ-001" }), false);
  assert.equal(isCompleteProductRow({ name: "Product", sku: "" }), false);

  const result = deduplicateProductRows([
    { name: "One", sku: "AMJ-001" },
    { name: "One", sku: "amj-001" },
    { name: "Two", sku: "AMJ-002" },
  ]);

  assert.equal(result.rows.length, 2);
  assert.equal(result.duplicates, 1);
  assert.deepEqual(result.rows.map((row) => row.sku), ["AMJ-001", "AMJ-002"]);
});

test("builds stable main and child categories from source folders", () => {
  const plan = buildCategoryPlan([
    { rootCategory: "Accessories", sourceCategory: "Watches" },
    { rootCategory: "Accessories", sourceCategory: "Brooches & Pins" },
    { rootCategory: "Jewelry sets", sourceCategory: "Pearl Collection" },
    { rootCategory: "Rings", sourceCategory: "Rings" },
  ]);

  assert.deepEqual(plan, [
    { name: "Accessories", slug: "accessories", parentName: null, sortOrder: 0 },
    { name: "Watches", slug: "watches", parentName: "Accessories", sortOrder: 0 },
    { name: "Brooches & Pins", slug: "brooches-pins", parentName: "Accessories", sortOrder: 1 },
    { name: "Jewelry sets", slug: "jewelry-sets", parentName: null, sortOrder: 1 },
    { name: "Pearl Collection", slug: "pearl-collection", parentName: "Jewelry sets", sortOrder: 0 },
    { name: "Rings", slug: "rings", parentName: null, sortOrder: 2 },
  ]);
});

test("creates URL-safe slugs for non-ASCII folder names", () => {
  assert.equal(slugifyImportValue("Women’s Apparel（30）"), "womens-apparel");
});

test("uses a stable batch-prefixed slug without colliding with legacy products", () => {
  assert.equal(
    importProductSlug({ name: "Crystal Necklace", sku: "AMJ-001" }),
    "catalog-2026-09-crystal-necklace-amj-001",
  );
});
