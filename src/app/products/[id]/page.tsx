import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailView } from "@/components/ProductDetailView";
import {
  getRelatedStoreProducts,
  getStoreProductBySlug,
  getStoreProducts,
} from "@/lib/storefront-data";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getStoreProductBySlug(id);
  if (!product) return {};

  return {
    title: `${product.name} | Muxcor`,
    description: product.note,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const [product, products] = await Promise.all([getStoreProductBySlug(id), getStoreProducts()]);
  if (!product) notFound();

  return <ProductDetailView product={product} relatedProducts={getRelatedStoreProducts(product, products)} />;
}
