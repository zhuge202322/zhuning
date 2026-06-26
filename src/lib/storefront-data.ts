import { prisma } from "@/lib/prisma";

export type StoreProduct = {
  id: string;
  dbId: number;
  category: "Necklaces" | "Rings";
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
};

const fallbackByCategory = {
  Necklaces: "/products/ruby-oval-pendant-necklace.png",
  Rings: "/products/zircon-anniversary-ring.png",
};

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeCategory(product: any): "Necklaces" | "Rings" {
  const category = product.categories?.[0]?.name || product.sourceCategory || "";
  return /ring/i.test(category) ? "Rings" : "Necklaces";
}

export function formatStoreProduct(product: any): StoreProduct {
  const category = normalizeCategory(product);
  const images = product.images?.length
    ? product.images.map((image: any) => image.src)
    : [fallbackByCategory[category]];
  const price = Number(product.price || 0);

  return {
    id: product.slug,
    dbId: product.id,
    category,
    name: product.name,
    sku: product.sourceSku || product.skus?.[0]?.name || `MX-${product.id}`,
    material: product.material || "Jewelry alloy",
    price: price > 0 ? Math.round(price * 55) : 98,
    image: images[0],
    images,
    weight: product.weight ? `${product.weight}g`.replace(/gg$/i, "g") : "15g",
    packaging: product.packaging || "20cm x 16cm x 5cm",
    note:
      stripHtml(product.shortDescription || product.description || "") ||
      "A polished Muxcor jewelry piece selected for the Crimson Drop edit.",
    finish: product.material || "Polished finish",
    stones: product.stones || (category === "Rings" ? "Statement setting" : "Pearl and crystal accents"),
    collection: product.collection || (category === "Rings" ? "Obsidian Statement" : "Liquid Pearl Lines"),
  };
}

export async function getStoreProducts() {
  const products = await prisma.product.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      categories: true,
      skus: { include: { images: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  return products.map(formatStoreProduct);
}

export async function getFeaturedStoreProducts() {
  const products = await prisma.product.findMany({
    where: { featured: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    take: 8,
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      categories: true,
      skus: { include: { images: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (products.length) return products.map(formatStoreProduct);
  return (await getStoreProducts()).slice(0, 8);
}

export async function getStoreProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      categories: true,
      skus: { include: { images: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  return product ? formatStoreProduct(product) : null;
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
