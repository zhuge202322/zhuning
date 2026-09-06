function text(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("");
    if ("result" in value) return String(value.result ?? "");
    if ("text" in value) return String(value.text ?? "");
    if ("formula" in value) return String(value.formula ?? "");
  }
  return String(value);
}

export function cleanImportText(value) {
  return text(value).replace(/\s+/g, " ").trim();
}

export function slugifyImportValue(value) {
  return cleanImportText(value)
    .replace(/[（(]\d+[）)]$/, "")
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80) || "category";
}

export function importProductSlug(item) {
  return `catalog-2026-09-${slugifyImportValue(item.name)}-${slugifyImportValue(item.sku)}`.slice(0, 120);
}

export function normalizeProductRow(input) {
  const priceText = cleanImportText(input.price);
  const parsedPrice = Number(priceText);
  return {
    rootCategory: cleanImportText(input.rootCategory).replace(/[（(]\d+[）)]$/, ""),
    sourceCategory: cleanImportText(input.sourceCategory),
    name: cleanImportText(input.name),
    sku: cleanImportText(input.sku),
    material: cleanImportText(input.material),
    price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
    weight: cleanImportText(input.weight),
    packaging: cleanImportText(input.packaging),
  };
}

export function isCompleteProductRow(row) {
  return Boolean(cleanImportText(row?.name) && cleanImportText(row?.sku));
}

export function deduplicateProductRows(rows) {
  const seen = new Set();
  const result = [];
  let duplicates = 0;
  for (const row of rows) {
    const key = cleanImportText(row.sku).toLowerCase();
    if (!key || seen.has(key)) {
      if (key) duplicates += 1;
      continue;
    }
    seen.add(key);
    result.push(row);
  }
  return { rows: result, duplicates };
}

export function buildCategoryPlan(rows) {
  const roots = new Map();
  const children = new Map();
  for (const row of rows) {
    const rootName = cleanImportText(row.rootCategory);
    const childName = cleanImportText(row.sourceCategory) || rootName;
    if (!rootName) continue;
    if (!roots.has(rootName)) roots.set(rootName, roots.size);
    if (childName === rootName) continue;
    const key = `${rootName}\0${childName}`;
    if (!children.has(key)) children.set(key, { rootName, childName, sortOrder: [...children.values()].filter((item) => item.rootName === rootName).length });
  }
  const plan = [];
  for (const [name, sortOrder] of roots) {
    plan.push({ name, slug: slugifyImportValue(name), parentName: null, sortOrder });
    for (const child of children.values()) {
      if (child.rootName !== name) continue;
      plan.push({ name: child.childName, slug: slugifyImportValue(child.childName), parentName: name, sortOrder: child.sortOrder });
    }
  }
  return plan;
}
