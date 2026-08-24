# Product Category Tree Design

## Goal

Add hierarchical product categories to the SQLite CMS, allowing up to three levels of subcategories, while keeping product assignment within one top-level category tree and exposing the hierarchy on the English storefront product listing.

## Scope

- A category may have one parent category or no parent.
- `parentId = null` identifies a top-level category.
- The maximum allowed depth is three child levels below a top-level category.
- A product may be associated with multiple categories, but every selected category must resolve to the same top-level ancestor.
- Existing categories remain top-level categories during migration, so existing product assignments remain valid.
- The storefront product listing loads categories from the database instead of relying only on the current hard-coded category list.

## Data Model

Extend `Category` with a nullable self-relation:

- `parentId Int?`
- `parent Category? @relation("CategoryTree", fields: [parentId], references: [id], onDelete: Restrict, onUpdate: Cascade)`
- `children Category[] @relation("CategoryTree")`
- An index on `parentId`

The Prisma migration and `prisma/init.sql` must both include the column, foreign key, and index. Existing rows are backfilled with `NULL` parents.

## Backend Rules

Create shared category-tree helpers for:

- Building a tree from flat rows.
- Calculating depth and top-level ancestor.
- Detecting cycles and descendants.
- Validating a proposed parent and enforcing the maximum depth.
- Validating that a product's selected category IDs belong to one top-level tree.

Category create/update APIs must reject:

- A missing or invalid parent ID.
- Self-parenting or selecting a descendant as parent.
- A resulting depth deeper than three child levels.
- A parent that would create a cycle.

Category deletion must reject deletion when the category has children. Product associations may continue to be removed by the existing delete behavior only when no children exist.

Product create/update APIs must accept `categoryIds` as before and additionally validate that all selected categories share one top-level ancestor. The API remains the source of truth; UI restrictions are supplemental.

## Admin UI

Update the category manager to:

- Render categories as an indented tree.
- Show each category's depth, parent relationship, and product count.
- Allow selecting a parent while creating or editing.
- Exclude the current category and all of its descendants from the parent selector.
- Disable or explain parent choices that would exceed the depth limit.
- Prevent deleting categories that still have children.

Update product forms and product list queries to load categories with parent information and render full category paths. Product category selection must make the one-top-level-tree restriction apparent and prevent selecting categories from a different top-level tree after the first selection.

## Storefront

The `/products` page must:

- Load the category tree dynamically from the CMS.
- Display top-level categories and nested subcategories in the sidebar/menu.
- Accept a category slug query parameter and include products assigned to that category or any descendant.
- Display each product's corresponding category path, such as `Rings / Gemstone Rings / Ruby Rings`.
- Preserve compatibility with the existing base slugs for rings, necklaces, jewelry sets, and bags where those categories exist.

Storefront product data should retain the existing normalized primary category field for compatibility with current cards, inquiry flows, and detail panels, while adding category IDs, slugs, names, and paths for filtering and display.

## Error Handling

- Validation errors return the existing JSON `{ error }` shape with Chinese admin-facing messages.
- Invalid category tree operations return a 400 response.
- Missing categories return 404.
- Concurrent or stale updates continue to use the existing API conventions.
- No migration should silently delete category or product data.

## Verification

- Test category depth, cycle prevention, descendant exclusion, deletion with children, and top-level-tree validation.
- Test product assignment with same-tree and cross-tree category IDs.
- Test storefront category filtering includes descendants and renders full paths.
- Run `npx prisma generate`, `npx tsc --noEmit`, `npx next build`, and `git diff --check`.
- Smoke-test `/admin/categories`, product create/edit, and `/products` in the local browser.
