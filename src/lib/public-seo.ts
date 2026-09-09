import type { Metadata } from "next";
import type { SeoTargetType } from "@/lib/cms-types";
import { getSiteSettings } from "@/lib/cms";
import { getSeoMeta } from "@/lib/seo";
import { buildCanonicalUrl, buildSeoFallback, isSafePublicUrl } from "@/lib/seo-core.mjs";

export type PublicSeoInput = {
  type: SeoTargetType;
  key: string;
  pathname: string;
  fallbackTitle: string;
  fallbackDescription: string;
  fallbackImage?: string;
  robots?: "index,follow" | "noindex,follow";
  canonicalUrl?: string;
};

async function settingsMap() {
  try {
    return Object.fromEntries((await getSiteSettings()).map((setting) => [setting.key, setting.value]));
  } catch {
    return {} as Record<string, string>;
  }
}

export async function getPublicSeoSettings() {
  const settings = await settingsMap();
  const configuredUrl = settings["seo.siteUrl"] || process.env.SITE_URL || "http://localhost:6661";
  let siteUrl = "http://localhost:6661";
  try {
    const parsed = new URL(configuredUrl);
    if (/^https?:$/.test(parsed.protocol)) siteUrl = parsed.origin;
  } catch {
    // Use the local development fallback.
  }
  return {
    siteName: settings["site.name"] || "Muxcor",
    siteTitle: settings["seo.siteTitle"] || "Muxcor | Jewelry Catalogue & Product Inquiry",
    defaultDescription: settings["seo.defaultDescription"] || "Explore Muxcor jewelry, bags and fashion accessories for wholesale, private-label and custom sourcing inquiries.",
    defaultKeywords: (settings["seo.defaultKeywords"] || "Muxcor, wholesale jewelry, custom jewelry").split(",").map((item) => item.trim()).filter(Boolean),
    siteUrl,
    defaultOgImage: settings["seo.defaultOgImage"] || "/company/showroom-display.webp",
    twitterHandle: settings["seo.twitterHandle"] || "",
  };
}

export async function buildPublicMetadata(input: PublicSeoInput): Promise<Metadata> {
  const [site, saved] = await Promise.all([getPublicSeoSettings(), getSeoMeta(input.type, input.key).catch(() => null)]);
  const fallback = buildSeoFallback({ name: input.fallbackTitle, description: input.fallbackDescription, image: input.fallbackImage || site.defaultOgImage });
  const title = saved?.title || fallback.title || site.siteTitle;
  const description = saved?.description || fallback.description || site.defaultDescription;
  const keywords = saved?.keywords.length ? saved.keywords : input.type === "SITE" ? site.defaultKeywords : fallback.keywords;
  const canonical = saved?.canonicalUrl || input.canonicalUrl || buildCanonicalUrl(site.siteUrl, input.pathname);
  const image = saved?.ogImage || input.fallbackImage || site.defaultOgImage;
  const imageUrl = image && isSafePublicUrl(image) ? new URL(image, `${site.siteUrl}/`).toString() : undefined;
  const robots = input.robots || saved?.robots || "index,follow";
  return {
    metadataBase: new URL(site.siteUrl),
    title,
    description,
    keywords,
    alternates: { canonical },
    robots: robots === "noindex,follow" ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { type: "website", siteName: site.siteName, url: canonical, title, description, images: imageUrl ? [{ url: imageUrl }] : undefined },
    twitter: { card: "summary_large_image", title, description, images: imageUrl ? [imageUrl] : undefined, creator: site.twitterHandle || undefined },
  };
}

export async function buildRootMetadata(): Promise<Metadata> {
  const site = await getPublicSeoSettings();
  return buildPublicMetadata({ type: "SITE", key: "site", pathname: "/", fallbackTitle: site.siteTitle, fallbackDescription: site.defaultDescription, fallbackImage: site.defaultOgImage });
}
