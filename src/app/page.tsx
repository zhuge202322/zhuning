import { LuxuryStorefront } from "@/components/LuxuryStorefront";
import { getFeaturedStoreProducts } from "@/lib/storefront-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getFeaturedStoreProducts();
  return <LuxuryStorefront products={products} />;
}
