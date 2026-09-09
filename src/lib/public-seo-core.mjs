import { buildCanonicalUrl } from "./seo-core.mjs";

function absoluteAsset(siteUrl, value) {
  if (!value) return "";
  try {
    return new URL(value, `${new URL(siteUrl).origin}/`).toString();
  } catch {
    return "";
  }
}

export function buildProductJsonLd(product, canonicalUrl, siteUrl) {
  const images = (Array.isArray(product.images) ? product.images : []).map((item) => absoluteAsset(siteUrl, item)).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: String(product.name || ""),
    description: String(product.note || ""),
    sku: String(product.sku || ""),
    image: images,
    brand: { "@type": "Brand", name: "Muxcor" },
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "USD",
      price: Number(product.price || 0).toFixed(2),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

export function robotsForProductList(params) {
  return params?.min || params?.max || params?.sort || (params?.page && params.page !== "1") ? "noindex,follow" : "index,follow";
}

export function buildSitemapUrls(siteUrl, paths) {
  const privatePrefixes = ["/admin", "/api", "/account", "/inquiry-cart"];
  return [...new Set(paths.filter((path) => typeof path === "string")
    .filter((path) => !path.includes("?") && !path.includes("#"))
    .filter((path) => !privatePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)))
    .map((path) => buildCanonicalUrl(siteUrl, path)))];
}
