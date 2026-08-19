function nonEmpty(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mergeDataJson(fallback, override) {
  if (!isPlainObject(fallback) || !isPlainObject(override)) return override;

  const merged = { ...fallback };
  for (const [key, value] of Object.entries(override)) {
    merged[key] = Object.hasOwn(fallback, key)
      ? mergeDataJson(fallback[key], value)
      : value;
  }
  return merged;
}

function normalizeDataJson(fallbackJson, rowJson) {
  if (typeof rowJson !== "string" || !rowJson.trim()) return fallbackJson;
  try {
    const fallback = JSON.parse(fallbackJson);
    const override = JSON.parse(rowJson);
    return JSON.stringify(mergeDataJson(fallback, override));
  } catch {
    return fallbackJson;
  }
}

export function normalizeSiteSettings(defaults, registry, rows) {
  const defaultsByKey = new Map(defaults.map((item) => [item.key, item]));
  const rowsByKey = new Map(rows.map((item) => [item.key, item]));
  return Object.entries(registry).map(([key, definition]) => {
    const fallback = defaultsByKey.get(key) ?? { key, value: "", ...definition };
    const row = rowsByKey.get(key);
    return {
      id: row?.id ?? null,
      key,
      value: nonEmpty(row?.value, fallback.value),
      type: definition.type,
      group: definition.group,
      label: definition.label,
      createdAt: row?.createdAt ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  });
}

export function normalizePageSections(pageKey, defaults, pageRegistry, rows) {
  const defaultsByKey = new Map(defaults.filter((item) => item.pageKey === pageKey).map((item) => [item.sectionKey, item]));
  const rowsByKey = new Map(rows.map((item) => [item.sectionKey, item]));
  return Object.keys(pageRegistry.sections).map((sectionKey, index) => {
    const fallback = defaultsByKey.get(sectionKey) ?? {
      pageKey,
      sectionKey,
      sectionType: "text-media",
      eyebrow: "",
      title: "",
      body: "",
      buttonLabel: "",
      buttonHref: "",
      mediaUrl: "",
      mediaAlt: "",
      dataJson: "{}",
      sortOrder: index * 10,
      enabled: true,
    };
    const row = rowsByKey.get(sectionKey);
    return {
      id: row?.id ?? null,
      pageKey,
      sectionKey,
      sectionType: nonEmpty(row?.sectionType, fallback.sectionType),
      eyebrow: nonEmpty(row?.eyebrow, fallback.eyebrow),
      title: nonEmpty(row?.title, fallback.title),
      body: nonEmpty(row?.body, fallback.body),
      buttonLabel: nonEmpty(row?.buttonLabel, fallback.buttonLabel),
      buttonHref: nonEmpty(row?.buttonHref, fallback.buttonHref),
      mediaUrl: nonEmpty(row?.mediaUrl, fallback.mediaUrl),
      mediaAlt: nonEmpty(row?.mediaAlt, fallback.mediaAlt),
      dataJson: normalizeDataJson(fallback.dataJson, row?.dataJson),
      sortOrder: row?.sortOrder ?? fallback.sortOrder,
      enabled: row?.enabled ?? fallback.enabled,
      createdAt: row?.createdAt ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  }).sort((left, right) => left.sortOrder - right.sortOrder);
}
