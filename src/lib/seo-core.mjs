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
