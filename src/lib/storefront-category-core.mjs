import {
  categoryPath,
  descendantCategoryIds,
  flattenCategoryTree,
  rootCategoryId,
} from "./category-tree-core.mjs";

export function formatStoreCategoryAssignments(rows, ids) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [];
    return [{
      id: row.id,
      slug: row.slug,
      name: row.name,
      rootId: rootCategoryId(rows, row.id),
      path: categoryPath(rows, row.id).map((item) => item.name),
    }];
  });
}

export function buildStoreCategoryTree(rows) {
  const flat = flattenCategoryTree(rows);
  const nodes = new Map(flat.map((row) => {
    const descendantIds = descendantCategoryIds(rows, row.id);
    const productCount = new Set(
      rows.filter((candidate) => descendantIds.includes(candidate.id)).flatMap((candidate) => candidate.productIds || []),
    ).size;
    return [row.id, {
      id: row.id,
      slug: row.slug,
      name: row.name,
      depth: row.depth,
      path: row.path.map((item) => item.name),
      descendantIds,
      productCount,
      children: [],
    }];
  }));
  const roots = [];
  for (const row of flat) {
    const node = nodes.get(row.id);
    const parent = row.parentId === null ? null : nodes.get(row.parentId);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export function productMatchesCategory(assignments, descendantIds) {
  const selected = new Set(descendantIds);
  return assignments.some((assignment) => selected.has(assignment.id));
}
