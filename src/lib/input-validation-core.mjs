import { isSafeCmsUrl, isSafeMediaUrl } from "./cms-registry-core.mjs";

export const ORDER_TYPES = ["INQUIRY", "FORMAL"];
export const ORDER_STATUSES = ["PENDING_INQUIRY", "CONTACTED", "QUOTED", "CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"];
export const ALLOWED_UPLOAD_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "application/pdf"];
export const UPLOAD_EXTENSIONS = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "video/mp4": ".mp4", "application/pdf": ".pdf" };

export function parsePositiveId(value) {
  const id = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return Number.isInteger(id) && Number(id) > 0 ? Number(id) : null;
}

export function isValidSlug(value) {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 160;
}

export function isAllowedUrl(value, allowEmpty = true) {
  return typeof value === "string" && isSafeCmsUrl(value, { allowEmpty });
}

export function isOneOf(value, allowed) {
  return typeof value === "string" && allowed.includes(value);
}

function validOptionalMedia(value) {
  return value === undefined || value === null || isSafeMediaUrl(value);
}

function validImageItem(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    && isSafeMediaUrl(value.src, { allowEmpty: false })
    && (value.alt === undefined || typeof value.alt === "string");
}

function validSkuImage(value) {
  return typeof value === "string"
    ? isSafeMediaUrl(value, { allowEmpty: false })
    : validImageItem(value);
}

const PRODUCT_TEXT_FIELDS = [
  "name", "shortDescription", "description", "material", "sourceSku", "sourceCategory", "weight", "packaging", "stones", "collection",
  "nameFr", "nameEs", "nameAr", "shortDescriptionFr", "shortDescriptionEs", "shortDescriptionAr", "descriptionFr", "descriptionEs", "descriptionAr",
  "specs", "specsFr", "specsEs", "specsAr", "formula", "formulaFr", "formulaEs", "formulaAr",
];
const CATEGORY_TEXT_FIELDS = ["name", "nameFr", "nameEs", "nameAr"];
const POST_TEXT_FIELDS = ["title", "excerpt", "content", "authorName", "titleFr", "titleEs", "titleAr", "excerptFr", "excerptEs", "excerptAr", "contentFr", "contentEs", "contentAr"];

function validateStringFields(input, fields, maxLength = 500000) {
  for (const field of fields) {
    if (input[field] !== undefined && (typeof input[field] !== "string" || input[field].length > maxLength)) return `Invalid ${field}`;
  }
  return null;
}

function validSortOrder(value) {
  return Number.isInteger(value) && value >= 0 && value <= 1_000_000;
}

function validDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return false;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return false;
  const dateOnly = value.slice(0, 10);
  return new Date(`${dateOnly}T00:00:00.000Z`).toISOString().slice(0, 10) === dateOnly;
}

export function validateCategoryInput(input, mode = "create") {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "Invalid category data" };
  if (mode === "create" && (typeof input.name !== "string" || !input.name.trim() || !isValidSlug(input.slug))) return { ok: false, error: "Valid name and slug required" };
  if (input.name !== undefined && (typeof input.name !== "string" || !input.name.trim())) return { ok: false, error: "Invalid name" };
  if (input.slug !== undefined && !isValidSlug(input.slug)) return { ok: false, error: "Invalid slug" };
  const stringError = validateStringFields(input, CATEGORY_TEXT_FIELDS, 20000);
  if (stringError) return { ok: false, error: stringError };
  if (!validOptionalMedia(input.imageUrl)) return { ok: false, error: "Invalid category media URL" };
  if (input.sortOrder !== undefined && !validSortOrder(input.sortOrder)) return { ok: false, error: "Invalid sortOrder" };
  return { ok: true, value: input };
}

export function validatePostInput(input, mode = "create") {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "Invalid post data" };
  if (mode === "create" && (typeof input.title !== "string" || !input.title.trim() || !isValidSlug(input.slug))) return { ok: false, error: "Valid title and slug required" };
  if (input.title !== undefined && (typeof input.title !== "string" || !input.title.trim())) return { ok: false, error: "Invalid title" };
  if (input.slug !== undefined && !isValidSlug(input.slug)) return { ok: false, error: "Invalid slug" };
  const stringError = validateStringFields(input, POST_TEXT_FIELDS);
  if (stringError) return { ok: false, error: stringError };
  if (!validOptionalMedia(input.featuredImage)) return { ok: false, error: "Invalid featured image URL" };
  if (input.date !== undefined && !validDateString(input.date)) {
    return { ok: false, error: "Invalid post date" };
  }
  return { ok: true, value: input };
}

export function validateProductInput(input, mode = "create") {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "Invalid product data" };
  if (mode === "create" && (typeof input.name !== "string" || !input.name.trim() || !isValidSlug(input.slug))) return { ok: false, error: "Valid name and slug required" };
  if (input.name !== undefined && (typeof input.name !== "string" || !input.name.trim())) return { ok: false, error: "Invalid name" };
  if (input.slug !== undefined && !isValidSlug(input.slug)) return { ok: false, error: "Invalid slug" };
  const stringError = validateStringFields(input, PRODUCT_TEXT_FIELDS);
  if (stringError) return { ok: false, error: stringError };
  if (input.featured !== undefined && typeof input.featured !== "boolean") return { ok: false, error: "Invalid featured" };
  if (input.sortOrder !== undefined && !validSortOrder(input.sortOrder)) return { ok: false, error: "Invalid sortOrder" };
  if (input.price !== undefined && input.price !== null && (typeof input.price !== "number" || !Number.isFinite(input.price) || input.price < 0)) {
    return { ok: false, error: "Invalid price" };
  }
  if (input.categoryIds !== undefined) {
    if (!Array.isArray(input.categoryIds) || input.categoryIds.some((id) => !Number.isInteger(id) || id <= 0) || new Set(input.categoryIds).size !== input.categoryIds.length) {
      return { ok: false, error: "Invalid product categories" };
    }
  }
  if (input.images !== undefined && (!Array.isArray(input.images) || !input.images.every(validImageItem))) {
    return { ok: false, error: "Invalid product images" };
  }
  if (input.skus !== undefined) {
    if (!Array.isArray(input.skus)) return { ok: false, error: "Invalid product SKUs" };
    for (const sku of input.skus) {
      if (!sku || typeof sku !== "object" || Array.isArray(sku) || typeof sku.name !== "string" || !sku.name.trim()) return { ok: false, error: "Invalid product SKU" };
      for (const field of ["nameFr", "nameEs", "nameAr", "price", "size"]) {
        if (sku[field] !== undefined && typeof sku[field] !== "string") return { ok: false, error: "Invalid product SKU" };
      }
      if (sku.image !== undefined && !isSafeMediaUrl(sku.image)) return { ok: false, error: "Invalid SKU media URL" };
      if (sku.images !== undefined && (!Array.isArray(sku.images) || !sku.images.every(validSkuImage))) return { ok: false, error: "Invalid SKU images" };
    }
  }
  for (const field of ["specsPdf", "formulaPdf"]) {
    if (!validOptionalMedia(input[field])) return { ok: false, error: `Invalid ${field} URL` };
  }
  return { ok: true, value: input };
}

export function validateOrderFields(input) {
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid order data" };
  if (input.orderType !== undefined && !ORDER_TYPES.includes(input.orderType)) return { ok: false, error: "Invalid order type" };
  if (input.status !== undefined && !ORDER_STATUSES.includes(input.status)) return { ok: false, error: "Invalid order status" };
  for (const field of ["paymentStatus", "fulfillmentStatus", "shippingRecipient", "shippingPhone", "shippingCountry", "shippingAddressLine1", "shippingAddressLine2", "shippingPostalCode", "paymentMethod", "paymentReference", "shippingCarrier", "trackingNumber", "notes"]) {
    if (input[field] !== undefined && (typeof input[field] !== "string" || input[field].length > 10000)) {
      return { ok: false, error: `Invalid ${field}` };
    }
  }
  return { ok: true };
}

export function validateUploadMetadata(input) {
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid upload metadata" };
  if (typeof input.originalName !== "string" || !input.originalName || input.originalName.length > 255 || /[\\/]/.test(input.originalName) || input.originalName.includes("..")) {
    return { ok: false, error: "Invalid upload filename" };
  }
  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(input.mimeType)) return { ok: false, error: "Unsupported upload type" };
  const originalExtension = input.originalName.includes(".") ? `.${input.originalName.split(".").pop().toLowerCase()}` : "";
  const allowedExtensions = input.mimeType === "image/jpeg" ? [".jpg", ".jpeg"] : [UPLOAD_EXTENSIONS[input.mimeType]];
  if (!allowedExtensions.includes(originalExtension)) return { ok: false, error: "Upload extension does not match its type" };
  const maxBytes = input.mimeType === "video/mp4" ? 200 * 1024 * 1024 : 20 * 1024 * 1024;
  if (!Number.isInteger(input.byteSize) || input.byteSize <= 0 || input.byteSize > maxBytes) return { ok: false, error: "Invalid upload size" };
  return { ok: true };
}

export function uploadExtensionForMime(mimeType) {
  return UPLOAD_EXTENSIONS[mimeType] || null;
}
