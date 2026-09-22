import { pageSectionFallbacks } from "../../scripts/seed-cms.mjs";

export const siteSettingRegistry = {
  "site.name": { label: "Website name", type: "text", group: "brand" },
  "site.logo": { label: "Company logo", type: "image", group: "brand" },
  "storefront.allProductsLabel": { label: "All products label", type: "text", group: "storefront" },
  "support.email": { label: "Customer service email", type: "email", group: "support" },
  "support.phone": { label: "Customer service phone", type: "text", group: "support" },
  "support.whatsapp": { label: "WhatsApp", type: "text", group: "support" },
  "company.address": { label: "Company address", type: "textarea", group: "company" },
  "social.instagram": { label: "Instagram", type: "url", group: "social" },
  "social.facebook": { label: "Facebook", type: "url", group: "social" },
  "social.tiktok": { label: "TikTok", type: "url", group: "social" },
  "social.youtube": { label: "YouTube", type: "url", group: "social" },
  "seo.siteTitle": { label: "Default SEO title", type: "text", group: "seo" },
  "seo.defaultDescription": { label: "Default SEO description", type: "textarea", group: "seo" },
  "seo.defaultKeywords": { label: "Default SEO keywords", type: "textarea", group: "seo" },
  "seo.siteUrl": { label: "Public site URL", type: "url", group: "seo" },
  "seo.defaultOgImage": { label: "Default social sharing image", type: "image", group: "seo" },
  "seo.twitterHandle": { label: "Twitter/X handle", type: "text", group: "seo" },
};

export const pageSectionRegistry = {
  home: {
    label: "Homepage",
    sections: {
      hero: ["imageMode", "secondaryAction", "slides"], proof: ["stats"], categories: ["cards"],
      catalogue: ["limit"], spotlight: ["actionLabel", "addedLabel", "skuPrefix"],
      company: ["gallery", "facts", "secondaryAction"], customization: ["video", "steps"],
      certifications: ["certificates"], inquiry: ["secondaryAction"],
    },
  },
  about: {
    label: "About",
    sections: {
      hero: ["secondaryAction"], stats: ["stats"], story: [], history: ["timeline"],
      capabilities: ["capabilities"], presentation: ["panels"], gallery: ["gallery"], contact: ["contacts"],
    },
  },
  customization: {
    label: "Customization",
    sections: {
      hero: [], brief: ["items"], process: ["steps"], reference: ["panels"],
      "process-media": ["videos"], assurance: ["checklist", "secondaryAction"], contact: [],
    },
  },
  certifications: {
    label: "Certifications",
    sections: { hero: [], summary: ["areas"], evidence: ["panels"], library: ["certificates"], contact: [] },
  },
  "after-sales": {
    label: "After-sales",
    sections: { hero: [], commitment: [], "product-review": [], production: [], shipping: [], resolution: [], evidence: ["media"] },
  },
  privacy: {
    label: "Privacy policy",
    sections: { hero: [], commitment: [], information: [], usage: [], protection: [], choices: [] },
  },
  returns: {
    label: "Returns policy",
    sections: { hero: [], commitment: [], window: [], exchanges: [], exclusions: [], refunds: [] },
  },
  "product-detail": {
    label: "Product detail",
    sections: {
      summary: ["backLabel", "backHref", "addLabel", "addedLabel", "saveLabel", "savedLabel", "specificationLabels"],
      care: [], editorial: ["groups"], related: [],
    },
  },
};

function schemaSignature(schema) {
  return JSON.stringify(schema);
}

function deriveDataShape(value) {
  if (Array.isArray(value)) {
    const variants = [];
    const signatures = new Set();
    for (const item of value) {
      const shape = deriveDataShape(item);
      const signature = schemaSignature(shape);
      if (!signatures.has(signature)) {
        signatures.add(signature);
        variants.push(shape);
      }
    }
    return { type: "array", variants };
  }
  if (value && typeof value === "object") {
    return {
      type: "object",
      fields: Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [key, deriveDataShape(nestedValue)])),
    };
  }
  return { type: typeof value };
}

const pageSectionDataShapes = Object.fromEntries(pageSectionFallbacks.map((section) => {
  const data = JSON.parse(section.dataJson);
  return [`${section.pageKey}.${section.sectionKey}`, Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, deriveDataShape(value)]),
  )];
}));

function matchesDataShape(value, shape) {
  if (shape.type === "array") {
    return Array.isArray(value) && (shape.variants.length === 0 || value.every((item) => shape.variants.some((variant) => matchesDataShape(item, variant))));
  }
  if (shape.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const expectedKeys = Object.keys(shape.fields);
    const actualKeys = Object.keys(value);
    return actualKeys.length === expectedKeys.length
      && expectedKeys.every((key) => Object.hasOwn(value, key) && matchesDataShape(value[key], shape.fields[key]));
  }
  return typeof value === shape.type;
}

function hasValidSectionDataShape(pageKey, sectionKey, value) {
  const shapes = pageSectionDataShapes[`${pageKey}.${sectionKey}`] ?? {};
  return Object.entries(value).every(([key, nestedValue]) => shapes[key] !== undefined && matchesDataShape(nestedValue, shapes[key]));
}

export function isSafeCmsUrl(value, { allowEmpty = true } = {}) {
  if (typeof value !== "string") return false;
  const candidate = value.trim();
  if (!candidate) return allowEmpty;
  if (candidate.includes("\\")) return false;
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return true;
  try {
    const url = new URL(candidate);
    return ["https:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export function isSafeMediaUrl(value, { allowEmpty = true } = {}) {
  if (typeof value !== "string") return false;
  const candidate = value.trim();
  if (!candidate) return allowEmpty;
  if (candidate.includes("\\")) return false;
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return true;
  try {
    return new URL(candidate).protocol === "https:";
  } catch {
    return false;
  }
}

export function validateSiteSettingInput(input) {
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid site setting" };
  const definition = siteSettingRegistry[input.key];
  if (!definition) return { ok: false, error: "Unknown site setting" };
  if (typeof input.value !== "string" || input.value.length > 20000) return { ok: false, error: "Invalid setting value" };
  if (definition.type === "url" && !isSafeCmsUrl(input.value)) {
    return { ok: false, error: "Invalid setting URL" };
  }
  if (definition.type === "image" && !isSafeMediaUrl(input.value)) return { ok: false, error: "Invalid setting media URL" };
  if (definition.type === "email" && input.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
    return { ok: false, error: "Invalid email address" };
  }
  return { ok: true, value: { key: input.key, value: input.value.trim(), type: definition.type, group: definition.group } };
}

export function validatePageSectionInput(input) {
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid page section" };
  const page = pageSectionRegistry[input.pageKey];
  const allowedDataKeys = page?.sections?.[input.sectionKey];
  if (!page || !allowedDataKeys) return { ok: false, error: "Unknown page section" };

  for (const field of ["eyebrow", "title", "body", "buttonLabel", "buttonHref", "mediaUrl", "mediaAlt", "dataJson"]) {
    if (input[field] !== undefined && typeof input[field] !== "string") return { ok: false, error: `Invalid ${field}` };
  }
  if (input.buttonHref !== undefined && !isSafeCmsUrl(input.buttonHref)) return { ok: false, error: "Invalid button URL" };
  if (input.mediaUrl !== undefined && !isSafeMediaUrl(input.mediaUrl)) return { ok: false, error: "Invalid media URL" };
  if (input.sortOrder !== undefined && (!Number.isInteger(input.sortOrder) || input.sortOrder < 0 || input.sortOrder > 10000)) {
    return { ok: false, error: "Invalid sort order" };
  }
  if (input.enabled !== undefined && typeof input.enabled !== "boolean") return { ok: false, error: "Invalid enabled value" };

  const value = { pageKey: input.pageKey, sectionKey: input.sectionKey };
  if (input.dataJson !== undefined) {
    let dataJson = input.dataJson;
    if (dataJson.length > 500000) return { ok: false, error: "结构化内容过大" };
    try {
      const parsed = JSON.parse(dataJson);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("object required");
      if (Object.keys(parsed).some((key) => !allowedDataKeys.includes(key))) return { ok: false, error: "结构化内容包含未知字段" };
      if (!hasValidSectionDataShape(input.pageKey, input.sectionKey, parsed)) return { ok: false, error: "结构化内容格式无效" };
      if (!hasSafeNestedUrls(parsed)) return { ok: false, error: "结构化内容包含无效地址" };
      value.dataJson = JSON.stringify(parsed);
    } catch {
      return { ok: false, error: "结构化内容必须是 JSON 对象" };
    }
  }
  for (const field of ["eyebrow", "title", "body", "buttonLabel", "buttonHref", "mediaUrl", "mediaAlt", "sortOrder", "enabled"]) {
    if (input[field] !== undefined) value[field] = typeof input[field] === "string" ? input[field].trim() : input[field];
  }
  return { ok: true, value };
}

function hasSafeNestedUrls(value) {
  if (Array.isArray(value)) return value.every(hasSafeNestedUrls);
  if (!value || typeof value !== "object") return true;
  return Object.entries(value).every(([key, nestedValue]) => {
    if (typeof nestedValue === "string" && /href$/i.test(key)) return isSafeCmsUrl(nestedValue);
    if (typeof nestedValue === "string" && /(?:image|src|poster|url)$/i.test(key)) {
      return isSafeMediaUrl(nestedValue);
    }
    return hasSafeNestedUrls(nestedValue);
  });
}

export function normalizePageOrder(pageKey, sectionKeys) {
  const registered = Object.keys(pageSectionRegistry[pageKey]?.sections ?? {});
  if (
    !Array.isArray(sectionKeys) || sectionKeys.length !== registered.length ||
    new Set(sectionKeys).size !== registered.length || sectionKeys.some((key) => !registered.includes(key))
  ) {
    throw new Error("Ordering requires the complete unique section list for one page");
  }
  return sectionKeys.map((sectionKey, index) => ({ sectionKey, sortOrder: index * 10 }));
}
