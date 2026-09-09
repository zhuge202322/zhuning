import type { StoreProduct } from "@/lib/storefront-data";
import { buildProductJsonLd } from "@/lib/public-seo-core.mjs";

export function ProductJsonLd({ product, canonicalUrl, siteUrl }: { product: StoreProduct; canonicalUrl: string; siteUrl: string }) {
  const data = buildProductJsonLd(product, canonicalUrl, siteUrl);
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
