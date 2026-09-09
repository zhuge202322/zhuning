import { LuxuryStorefront } from "@/components/LuxuryStorefront";
import { getFeaturedStoreProducts } from "@/lib/storefront-data";
import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/public-seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicMetadata({ type: "PAGE", key: "home", pathname: "/", fallbackTitle: "Muxcor Jewelry & Fashion Accessories", fallbackDescription: "Explore Muxcor jewelry, bags and fashion accessories for wholesale, private-label and custom sourcing inquiries.", fallbackImage: "/company/showroom-display.webp" });
}

export default async function Home() {
  const products = await getFeaturedStoreProducts();
  return <LuxuryStorefront products={products} />;
}
