import * as core from '@/lib/storefront-category-core.mjs';

export type StoreCategoryAssignment = {
  id: number;
  slug: string;
  name: string;
  rootId: number;
  path: string[];
};

export type StoreCategoryNode = {
  id: number;
  slug: string;
  name: string;
  depth: number;
  path: string[];
  descendantIds: number[];
  productCount: number;
  children: StoreCategoryNode[];
};

export const formatStoreCategoryAssignments = core.formatStoreCategoryAssignments as (rows: any[], ids: number[]) => StoreCategoryAssignment[];
export const buildStoreCategoryTree = core.buildStoreCategoryTree as (rows: any[]) => StoreCategoryNode[];
export const productMatchesCategory = core.productMatchesCategory as (assignments: StoreCategoryAssignment[], descendantIds: number[]) => boolean;
