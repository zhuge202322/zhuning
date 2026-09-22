import { LuxuryStorefront, type HeroSlide } from "@/components/LuxuryStorefront";
import { getFeaturedStoreProducts } from "@/lib/storefront-data";
import { getPageSection } from "@/lib/cms";
import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/public-seo";

export const dynamic = "force-dynamic";

function readHeroSlides(section: Awaited<ReturnType<typeof getPageSection>>): HeroSlide[] | undefined {
  if (!section) return undefined;
  try {
    const data: unknown = JSON.parse(section.dataJson);
    if (!data || typeof data !== "object" || !Array.isArray((data as { slides?: unknown }).slides)) return undefined;
    const slides = (data as { slides: unknown[] }).slides.filter((slide): slide is Record<string, unknown> => Boolean(slide) && typeof slide === "object" && !Array.isArray(slide));
    const normalized = slides.flatMap((slide) => {
      if (typeof slide.image !== "string" || !slide.image.trim()) return [];
      return [{
        image: slide.image,
        alt: typeof slide.alt === "string" ? slide.alt : "Muxcor jewelry collection",
        kicker: typeof slide.kicker === "string" ? slide.kicker : "Crimson Drop Luxury",
        title: typeof slide.title === "string" ? slide.title : "Jewelry categories, sourced with clarity.",
        copy: typeof slide.copy === "string" ? slide.copy : "Browse the Muxcor product catalogue.",
        imageMode: slide.imageMode === "poster" ? "poster" as const : "cover" as const,
      }];
    });
    if (!normalized.length) return undefined;
    const mediaOverride = section.mediaUrl.trim();
    return mediaOverride ? [{ ...normalized[0], image: mediaOverride }, ...normalized.slice(1)] : normalized;
  } catch {
    return undefined;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicMetadata({ type: "PAGE", key: "home", pathname: "/", fallbackTitle: "Muxcor Jewelry & Fashion Accessories", fallbackDescription: "Explore Muxcor jewelry, bags and fashion accessories for wholesale, private-label and custom sourcing inquiries.", fallbackImage: "/company/showroom-display.webp" });
}

export default async function Home() {
  const [products, heroSection, companySection, customizationSection] = await Promise.all([
    getFeaturedStoreProducts(),
    getPageSection("home", "hero"),
    getPageSection("home", "company"),
    getPageSection("home", "customization"),
  ]);
  return (
    <LuxuryStorefront
      products={products}
      heroSlides={readHeroSlides(heroSection)}
      sectionMedia={{ company: companySection?.mediaUrl, customization: customizationSection?.mediaUrl }}
    />
  );
}
