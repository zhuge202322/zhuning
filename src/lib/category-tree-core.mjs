export const MAX_CATEGORY_DEPTH = 3;

function rowMap(rows) {
  return new Map(rows.map((row) => [row.id, row]));
}

function sorted(rows) {
  return [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id);
}

export function categoryPath(rows, id) {
  const byId = rowMap(rows);
  const path = [];
  const visited = new Set();
  let current = byId.get(id);
  while (current) {
    if (visited.has(current.id)) return [];
    visited.add(current.id);
    path.unshift(current);
    current = current.parentId === null ? undefined : byId.get(current.parentId);
  }
  return path.length && path[0].parentId === null ? path : [];
}

export function categoryDepth(rows, id) {
  const path = categoryPath(rows, id);
  return path.length ? path.length - 1 : -1;
}

export function rootCategoryId(rows, id) {
  return categoryPath(rows, id)[0]?.id ?? null;
}

export function descendantCategoryIds(rows, id, includeSelf = true) {
  const children = new Map();
  for (const row of rows) {
    if (row.parentId === null) continue;
    const group = children.get(row.parentId) || [];
    group.push(row);
    children.set(row.parentId, group);
  }
  const result = [];
  const visit = (currentId) => {
    result.push(currentId);
    for (const child of sorted(children.get(currentId) || [])) visit(child.id);
  };
  visit(id);
  return includeSelf ? result : result.slice(1);
}

export function flattenCategoryTree(rows) {
  const children = new Map();
  for (const row of rows) {
    const group = children.get(row.parentId) || [];
    group.push(row);
    children.set(row.parentId, group);
  }
  const result = [];
  const visited = new Set();
  const visit = (row, path) => {
    if (visited.has(row.id)) return;
    visited.add(row.id);
    const nextPath = [...path, row];
    result.push({ ...row, depth: nextPath.length - 1, path: nextPath });
    for (const child of sorted(children.get(row.id) || [])) visit(child, nextPath);
  };
  for (const root of sorted(children.get(null) || [])) visit(root, []);
  for (const row of sorted(rows)) if (!visited.has(row.id)) visit(row, []);
  return result;
}

export function validateParentChange(rows, categoryId, parentId) {
  const byId = rowMap(rows);
  if (categoryId !== null && !byId.has(categoryId)) return { ok: false, error: "分类不存在" };
  if (parentId !== null && !byId.has(parentId)) return { ok: false, error: "父分类不存在" };
  if (categoryId !== null && parentId === categoryId) return { ok: false, error: "分类不能选择自己作为父分类" };
  if (categoryId !== null && parentId !== null && descendantCategoryIds(rows, categoryId).includes(parentId)) {
    return { ok: false, error: "分类不能选择自己的子分类作为父分类" };
  }

  const nextDepth = parentId === null ? 0 : categoryDepth(rows, parentId) + 1;
  if (nextDepth < 0) return { ok: false, error: "父分类层级无效" };
  let subtreeDepth = 0;
  if (categoryId !== null) {
    const currentDepth = categoryDepth(rows, categoryId);
    subtreeDepth = Math.max(
      0,
      ...descendantCategoryIds(rows, categoryId).map((id) => categoryDepth(rows, id) - currentDepth),
    );
  }
  if (nextDepth + subtreeDepth > MAX_CATEGORY_DEPTH) {
    return { ok: false, error: "分类最多支持三级子分类" };
  }
  return { ok: true };
}

export function validateSameRootSelection(rows, ids) {
  if (!ids.length) return { ok: true, rootId: null };
  const byId = rowMap(rows);
  if (ids.some((id) => !byId.has(id))) return { ok: false, error: "选择的产品分类不存在" };
  const roots = new Set(ids.map((id) => rootCategoryId(rows, id)));
  if (roots.has(null) || roots.size !== 1) {
    return { ok: false, error: "一个产品只能绑定同一主分类下的分类" };
  }
  return { ok: true, rootId: roots.values().next().value };
}

export function validateMoveProductAssignments(rows, categoryId, parentId, products) {
  const nextRows = rows.map((row) => row.id === categoryId ? { ...row, parentId } : row);
  for (const product of products) {
    const validation = validateSameRootSelection(nextRows, product.categoryIds);
    if (!validation.ok) {
      return { ok: false, error: "移动分类会导致产品跨主分类绑定，请先调整相关产品分类" };
    }
  }
  return { ok: true };
}
