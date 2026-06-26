import type { Metadata } from "next";
import { ProductListView } from "@/components/ProductListView";
import { getStoreProducts } from "@/lib/storefront-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Products | Muxcor Crimson Drop Luxury",
  description: "Shop Muxcor rings and necklaces in the Crimson Drop Luxury collection.",
};

type ProductsPageProps = {
  searchParams: Promise<{ category?: string; max?: string; min?: string; sort?: string }>;
};

function normalizeCategory(category?: string) {
  if (category === "necklaces") return "Necklaces";
  if (category === "rings") return "Rings";
  return "All";
}

function normalizeSort(sort?: string) {
  if (sort === "price-low") return "Price Low";
  if (sort === "price-high") return "Price High";
  return "Featured";
}

function normalizePrice(value?: string) {
  if (!value) return "";
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? String(price) : "";
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { category, max, min, sort } = await searchParams;
  const products = await getStoreProducts();
  return (
    <ProductListView
      initialCategory={normalizeCategory(category)}
      initialMaxPrice={normalizePrice(max)}
      initialMinPrice={normalizePrice(min)}
      initialSortMode={normalizeSort(sort)}
      products={products}
    />
  );
}
