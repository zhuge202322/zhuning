"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, ChevronLeft, ChevronRight, FileCheck2, Play, Sparkles } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { ProductCard } from "@/components/ProductCard";
import { certificates, companyStats } from "@/data/company";
import type { StoreProduct } from "@/lib/storefront-data";

gsap.registerPlugin(ScrollTrigger);

export type HeroSlide = {
  image: string;
  alt: string;
  kicker: string;
  title: string;
  copy: string;
  imageMode: "cover" | "poster";
};

const defaultHeroSlides: HeroSlide[] = [
  {
    image: "/products/ruby-oval-pendant-necklace.png",
    alt: "Ruby oval pendant necklace on a crimson luxury background",
    kicker: "Crimson Drop Luxury",
    title: "Jewelry categories, sourced with clarity.",
    copy: "Browse the supplied catalogue for necklaces, rings, and coordinated jewelry sets, with original SKU titles and prices.",
    imageMode: "cover",
  },
  {
    image: "/company/manufacturing-capabilities.webp",
    alt: "Premium jewelry manufacturer promotional poster",
    kicker: "Product development",
    title: "From custom design to stable supply.",
    copy: "Review design direction, craftsmanship, and supply requirements with the Muxcor team before quotation.",
    imageMode: "poster",
  },
  {
    image: "/company/jewelry-studio.webp",
    alt: "Muxcor jewelry workshop in Guangzhou",
    kicker: "Company workshop",
    title: "See the real team behind the catalogue.",
    copy: "Our Guangzhou workspace supports product review, sample discussion, and jewelry production coordination.",
    imageMode: "cover",
  },
];

export function LuxuryStorefront({
  products,
  heroSlides,
  sectionMedia,
}: {
  products: StoreProduct[];
  heroSlides?: HeroSlide[];
  sectionMedia?: { company?: string; customization?: string };
}) {
  const [activeProduct, setActiveProduct] = useState<StoreProduct | null>(products[0] ?? null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedAdded, setSelectedAdded] = useState(false);
  const didMountSlide = useRef(false);
  const { addToCart } = useCart();
  const slides = heroSlides?.length ? heroSlides : defaultHeroSlides;
  const slide = slides[activeSlide % slides.length];
  const visibleProducts = products.slice(0, 8);

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((section) => {
        gsap.fromTo(section, {
          autoAlpha: 0,
          y: 20,
        }, {
          autoAlpha: 1,
          y: 0,
          duration: 0.62,
          ease: "power2.out",
          overwrite: "auto",
          scrollTrigger: {
            trigger: section,
            start: "top 86%",
            once: true,
            invalidateOnRefresh: true,
          },
        });
      });

      gsap.utils.toArray<HTMLElement>(".stagger-card").forEach((card) => {
        const index = Number(card.dataset.motionIndex || "0");

        gsap.fromTo(
          card,
          { autoAlpha: 0, y: 16 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.46,
            delay: Math.min(index % 8, 7) * 0.035,
            ease: "power2.out",
            overwrite: "auto",
            scrollTrigger: {
              trigger: card,
              start: "top 90%",
              once: true,
              invalidateOnRefresh: true,
            },
          },
        );
      });

      gsap.to(".home-company-primary img", {
        yPercent: -10,
        ease: "none",
        scrollTrigger: {
          trigger: ".home-company-story",
          start: "top bottom",
          end: "bottom top",
          scrub: 0.8,
        },
      });
    });

    return () => ctx.revert();
  }, []);

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    if (!didMountSlide.current) {
      didMountSlide.current = true;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-slide-image",
        { scale: 1.04, autoAlpha: 0 },
        { scale: 1, autoAlpha: 1, duration: 0.75, ease: "power3.out", overwrite: "auto" },
      );
      gsap.fromTo(
        ".hero-title, .hero-copy",
        { y: 18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.55, ease: "power2.out", stagger: 0.05, overwrite: "auto" },
      );
    });

    return () => ctx.revert();
  }, [activeSlide]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 5600);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    if (!selectedAdded) return;
    const timeout = window.setTimeout(() => setSelectedAdded(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [selectedAdded]);

  function addSelectedProduct() {
    if (!activeProduct) return;
    addToCart(activeProduct);
    setSelectedAdded(true);
  }

  function goToSlide(index: number) {
    setActiveSlide((index + slides.length) % slides.length);
  }

  return (
    <>
      <section className="hero-section" aria-labelledby="hero-title">
        <Image
          className={`hero-slide-image ${slide.imageMode === "poster" ? "is-poster" : ""}`}
          src={slide.image}
          alt={slide.alt}
          fill
          sizes="100vw"
          loading={activeSlide === 0 ? "eager" : "lazy"}
          preload={activeSlide === 0}
        />
        <div className="hero-scrim" aria-hidden="true" />
        <div className="hero-content">
          <p className="hero-kicker">{slide.kicker}</p>
          <h1 id="hero-title" className="hero-title">
            {slide.title}
          </h1>
          <p className="hero-copy">{slide.copy}</p>
          <div className="hero-actions">
            <Link className="primary-link" href="/products">
              Browse products <ArrowRight size={18} />
            </Link>
            <Link className="secondary-link" href="/about">
              About the company
            </Link>
          </div>
        </div>

        <div className="hero-controls" aria-label="Hero carousel controls">
          <button type="button" aria-label="Previous hero image" onClick={() => goToSlide(activeSlide - 1)}>
            <ChevronLeft size={20} />
          </button>
          <div className="hero-dots" role="tablist" aria-label="Hero images">
            {slides.map((item, index) => (
              <button
                type="button"
                key={item.image}
                className={activeSlide === index ? "active" : ""}
                aria-label={`Show ${item.kicker}`}
                aria-selected={activeSlide === index}
                role="tab"
                onClick={() => goToSlide(index)}
              />
            ))}
          </div>
          <button type="button" aria-label="Next hero image" onClick={() => goToSlide(activeSlide + 1)}>
            <ChevronRight size={20} />
          </button>
        </div>
      </section>

      <section className="proof-strip" aria-label="Store highlights">
        {companyStats.map((stat) => (
          <span key={stat.label}>
            <strong>{stat.value}</strong>
            <small>{stat.label}</small>
          </span>
        ))}
      </section>

      <section id="collections" className="collection-band reveal">
        <div>
          <p className="section-kicker">Product categories</p>
          <h2>A clear product framework for faster sourcing.</h2>
        </div>
        <div className="collection-grid">
          <article className="collection-panel necklace-panel">
            <span>Necklaces</span>
            <h3>Liquid Pearl Lines</h3>
            <p>
              Layered pearl chains, gold finishes, and crystal light for formal
              wardrobes.
            </p>
            <Link href="/products?category=necklaces">Explore necklaces</Link>
          </article>
          <article className="collection-panel ring-panel">
            <span>Rings</span>
            <h3>Obsidian Statement</h3>
            <p>
              Sculpted bands, oversized gemstones, and red-black accents for
              confident styling.
            </p>
            <Link href="/products?category=rings">Explore rings</Link>
          </article>
          <article className="collection-panel set-panel">
            <span>Jewelry sets</span>
            <h3>Coordinated Sets</h3>
            <p>Matching necklace, earring, ring, and bracelet combinations from the supplied catalogue.</p>
            <Link href="/products?category=jewelry-sets">Explore jewelry sets</Link>
          </article>
        </div>
      </section>

      <section id="products" className="product-section reveal" aria-labelledby="products-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Current catalogue</p>
            <h2 id="products-title">Featured products from the supplied files</h2>
          </div>
          <Link className="secondary-link" href="/products">
            View all products
          </Link>
        </div>

        <div className="product-grid">
          {visibleProducts.map((product, index) => (
            <div key={product.id} onMouseEnter={() => setActiveProduct(product)}>
              <ProductCard product={product} motionIndex={index} />
            </div>
          ))}
        </div>
      </section>

      {activeProduct ? (
      <section className="spotlight-band reveal" aria-label="Selected product detail">
        <div className="spotlight-copy">
          <p className="section-kicker">Quick view</p>
          <h2>{activeProduct.name}</h2>
          <p>{activeProduct.note}</p>
          <div className="detail-list">
            <span>{activeProduct.material}</span>
            <span>{activeProduct.category}</span>
            <span>SKU {activeProduct.sku}</span>
          </div>
          <button
            type="button"
            className={`primary-link ${selectedAdded ? "is-added" : ""}`}
            onClick={addSelectedProduct}
          >
            {selectedAdded ? "Added to inquiry cart" : "Add to inquiry cart"} <ArrowRight size={18} />
          </button>
        </div>
        <div className="spotlight-image-frame">
          <Image
            src={activeProduct.image}
            alt={activeProduct.name}
            width={560}
            height={560}
            loading="eager"
          />
        </div>
      </section>
      ) : null}

      <section id="craft" className="home-company-story reveal">
        <div className="home-company-gallery" aria-label="Muxcor workplace">
          <figure className="home-company-primary">
            <Image src={sectionMedia?.company || "/company/showroom-display.webp"} alt="Muxcor jewelry showroom display" fill sizes="(max-width: 860px) 100vw, 48vw" />
          </figure>
          <figure>
            <Image src="/company/production-machines.webp" alt="Muxcor production equipment" fill sizes="(max-width: 860px) 50vw, 24vw" />
          </figure>
          <figure>
            <Image src="/company/jewelry-studio.webp" alt="Muxcor jewelry development studio" fill sizes="(max-width: 860px) 50vw, 24vw" />
          </figure>
        </div>
        <div className="home-company-copy">
          <p className="section-kicker">Inside Muxcor</p>
          <h2>A real Guangzhou team behind every product discussion.</h2>
          <p>
            Founded in 2007, Muxcor supports catalogue sourcing, samples, OEM and ODM development,
            production coordination, packing, and export delivery through one team.
          </p>
          <dl>
            <div><dt>Product scope</dt><dd>Jewelry and fashion accessories</dd></div>
            <div><dt>Materials</dt><dd>Steel, alloy, copper, pearl, plated finishes</dd></div>
            <div><dt>Project support</dt><dd>Mixed wholesale, OEM, ODM, and samples</dd></div>
          </dl>
          <div className="company-actions">
            <Link className="primary-link" href="/about">Meet the company <ArrowRight size={18} /></Link>
            <Link className="secondary-link" href="/customization">Customization process</Link>
          </div>
        </div>
      </section>

      <section className="home-customization reveal">
        <div className="home-process-video">
          <video controls playsInline preload="metadata" poster={sectionMedia?.customization || "/company/custom-made.webp"}>
            <source src="/company/craft-process-1.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="home-process-copy">
          <p className="section-kicker">Custom jewelry</p>
          <h2>See how a design moves toward production.</h2>
          <p>Review the brief, develop the design, approve the sample, then coordinate crafting, finishing, packing, and delivery.</p>
          <div className="home-process-steps" aria-label="Customization steps">
            <span>01 Brief</span>
            <span>02 CAD</span>
            <span>03 Sample</span>
            <span>04 Production</span>
          </div>
          <Link className="primary-link" href="/customization">
            Explore the full process <Play size={17} />
          </Link>
        </div>
      </section>

      <section id="certifications" className="certification-band reveal">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Documented capabilities</p>
            <h2>Authentic certificates and representative test reports.</h2>
          </div>
          <Link className="secondary-link" href="/certifications">Open document library</Link>
        </div>
        <div className="home-cert-grid">
          {certificates.slice(0, 3).map((certificate) => (
            <Link href="/certifications" key={certificate.title}>
              <div className="home-cert-image">
                <Image src={certificate.image} alt={`${certificate.title} cover`} fill sizes="(max-width: 560px) 100vw, 30vw" />
              </div>
              <span>{certificate.category}</span>
              <strong>{certificate.title}</strong>
              <FileCheck2 size={18} />
            </Link>
          ))}
        </div>
      </section>

      <section className="membership-band reveal" aria-label="Product inquiry">
        <Sparkles size={26} aria-hidden="true" />
        <h2>Build a product inquiry</h2>
        <p>
          Add the SKUs you need, enter your contact details, and send the list to the team for follow-up.
        </p>
        <div className="membership-actions">
          <Link className="primary-link" href="/products">Choose products</Link>
          <Link className="secondary-link" href="/inquiry-cart">Open inquiry cart</Link>
        </div>
      </section>
    </>
  );
}
