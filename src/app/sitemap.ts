import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getPublicSeoSettings } from "@/lib/public-seo";
import { buildSitemapUrls } from "@/lib/public-seo-core.mjs";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ siteUrl }, products, categories, posts] = await Promise.all([
    getPublicSeoSettings(),
    prisma.product.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.post.findMany({ select: { slug: true, updatedAt: true } }),
  ]);
  const staticPaths = ["/", "/products", "/about", "/customization", "/certifications", "/after-sales", "/policies/privacy", "/policies/returns", "/collections/womens-bags"];
  const paths = [...staticPaths, ...products.map((item) => `/products/${item.slug}`)];
  const updatedByUrl = new Map<string, Date>();
  products.forEach((item) => updatedByUrl.set(`/products/${item.slug}`, item.updatedAt));
  const contentUpdatedAt = [...categories, ...posts].reduce<Date | null>((latest, item) => !latest || item.updatedAt > latest ? item.updatedAt : latest, null);
  if (contentUpdatedAt) updatedByUrl.set("/products", contentUpdatedAt);
  return buildSitemapUrls(siteUrl, paths).map((url) => ({ url, lastModified: updatedByUrl.get(new URL(url).pathname) || new Date(), changeFrequency: "weekly", priority: new URL(url).pathname === "/" ? 1 : 0.7 }));
}
