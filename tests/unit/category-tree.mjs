import assert from "node:assert/strict";
import test from "node:test";

import {
  categoryDepth,
  categoryPath,
  descendantCategoryIds,
  flattenCategoryTree,
  rootCategoryId,
  validateParentChange,
  validateMoveProductAssignments,
  validateSameRootSelection,
} from "../../src/lib/category-tree-core.mjs";

const rows = [
  { id: 1, parentId: null, name: "Rings", slug: "rings", sortOrder: 0 },
  { id: 2, parentId: 1, name: "Gemstone Rings", slug: "gemstone-rings", sortOrder: 0 },
  { id: 3, parentId: 2, name: "Ruby Rings", slug: "ruby-rings", sortOrder: 0 },
  { id: 4, parentId: 3, name: "Oval Ruby Rings", slug: "oval-ruby-rings", sortOrder: 0 },
  { id: 10, parentId: null, name: "Necklaces", slug: "necklaces", sortOrder: 10 },
  { id: 11, parentId: 10, name: "Pendant Necklaces", slug: "pendant-necklaces", sortOrder: 0 },
];

test("calculates depth, root, descendants, and full category paths", () => {
  assert.equal(categoryDepth(rows, 1), 0);
  assert.equal(categoryDepth(rows, 4), 3);
  assert.equal(rootCategoryId(rows, 4), 1);
  assert.deepEqual(descendantCategoryIds(rows, 2), [2, 3, 4]);
  assert.deepEqual(categoryPath(rows, 4).map((row) => row.name), [
    "Rings",
    "Gemstone Rings",
    "Ruby Rings",
    "Oval Ruby Rings",
  ]);
});

test("flattens categories in tree order with depth metadata", () => {
  assert.deepEqual(
    flattenCategoryTree(rows).map((row) => [row.id, row.depth]),
    [[1, 0], [2, 1], [3, 2], [4, 3], [10, 0], [11, 1]],
  );
});

test("accepts three child levels and rejects a fourth", () => {
  assert.equal(validateParentChange(rows, 4, 3).ok, true);
  assert.deepEqual(validateParentChange(rows, null, 4), {
    ok: false,
    error: "分类最多支持三级子分类",
  });
});

test("rejects self-parenting and descendant-parenting", () => {
  assert.equal(validateParentChange(rows, 2, 2).ok, false);
  assert.equal(validateParentChange(rows, 2, 4).ok, false);
});

test("requires all product categories to exist and share one root", () => {
  assert.deepEqual(validateSameRootSelection(rows, [2, 4]), { ok: true, rootId: 1 });
  assert.deepEqual(validateSameRootSelection(rows, []), { ok: true, rootId: null });
  assert.deepEqual(validateSameRootSelection(rows, [2, 11]), {
    ok: false,
    error: "一个产品只能绑定同一主分类下的分类",
  });
  assert.deepEqual(validateSameRootSelection(rows, [999]), {
    ok: false,
    error: "选择的产品分类不存在",
  });
});

test("rejects a category move that would split an existing product across roots", () => {
  const productAssignments = [
    { productId: 100, categoryIds: [1, 2] },
    { productId: 101, categoryIds: [2, 3] },
  ];

  assert.equal(validateMoveProductAssignments(rows, 2, 10, productAssignments).ok, false);
  assert.equal(validateMoveProductAssignments(rows, 2, null, productAssignments).ok, false);
  assert.equal(validateMoveProductAssignments(rows, 3, 2, productAssignments).ok, true);
});
