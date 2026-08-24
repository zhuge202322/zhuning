# Product Category Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a four-level category tree (top-level plus three child levels), enforce same-root product assignments, and expose nested category filtering and paths on the storefront.

**Architecture:** A pure `category-tree-core.mjs` module owns tree traversal and validation so it can be tested without Prisma. Prisma persists `parentId`; admin APIs call the shared rules inside transactions, while storefront queries format the same flat rows into a nested navigation model and category paths.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 6, SQLite, TypeScript, Node.js test runner.

---

### Task 1: Category Tree Rules

**Files:**
- Create: `src/lib/category-tree-core.mjs`
- Create: `src/lib/category-tree.ts`
- Create: `tests/unit/category-tree.mjs`

- [ ] **Step 1: Write failing helper tests**

Cover a four-level valid tree, a fifth-level rejection, self/descendant parent rejection, descendant ID collection, full paths, and same-root product assignment.

```js
test("accepts three child levels and rejects a fourth", () => {
  assert.equal(validateParentChange(rows, 4, 3).ok, true);
  assert.equal(validateParentChange(rows, 5, 4).ok, false);
});

test("requires product categories to share one root", () => {
  assert.equal(validateSameRootSelection(rows, [2, 3]).ok, true);
  assert.equal(validateSameRootSelection(rows, [2, 10]).ok, false);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/unit/category-tree.mjs`

Expected: FAIL because `category-tree-core.mjs` does not exist.

- [ ] **Step 3: Implement pure helpers and TypeScript exports**

Export:

```ts
export type CategoryTreeRow = { id: number; parentId: number | null; name?: string; slug?: string };
export const MAX_CATEGORY_DEPTH = 3;
export const categoryDepth: (rows, id) => number;
export const rootCategoryId: (rows, id) => number | null;
export const descendantCategoryIds: (rows, id, includeSelf?) => number[];
export const categoryPath: (rows, id) => CategoryTreeRow[];
export const flattenCategoryTree: (rows) => Array<CategoryTreeRow & { depth: number; path: CategoryTreeRow[] }>;
export const validateParentChange: (rows, categoryId, parentId) => { ok: boolean; error?: string };
export const validateSameRootSelection: (rows, ids) => { ok: boolean; error?: string; rootId?: number | null };
```

- [ ] **Step 4: Run the helper test and verify GREEN**

Run: `node --test tests/unit/category-tree.mjs`

Expected: all category-tree tests pass.

### Task 2: Prisma Model And Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/init.sql`
- Create: `prisma/migrations/20260824000000_add_category_tree/migration.sql`
- Modify: `tests/unit/cms-schema-contract.mjs`

- [ ] **Step 1: Add failing schema assertions**

Assert that the Prisma schema has `parentId`, `parent`, `children`, and `@@index([parentId])`, and migration/init SQL include the nullable parent column and foreign key.

- [ ] **Step 2: Run schema tests and verify RED**

Run: `node --test tests/unit/cms-schema-contract.mjs`

Expected: FAIL on missing `Category.parentId`.

- [ ] **Step 3: Add self-relation and SQLite migration**

Use `onDelete: Restrict` and rebuild the SQLite `Category` table in migration SQL so existing categories retain IDs and get `parentId = NULL`.

- [ ] **Step 4: Regenerate Prisma client and verify schema test GREEN**

Run: `npx prisma generate` and `node --test tests/unit/cms-schema-contract.mjs`.

Expected: both commands succeed.

### Task 3: Admin Category And Product Validation

**Files:**
- Modify: `src/lib/catalog-write-data.ts`
- Modify: `src/lib/input-validation-core.mjs`
- Modify: `src/app/api/admin/categories/route.ts`
- Modify: `src/app/api/admin/categories/[id]/route.ts`
- Modify: `src/app/api/admin/products/route.ts`
- Modify: `src/app/api/admin/products/[id]/route.ts`
- Modify: `src/app/admin/categories/page.tsx`
- Modify: `src/components/admin/CategoriesManager.tsx`
- Modify: `src/app/admin/products/new/page.tsx`
- Modify: `src/app/admin/products/[id]/page.tsx`
- Modify: `src/components/admin/ProductForm.tsx`
- Modify: `src/app/admin/products/page.tsx`

- [ ] **Step 1: Extend validation tests for `parentId`**

Add category input tests proving `null` and positive integer parents pass while zero, negative, string, and fractional values fail.

- [ ] **Step 2: Run validation tests and verify RED**

Run: `node --test tests/unit/catalog-validation.mjs`

Expected: FAIL because `parentId` is not validated.

- [ ] **Step 3: Add transactional API constraints**

Category APIs load all category IDs and parents, validate proposed moves, and reject deleting rows with children. Product APIs validate all selected IDs exist and pass `validateSameRootSelection` before writing relations.

- [ ] **Step 4: Implement tree-based admin controls**

Pass `parentId`, `depth`, `pathLabel`, and `childCount` to the client. Render indented rows, parent selects, full paths, and same-root-disabled category options in the product form. Keep API errors visible in Chinese.

- [ ] **Step 5: Run focused tests and type checking**

Run: `node --test tests/unit/category-tree.mjs tests/unit/catalog-validation.mjs` and `npx tsc --noEmit`.

Expected: tests and type checking pass.

### Task 4: Dynamic Storefront Categories

**Files:**
- Modify: `src/lib/storefront-data.ts`
- Modify: `src/app/products/page.tsx`
- Modify: `src/components/ProductListView.tsx`
- Modify: `src/components/ProductCard.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/lib/cms-format.ts`
- Modify: `src/lib/cms.ts`
- Create: `tests/unit/storefront-category-tree.mjs`

- [ ] **Step 1: Add failing storefront formatting tests**

Test nested navigation output, descendant-inclusive filtering IDs, and product category path formatting.

- [ ] **Step 2: Run storefront tests and verify RED**

Run: `node --test tests/unit/storefront-category-tree.mjs`

Expected: FAIL because storefront tree helpers/data do not exist.

- [ ] **Step 3: Extend storefront product and category data**

Add `categoryAssignments` with IDs, slugs, names, root IDs, and paths while preserving the existing normalized `category` field. Add `getStoreCategoryTree()` and pass selected slug directly from `/products`.

- [ ] **Step 4: Replace hard-coded sidebar with nested navigation**

Render all top-level and nested categories with depth-aware indentation and descendant-inclusive counts. Filter a product when any assignment ID is in the selected category's descendant set. Show category paths on cards without translating product/category source content.

- [ ] **Step 5: Run storefront tests and type checking**

Run: `node --test tests/unit/storefront-category-tree.mjs` and `npx tsc --noEmit`.

Expected: tests and type checking pass.

### Task 5: Full Verification

**Files:**
- Review all modified files

- [ ] **Step 1: Run all unit tests**

Run: `node --test tests/unit/*.mjs`

Expected: zero failures.

- [ ] **Step 2: Run production checks**

Run: `npx tsc --noEmit`, `npx next build`, and `git diff --check`.

Expected: all commands exit successfully; known Next.js middleware/NFT warnings may remain without new errors.

- [ ] **Step 3: Run browser smoke tests**

Check `/admin/categories`, `/admin/products/new`, and `/products`. Verify the category tree renders, controls have no framework overlay or console errors, and a nested category link updates the URL and product results.

- [ ] **Step 4: Review final diff**

Confirm migration compatibility, no unrelated storefront changes, no generated database files, and no secrets in the commit.
