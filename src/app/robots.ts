import type { MetadataRoute } from "next";
import { getPublicSeoSettings } from "@/lib/public-seo";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { siteUrl } = await getPublicSeoSettings();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/account/", "/inquiry-cart"] },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
