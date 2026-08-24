import * as core from "@/lib/category-tree-core.mjs";

export type CategoryTreeRow = {
  id: number;
  parentId: number | null;
  name?: string;
  slug?: string;
  sortOrder?: number;
};

export type FlatCategoryTreeRow<T extends CategoryTreeRow = CategoryTreeRow> = T & {
  depth: number;
  path: T[];
};

type ValidationResult = { ok: boolean; error?: string };
type RootValidationResult = ValidationResult & { rootId?: number | null };

export const MAX_CATEGORY_DEPTH = core.MAX_CATEGORY_DEPTH as number;
export const categoryDepth = core.categoryDepth as (rows: CategoryTreeRow[], id: number) => number;
export const rootCategoryId = core.rootCategoryId as (rows: CategoryTreeRow[], id: number) => number | null;
export const descendantCategoryIds = core.descendantCategoryIds as (rows: CategoryTreeRow[], id: number, includeSelf?: boolean) => number[];
export const categoryPath = core.categoryPath as <T extends CategoryTreeRow>(rows: T[], id: number) => T[];
export const flattenCategoryTree = core.flattenCategoryTree as <T extends CategoryTreeRow>(rows: T[]) => FlatCategoryTreeRow<T>[];
export const validateParentChange = core.validateParentChange as (rows: CategoryTreeRow[], categoryId: number | null, parentId: number | null) => ValidationResult;
export const validateSameRootSelection = core.validateSameRootSelection as (rows: CategoryTreeRow[], ids: number[]) => RootValidationResult;
export const validateMoveProductAssignments = core.validateMoveProductAssignments as (
  rows: CategoryTreeRow[],
  categoryId: number,
  parentId: number | null,
  products: Array<{ productId: number; categoryIds: number[] }>,
) => ValidationResult;
