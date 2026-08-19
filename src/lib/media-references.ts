import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { containsMediaReference, replaceMediaReferenceUrl } from "@/lib/media-references-core.mjs";

const PRODUCT_TEXT_FIELDS = [
  "name", "slug", "shortDescription", "description", "material", "sourceSku", "sourceCategory", "weight", "packaging", "stones", "collection",
  "nameFr", "nameEs", "nameAr", "shortDescriptionFr", "shortDescriptionEs", "shortDescriptionAr", "descriptionFr", "descriptionEs", "descriptionAr",
  "specs", "specsFr", "specsEs", "specsAr", "formula", "formulaFr", "formulaEs", "formulaAr",
] as const;

const POST_TEXT_FIELDS = [
  "title", "slug", "excerpt", "content", "authorName", "titleFr", "titleEs", "titleAr",
  "excerptFr", "excerptEs", "excerptAr", "contentFr", "contentEs", "contentAr",
] as const;

export type MediaReference = {
  type: string;
  id: number;
  field: string;
  label: string;
};

function containsUrl(value: unknown, url: string): boolean {
  if (typeof value === "string") return containsMediaReference(value, url);
  if (Array.isArray(value)) return value.some((item) => containsUrl(item, url));
  if (value && typeof value === "object") return Object.values(value).some((item) => containsUrl(item, url));
  return false;
}

function replaceUrl(value: unknown, oldUrl: string, newUrl: string): unknown {
  if (typeof value === "string") return replaceMediaReferenceUrl(value, oldUrl, newUrl);
  if (Array.isArray(value)) return value.map((item) => replaceUrl(item, oldUrl, newUrl));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceUrl(item, oldUrl, newUrl)]));
  return value;
}

function jsonContainsUrl(value: string, url: string) {
  try {
    return containsUrl(JSON.parse(value), url);
  } catch {
    return false;
  }
}

function textContainsWhere(fields: readonly string[], url: string) {
  return fields.map((field) => ({ [field]: { contains: url } }));
}

function richTextReferences(type: "Product" | "Post", row: Record<string, unknown>, fields: readonly string[], url: string, label: string) {
  return fields.flatMap((field) => typeof row[field] === "string" && containsMediaReference(row[field], url)
    ? [{ type, id: row.id as number, field, label }]
    : []);
}

function migratedTextData(row: Record<string, unknown>, fields: readonly string[], oldUrl: string, newUrl: string) {
  return Object.fromEntries(fields.flatMap((field) => {
    const value = row[field];
    if (typeof value !== "string" || !containsMediaReference(value, oldUrl)) return [];
    return [[field, replaceMediaReferenceUrl(value, oldUrl, newUrl)]];
  }));
}

export async function findMediaReferences(url: string, client: Prisma.TransactionClient | typeof prisma = prisma): Promise<MediaReference[]> {
  const [productImages, skuImages, skus, products, categories, posts, sections, settings, siteMedia, orderItems] = await Promise.all([
    client.productImage.findMany({ where: { src: { startsWith: url } }, select: { id: true, productId: true, src: true } }),
    client.productSkuImage.findMany({ where: { src: { startsWith: url } }, select: { id: true, skuId: true, src: true } }),
    client.productSku.findMany({ where: { image: { startsWith: url } }, select: { id: true, name: true, image: true } }),
    client.product.findMany({ where: { OR: [{ specsPdf: { startsWith: url } }, { formulaPdf: { startsWith: url } }, ...textContainsWhere(PRODUCT_TEXT_FIELDS, url)] } as Prisma.ProductWhereInput }),
    client.category.findMany({ where: { imageUrl: { startsWith: url } }, select: { id: true, name: true, imageUrl: true } }),
    client.post.findMany({ where: { OR: [{ featuredImage: { startsWith: url } }, ...textContainsWhere(POST_TEXT_FIELDS, url)] } as Prisma.PostWhereInput }),
    client.pageSection.findMany({ where: { OR: [{ mediaUrl: { startsWith: url } }, { dataJson: { contains: url } }] }, select: { id: true, pageKey: true, sectionKey: true, mediaUrl: true, dataJson: true } }),
    client.siteSetting.findMany({ where: { value: { startsWith: url } }, select: { id: true, key: true, type: true, value: true } }),
    client.siteMedia.findMany({ where: { url: { startsWith: url } }, select: { id: true, key: true, label: true, url: true } }),
    client.orderItem.findMany({ where: { image: { startsWith: url } }, select: { id: true, productName: true, image: true } }),
  ]);

  return [
    ...productImages.filter((row) => containsMediaReference(row.src, url)).map((row) => ({ type: "ProductImage", id: row.id, field: "src", label: `Product #${row.productId}` })),
    ...skuImages.filter((row) => containsMediaReference(row.src, url)).map((row) => ({ type: "ProductSkuImage", id: row.id, field: "src", label: `SKU #${row.skuId}` })),
    ...skus.filter((row) => containsMediaReference(row.image, url)).map((row) => ({ type: "ProductSku", id: row.id, field: "image", label: row.name })),
    ...products.flatMap((row) => [
      ...(row.specsPdf && containsMediaReference(row.specsPdf, url) ? [{ type: "Product", id: row.id, field: "specsPdf", label: row.name }] : []),
      ...(row.formulaPdf && containsMediaReference(row.formulaPdf, url) ? [{ type: "Product", id: row.id, field: "formulaPdf", label: row.name }] : []),
      ...richTextReferences("Product", row as unknown as Record<string, unknown>, PRODUCT_TEXT_FIELDS, url, row.name),
    ]),
    ...categories.filter((row) => row.imageUrl && containsMediaReference(row.imageUrl, url)).map((row) => ({ type: "Category", id: row.id, field: "imageUrl", label: row.name })),
    ...posts.flatMap((row) => [
      ...(row.featuredImage && containsMediaReference(row.featuredImage, url) ? [{ type: "Post", id: row.id, field: "featuredImage", label: row.title }] : []),
      ...richTextReferences("Post", row as unknown as Record<string, unknown>, POST_TEXT_FIELDS, url, row.title),
    ]),
    ...sections.flatMap((row) => [
      ...(containsMediaReference(row.mediaUrl, url) ? [{ type: "PageSection", id: row.id, field: "mediaUrl", label: `${row.pageKey}.${row.sectionKey}` }] : []),
      ...(jsonContainsUrl(row.dataJson, url) ? [{ type: "PageSection", id: row.id, field: "dataJson", label: `${row.pageKey}.${row.sectionKey}` }] : []),
    ]),
    ...settings.filter((row) => (row.type === "image" || row.type === "url") && containsMediaReference(row.value, url)).map((row) => ({ type: "SiteSetting", id: row.id, field: "value", label: row.key })),
    ...siteMedia.filter((row) => containsMediaReference(row.url, url)).map((row) => ({ type: "SiteMedia", id: row.id, field: "url", label: row.label || row.key })),
    ...orderItems.filter((row) => containsMediaReference(row.image, url)).map((row) => ({ type: "OrderItem", id: row.id, field: "image", label: row.productName })),
  ];
}

export async function migrateMediaReferences(client: Prisma.TransactionClient, oldUrl: string, newUrl: string) {
  const [products, posts, sections] = await Promise.all([
    client.product.findMany({ where: { OR: textContainsWhere(PRODUCT_TEXT_FIELDS, oldUrl) } as Prisma.ProductWhereInput }),
    client.post.findMany({ where: { OR: textContainsWhere(POST_TEXT_FIELDS, oldUrl) } as Prisma.PostWhereInput }),
    client.pageSection.findMany({
      where: { OR: [{ mediaUrl: oldUrl }, { dataJson: { contains: oldUrl } }] },
      select: { id: true, mediaUrl: true, dataJson: true },
    }),
  ]);
  await Promise.all([
    client.productImage.updateMany({ where: { src: oldUrl }, data: { src: newUrl } }),
    client.productSkuImage.updateMany({ where: { src: oldUrl }, data: { src: newUrl } }),
    client.productSku.updateMany({ where: { image: oldUrl }, data: { image: newUrl } }),
    client.product.updateMany({ where: { specsPdf: oldUrl }, data: { specsPdf: newUrl } }),
    client.product.updateMany({ where: { formulaPdf: oldUrl }, data: { formulaPdf: newUrl } }),
    client.category.updateMany({ where: { imageUrl: oldUrl }, data: { imageUrl: newUrl } }),
    client.post.updateMany({ where: { featuredImage: oldUrl }, data: { featuredImage: newUrl } }),
    client.siteSetting.updateMany({ where: { value: oldUrl, type: { in: ["image", "url"] } }, data: { value: newUrl } }),
    client.siteMedia.updateMany({ where: { url: oldUrl }, data: { url: newUrl } }),
    client.orderItem.updateMany({ where: { image: oldUrl }, data: { image: newUrl } }),
    ...products.flatMap((product) => {
      const data = migratedTextData(product as unknown as Record<string, unknown>, PRODUCT_TEXT_FIELDS, oldUrl, newUrl);
      return Object.keys(data).length ? [client.product.update({ where: { id: product.id }, data: data as Prisma.ProductUpdateInput })] : [];
    }),
    ...posts.flatMap((post) => {
      const data = migratedTextData(post as unknown as Record<string, unknown>, POST_TEXT_FIELDS, oldUrl, newUrl);
      return Object.keys(data).length ? [client.post.update({ where: { id: post.id }, data: data as Prisma.PostUpdateInput })] : [];
    }),
    ...sections.map((section) => {
      let dataJson = section.dataJson;
      if (jsonContainsUrl(dataJson, oldUrl)) dataJson = JSON.stringify(replaceUrl(JSON.parse(dataJson), oldUrl, newUrl));
      return client.pageSection.update({
        where: { id: section.id },
        data: { mediaUrl: section.mediaUrl === oldUrl ? newUrl : section.mediaUrl, dataJson },
      });
    }),
  ]);
}
