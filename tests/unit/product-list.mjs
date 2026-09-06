import test from "node:test";
import assert from "node:assert/strict";

import { getPaginationItems, paginateProducts } from "../../src/lib/product-list-core.mjs";

test("paginates the product grid in twenty-item pages", () => {
  const products = Array.from({ length: 43 }, (_, index) => ({ id: index + 1 }));

  assert.deepEqual(paginateProducts(products, 1, 20), {
    items: products.slice(0, 20),
    page: 1,
    pageSize: 20,
    totalItems: 43,
    totalPages: 3,
  });
  assert.deepEqual(paginateProducts(products, 99, 20), {
    items: products.slice(40),
    page: 3,
    pageSize: 20,
    totalItems: 43,
    totalPages: 3,
  });
});

test("keeps long pagination controls compact around the current page", () => {
  assert.deepEqual(getPaginationItems(1, 53), [1, 2, 3, "ellipsis", 53]);
  assert.deepEqual(getPaginationItems(27, 53), [1, "ellipsis", 26, 27, 28, "ellipsis", 53]);
  assert.deepEqual(getPaginationItems(53, 53), [1, "ellipsis", 51, 52, 53]);
});
