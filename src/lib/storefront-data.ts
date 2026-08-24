import { prisma } from "@/lib/prisma";
import fallbackSnapshot from "@/data/storefront-products.json";
import { buildStoreCategoryTree, formatStoreCategoryAssignments, type StoreCategoryAssignment, type StoreCategoryNode } from '@/lib/storefront-category';

export type StoreProduct = {
  id: string;
  dbId: number;
  category: "Necklaces" | "Rings" | "Jewelry Sets" | "Women's Bags";
  name: string;
  sku: string;
  material: string;
  price: number;
  image: string;
  images: string[];
  weight: string;
  packaging: string;
  note: string;
  finish: string;
  stones: string;
  collection: string;
  categoryAssignments: StoreCategoryAssignment[];
};

const fallbackByCategory = {
  Necklaces: "/products/ruby-oval-pendant-necklace.png",
  Rings: "/products/zircon-anniversary-ring.png",
  "Jewelry Sets": "/uploads/imported-products/6-16-1-id_3339c2ff20ed4c83841ac2c5b1f3f5da.webp",
  "Women's Bags": "/media/company-showroom.png",
};

const fallbackCategoryRows = [
  { id: 1, parentId: null, name: 'Necklaces', slug: 'necklaces', sortOrder: 0, productIds: [] as number[] },
  { id: 2, parentId: null, name: 'Rings', slug: 'rings', sortOrder: 1, productIds: [] as number[] },
  { id: 3, parentId: null, name: 'Jewelry Sets', slug: 'jewelry-sets', sortOrder: 2, productIds: [] as number[] },
  { id: 4, parentId: null, name: "Women's Bags", slug: 'womens-bags', sortOrder: 3, productIds: [] as number[] },
];

const fallbackStoreProducts = (fallbackSnapshot as Omit<StoreProduct, 'categoryAssignments'>[]).map((product) => {
  const fallbackCategory = fallbackCategoryRows.find((row) => row.name === product.category) || fallbackCategoryRows[0];
  fallbackCategory.productIds.push(product.dbId);
  return {
    ...product,
    categoryAssignments: [{ id: fallbackCategory.id, slug: fallbackCategory.slug, name: fallbackCategory.name, rootId: fallbackCategory.id, path: [fallbackCategory.name] }],
  };
});

const fallbackStoreCategoryTree = buildStoreCategoryTree(fallbackCategoryRows);

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeCategory(product: any): StoreProduct["category"] {
  const assignedCategory = product.categories?.[0]?.name;
  if (["Necklaces", "Rings", "Jewelry Sets", "Women's Bags"].includes(assignedCategory)) {
    return assignedCategory as StoreProduct["category"];
  }
  const category = [
    product.sourceCategory,
    product.name,
  ].filter(Boolean).join(" ");

  if (/handbag|women'?s bag|\bbag\b/i.test(category)) return "Women's Bags";
  if (/jewel(?:ry|lery) sets?|necklaces? for women set|\bsets?\b/i.test(category)) return "Jewelry Sets";
  if (/ring/i.test(category)) return "Rings";
  return "Necklaces";
}

export function formatStoreProduct(product: any, categoryRows: any[] = []): StoreProduct {
  const category = normalizeCategory(product);
  const images = product.images?.length
    ? product.images.map((image: any) => image.src)
    : [fallbackByCategory[category]];
  const price = Number(product.price || 0);
  const sku = product.sourceSku || product.skus?.[0]?.name || `MX-${product.id}`;
  const sourceNote = stripHtml(product.shortDescription || product.description || "");
  const note = /piece with .*cm/i.test(sourceNote)
    ? `${product.material || "Product"} item listed under source SKU ${sku}.`
    : sourceNote || `${product.material || "Product"} item listed under source SKU ${sku}.`;

  return {
    id: product.slug,
    dbId: product.id,
    category,
    name: product.name,
    sku,
    material: product.material || "Jewelry alloy",
    price: price > 0 ? Math.round(price * 100) / 100 : 0,
    image: images[0],
    images,
    weight: product.weight ? `${product.weight}g`.replace(/gg$/i, "g") : "15g",
    packaging: product.packaging || "Confirmed with quotation",
    note,
    finish: product.material || "Polished finish",
    stones: product.stones || (category === "Rings" ? "Statement setting" : "Pearl and crystal accents"),
    collection:
      product.collection ||
      (category === "Rings"
        ? "Rings"
        : category === "Jewelry Sets"
          ? "Jewelry Sets"
          : category === "Women's Bags"
            ? "Women's Bags"
            : "Necklaces"),
    categoryAssignments: formatStoreCategoryAssignments(categoryRows, (product.categories || []).map((item: any) => item.id)),
  };
}

async function loadCategoryRows() {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      parentId: true,
      name: true,
      slug: true,
      sortOrder: true,
      products: { select: { id: true } },
    },
  });
}

export async function getStoreCategoryTree(): Promise<StoreCategoryNode[]> {
  try {
    const rows = await loadCategoryRows();
    return buildStoreCategoryTree(rows.map((row) => ({ ...row, productIds: row.products.map((product) => product.id) })));
  } catch (error) {
    console.error('Failed to load store categories from database', error);
    return fallbackStoreCategoryTree;
  }
}

export async function getStoreProducts() {
  try {
    const [products, categoryRows] = await Promise.all([prisma.product.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        categories: true,
        skus: { include: { images: { orderBy: { sortOrder: "asc" } } } },
      },
    }), loadCategoryRows()]);
    return products.map((product) => formatStoreProduct(product, categoryRows));
  } catch (error) {
    console.error("Failed to load store products from database", error);
    return fallbackStoreProducts;
  }
}

export async function getFeaturedStoreProducts() {
  try {
    const [products, categoryRows] = await Promise.all([prisma.product.findMany({
      where: { featured: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      take: 8,
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        categories: true,
        skus: { include: { images: { orderBy: { sortOrder: "asc" } } } },
      },
    }), loadCategoryRows()]);
    if (products.length) return products.map((product) => formatStoreProduct(product, categoryRows));
    return (await getStoreProducts()).slice(0, 8);
  } catch (error) {
    console.error("Failed to load featured store products from database", error);
    return fallbackStoreProducts.slice(0, 8);
  }
}

export async function getStoreProductBySlug(slug: string) {
  try {
    const [product, categoryRows] = await Promise.all([prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        categories: true,
        skus: { include: { images: { orderBy: { sortOrder: "asc" } } } },
      },
    }), loadCategoryRows()]);
    return product ? formatStoreProduct(product, categoryRows) : null;
  } catch (error) {
    console.error("Failed to load store product from database", error);
    return fallbackStoreProducts.find((product) => product.id === slug) || null;
  }
}

export function getRelatedStoreProducts(product: StoreProduct, products: StoreProduct[]) {
  return products
    .filter((candidate) => candidate.category === product.category && candidate.id !== product.id)
    .slice(0, 3);
}

export const credentials = [
  "SGS tested",
  "ISO 9001 factory certification",
  "REACH nickel release, lead and cadmium reports",
  "GPSR EU responsible person support",
  "German Packaging Act documentation",
];
