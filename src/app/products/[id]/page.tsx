import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailView } from "@/components/ProductDetailView";
import {
  getRelatedStoreProducts,
  getStoreProductBySlug,
  getStoreProducts,
} from "@/lib/storefront-data";
import { buildPublicMetadata, getPublicSeoSettings } from "@/lib/public-seo";
import { ProductJsonLd } from "@/components/ProductJsonLd";
import { buildCanonicalUrl } from "@/lib/seo-core.mjs";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getStoreProductBySlug(id);
  if (!product) return {};

  return buildPublicMetadata({ type: "PRODUCT", key: product.id, pathname: `/products/${product.id}`, fallbackTitle: product.name, fallbackDescription: product.note, fallbackImage: product.image });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const [product, products] = await Promise.all([getStoreProductBySlug(id), getStoreProducts()]);
  if (!product) notFound();

  const { siteUrl } = await getPublicSeoSettings();
  const canonicalUrl = buildCanonicalUrl(siteUrl, `/products/${product.id}`);
  return <><ProductJsonLd product={product} canonicalUrl={canonicalUrl} siteUrl={siteUrl} /><ProductDetailView product={product} relatedProducts={getRelatedStoreProducts(product, products)} /></>;
}
