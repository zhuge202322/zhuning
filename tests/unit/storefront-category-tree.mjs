import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStoreCategoryTree,
  formatStoreCategoryAssignments,
  productMatchesCategory,
} from "../../src/lib/storefront-category-core.mjs";

const rows = [
  { id: 1, parentId: null, name: "Rings", slug: "rings", sortOrder: 0, productIds: [100] },
  { id: 2, parentId: 1, name: "Gemstone Rings", slug: "gemstone-rings", sortOrder: 0, productIds: [101] },
  { id: 3, parentId: 2, name: "Ruby Rings", slug: "ruby-rings", sortOrder: 0, productIds: [102] },
  { id: 10, parentId: null, name: "Necklaces", slug: "necklaces", sortOrder: 1, productIds: [200] },
];

test("builds nested storefront categories with descendant product counts", () => {
  const tree = buildStoreCategoryTree(rows);
  assert.equal(tree.length, 2);
  assert.equal(tree[0].name, "Rings");
  assert.equal(tree[0].productCount, 3);
  assert.deepEqual(tree[0].descendantIds, [1, 2, 3]);
  assert.equal(tree[0].children[0].path.join(" / "), "Rings / Gemstone Rings");
  assert.equal(tree[0].children[0].productCount, 2);
  assert.equal(tree[0].children[0].children[0].slug, "ruby-rings");
});

test("formats complete product category paths and root IDs", () => {
  assert.deepEqual(formatStoreCategoryAssignments(rows, [2, 3]), [
    { id: 2, slug: "gemstone-rings", name: "Gemstone Rings", rootId: 1, path: ["Rings", "Gemstone Rings"] },
    { id: 3, slug: "ruby-rings", name: "Ruby Rings", rootId: 1, path: ["Rings", "Gemstone Rings", "Ruby Rings"] },
  ]);
});

test("matches products assigned directly to a selected category or any descendant", () => {
  const assignments = formatStoreCategoryAssignments(rows, [3]);
  assert.equal(productMatchesCategory(assignments, [1, 2, 3]), true);
  assert.equal(productMatchesCategory(assignments, [10]), false);
});
