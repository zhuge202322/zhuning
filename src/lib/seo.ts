import type { SeoTargetType } from "@/lib/cms-types";
import { prisma } from "@/lib/prisma";
import type { SeoDraft, SeoRecord, SeoTarget } from "@/lib/seo-types";
import { validateSeoInput } from "./seo-core.mjs";

const PAGE_LABELS: Record<string, string> = {
  home: "Home",
  products: "Products",
  about: "About Us",
  customization: "Customization",
  certifications: "Certifications",
  "after-sales": "After-sales",
  privacy: "Privacy Policy",
  returns: "Returns Policy",
  "product-detail": "Product Detail Template",
};

function formatRecord(row: { id: number; targetType: string; targetKey: string; title: string; description: string; keywords: string; canonicalUrl: string; ogImage: string; robots: string; updatedAt: Date }): SeoRecord {
  return {
    id: row.id,
    targetType: row.targetType as SeoTargetType,
    targetKey: row.targetKey,
    title: row.title,
    description: row.description,
    keywords: row.keywords.split(",").map((item) => item.trim()).filter(Boolean),
    canonicalUrl: row.canonicalUrl,
    ogImage: row.ogImage,
    robots: row.robots as SeoDraft["robots"],
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getSeoMeta(targetType: SeoTargetType, targetKey: string): Promise<SeoRecord | null> {
  const row = await prisma.seoMeta.findUnique({ where: { targetType_targetKey: { targetType, targetKey } } });
  return row ? formatRecord(row) : null;
}

export async function saveSeoMeta(input: unknown): Promise<SeoRecord> {
  const validation = validateSeoInput(input) as { ok: boolean; error?: string; value?: SeoDraft & { targetType: SeoTargetType; targetKey: string } };
  if (!validation.ok || !validation.value) throw new Error(validation.error || "SEO 数据无效");
  const { targetType, targetKey, keywords, ...fields } = validation.value;
  const target = await getSeoTarget(targetType, targetKey);
  if (!target) throw new Error("SEO 目标不存在");
  const row = await prisma.seoMeta.upsert({
    where: { targetType_targetKey: { targetType, targetKey } },
    update: { ...fields, keywords: keywords.join(", ") },
    create: { targetType, targetKey, ...fields, keywords: keywords.join(", ") },
  });
  return formatRecord(row);
}

export async function getSeoTarget(type: SeoTargetType, key: string): Promise<SeoTarget | null> {
  if (type === "PRODUCT") {
    const row = await prisma.product.findUnique({ where: { slug: key }, include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, categories: { take: 3 } } });
    return row ? { type, key: row.slug, label: row.name, description: row.shortDescription || row.description, category: row.categories.map((item) => item.name).join(" / "), image: row.images[0]?.src || "" } : null;
  }
  if (type === "CATEGORY") {
    const row = await prisma.category.findUnique({ where: { slug: key } });
    return row ? { type, key: row.slug, label: row.name, description: `${row.name} product collection from Muxcor.`, category: row.name, image: row.imageUrl || "" } : null;
  }
  if (type === "POST") {
    const row = await prisma.post.findUnique({ where: { slug: key } });
    return row ? { type, key: row.slug, label: row.title.replace(/<[^>]*>/g, " ").trim(), description: row.excerpt || row.content, category: "Insights", image: row.featuredImage || "" } : null;
  }
  if (type === "PAGE" && Object.hasOwn(PAGE_LABELS, key)) {
    const hero = await prisma.pageSection.findUnique({ where: { pageKey_sectionKey: { pageKey: key, sectionKey: "hero" } } });
    return { type, key, label: PAGE_LABELS[key] || key, description: hero?.body || hero?.title || `${PAGE_LABELS[key] || key} at Muxcor.`, category: "Website page", image: hero?.mediaUrl || "" };
  }
  if (type === "SITE" && key === "site") return { type, key, label: "Muxcor", description: "Muxcor jewelry catalogue and sourcing inquiry website.", category: "Website", image: "" };
  return null;
}

export async function getSeoTargets(type: SeoTargetType, search = ""): Promise<SeoTarget[]> {
  const query = search.trim().slice(0, 100);
  if (type === "PRODUCT") {
    const rows = await prisma.product.findMany({ where: query ? { name: { contains: query } } : undefined, orderBy: { id: "asc" }, take: 100, include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, categories: { take: 3 } } });
    return rows.map((row) => ({ type, key: row.slug, label: row.name, description: row.shortDescription || row.description, category: row.categories.map((item) => item.name).join(" / "), image: row.images[0]?.src || "" }));
  }
  if (type === "CATEGORY") {
    const rows = await prisma.category.findMany({ where: query ? { name: { contains: query } } : undefined, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 100 });
    return rows.map((row) => ({ type, key: row.slug, label: row.name, description: `${row.name} product collection from Muxcor.`, category: row.name, image: row.imageUrl || "" }));
  }
  if (type === "POST") {
    const rows = await prisma.post.findMany({ where: query ? { title: { contains: query } } : undefined, orderBy: { date: "desc" }, take: 100 });
    return rows.map((row) => ({ type, key: row.slug, label: row.title.replace(/<[^>]*>/g, " ").trim(), description: row.excerpt || row.content, category: "Insights", image: row.featuredImage || "" }));
  }
  if (type === "PAGE") return Object.keys(PAGE_LABELS).map((key) => ({ type, key, label: PAGE_LABELS[key] || key, description: `${PAGE_LABELS[key] || key} at Muxcor.`, category: "Website page", image: "" }));
  return type === "SITE" ? [{ type, key: "site", label: "Muxcor", description: "Muxcor website", category: "Website", image: "" }] : [];
}
