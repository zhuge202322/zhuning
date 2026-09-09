export function isSafePublicUrl(value, { allowEmpty = false } = {}) {
  if (typeof value !== "string") return false;
  const candidate = value.trim();
  if (!candidate) return allowEmpty;
  if (candidate.includes("\\") || candidate.startsWith("//")) return false;
  if (candidate.startsWith("/")) return true;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function buildCanonicalUrl(siteUrl, pathname) {
  let origin;
  try {
    const base = new URL(siteUrl);
    if (!/^https?:$/.test(base.protocol)) throw new Error("Invalid site URL");
    origin = base.origin;
  } catch {
    origin = "http://localhost:6661";
  }
  const rawPath = typeof pathname === "string" && pathname.startsWith("/") ? pathname : "/";
  const cleanPath = rawPath.split(/[?#]/, 1)[0].replace(/\/{2,}/g, "/") || "/";
  return new URL(cleanPath, `${origin}/`).toString().replace(/\/$/, cleanPath === "/" ? "/" : "");
}

function plainText(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(value, max) {
  if (value.length <= max) return value;
  const shortened = value.slice(0, max - 1);
  const lastSpace = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, lastSpace > max * 0.65 ? lastSpace : shortened.length).trim()}…`;
}

export function buildSeoFallback({ name, category = "", description = "", image = "" }) {
  const cleanName = plainText(name) || "Muxcor Jewelry";
  const cleanCategory = plainText(category);
  const sourceDescription = plainText(description) || `Explore ${cleanName}${cleanCategory ? ` in our ${cleanCategory} collection` : ""} from Muxcor.`;
  const keywords = [...new Set([cleanName.toLowerCase(), cleanCategory.toLowerCase(), "muxcor", "wholesale jewelry"].filter(Boolean))];
  return {
    title: truncate(`${cleanName} | Muxcor`, 70),
    description: truncate(sourceDescription, 170),
    keywords,
    canonicalUrl: "",
    ogImage: isSafePublicUrl(image, { allowEmpty: true }) ? image.trim() : "",
    robots: "index,follow",
  };
}

const TARGET_TYPES = ["SITE", "PAGE", "PRODUCT", "CATEGORY", "POST"];
const ROBOTS_VALUES = ["index,follow", "noindex,follow"];

export function validateSeoInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "SEO 数据格式无效" };
  const targetType = typeof input.targetType === "string" ? input.targetType : "";
  const targetKey = typeof input.targetKey === "string" ? input.targetKey.trim() : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const keywords = Array.isArray(input.keywords)
    ? input.keywords
    : typeof input.keywords === "string" ? input.keywords.split(",") : [];
  const normalizedKeywords = [...new Set(keywords.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
  const canonicalUrl = typeof input.canonicalUrl === "string" ? input.canonicalUrl.trim() : "";
  const ogImage = typeof input.ogImage === "string" ? input.ogImage.trim() : "";
  const robots = typeof input.robots === "string" ? input.robots : "index,follow";
  if (!TARGET_TYPES.includes(targetType)) return { ok: false, error: "SEO 内容类型无效" };
  if (!targetKey || targetKey.length > 200 || !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(targetKey)) return { ok: false, error: "SEO 内容标识无效" };
  if (title.length > 70) return { ok: false, error: "SEO 标题不能超过 70 个字符" };
  if (description.length > 170) return { ok: false, error: "SEO 描述不能超过 170 个字符" };
  if (normalizedKeywords.length > 12 || normalizedKeywords.some((item) => item.length > 80)) return { ok: false, error: "SEO 关键词无效" };
  if (canonicalUrl && !isSafePublicUrl(canonicalUrl)) return { ok: false, error: "Canonical 地址无效" };
  if (ogImage && !isSafePublicUrl(ogImage)) return { ok: false, error: "分享图片地址无效" };
  if (!ROBOTS_VALUES.includes(robots)) return { ok: false, error: "Robots 设置无效" };
  return { ok: true, value: { targetType, targetKey, title, description, keywords: normalizedKeywords, canonicalUrl, ogImage, robots } };
}
