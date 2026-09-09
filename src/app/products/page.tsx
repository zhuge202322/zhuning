import type { Metadata } from "next";
import { ProductListView } from "@/components/ProductListView";
import { getStoreCategoryTree, getStoreProducts } from "@/lib/storefront-data";
import { buildPublicMetadata, getPublicSeoSettings } from "@/lib/public-seo";
import { robotsForProductList } from "@/lib/public-seo-core.mjs";

export const dynamic = "force-dynamic";

type ProductsPageProps = {
  searchParams: Promise<{ category?: string; max?: string; min?: string; sort?: string; page?: string }>;
};

function findCategory(nodes: Awaited<ReturnType<typeof getStoreCategoryTree>>, slug?: string): (typeof nodes)[number] | null {
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const nested = findCategory(node.children, slug);
    if (nested) return nested;
  }
  return null;
}

export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const categories = await getStoreCategoryTree();
  const category = findCategory(categories, params.category);
  const site = await getPublicSeoSettings();
  const canonical = new URL("/products", site.siteUrl);
  if (category) canonical.searchParams.set("category", category.slug);
  return buildPublicMetadata({
    type: category ? "CATEGORY" : "PAGE",
    key: category?.slug || "products",
    pathname: "/products",
    canonicalUrl: canonical.toString(),
    robots: robotsForProductList(params),
    fallbackTitle: category ? `${category.name} | Muxcor Products` : "Products | Muxcor",
    fallbackDescription: category ? `Browse ${category.name} products from Muxcor and send an inquiry for pricing, customization and packing details.` : "Browse Muxcor jewelry, bags and fashion accessories and send a product inquiry.",
  });
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
  const { category, max, min, sort, page } = await searchParams;
  const [products, categories] = await Promise.all([getStoreProducts(), getStoreCategoryTree()]);
  return (
    <ProductListView
      initialCategorySlug={category || ""}
      initialMaxPrice={normalizePrice(max)}
      initialMinPrice={normalizePrice(min)}
      initialSortMode={normalizeSort(sort)}
      initialPage={page || "1"}
      products={products}
      categories={categories}
    />
  );
}
