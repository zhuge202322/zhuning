"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, BadgeCheck, ChevronLeft, ChevronRight, ShieldCheck, Sparkles } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { ProductCard } from "@/components/ProductCard";
import type { StoreProduct } from "@/lib/storefront-data";

gsap.registerPlugin(ScrollTrigger);

const credentials = [
  "SGS tested",
  "ISO 9001 factory certification",
  "REACH nickel release, lead and cadmium reports",
  "GPSR EU responsible person support",
  "German Packaging Act documentation",
];

const heroSlides = [
  {
    image: "/products/ruby-oval-pendant-necklace.png",
    alt: "Ruby oval pendant necklace on a crimson luxury background",
    kicker: "Crimson Drop Luxury",
    title: "Rings and necklaces with a deep red signature.",
    copy: "Discover Muxcor jewelry pieces shaped for modern evening wardrobes: luminous pearls, sculptural rings, and crystal chokers from Guangzhou.",
  },
  {
    image: "/products/rhinestone-choker-necklace.png",
    alt: "Rhinestone choker necklace in evening light",
    kicker: "Evening necklaces",
    title: "Crystal collars made for the first glance.",
    copy: "Layered shine, pearl softness, and formal silhouettes bring a polished finish to occasion dressing.",
  },
  {
    image: "/products/zircon-anniversary-ring.png",
    alt: "Crimson gemstone statement ring",
    kicker: "Statement rings",
    title: "Sculptural rings with a crimson pulse.",
    copy: "Bold stones, warm metal finishes, and confident profiles give every hand movement a jewel-box presence.",
  },
];

export function LuxuryStorefront({ products }: { products: StoreProduct[] }) {
  const [activeProduct, setActiveProduct] = useState<StoreProduct | null>(products[0] ?? null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedAdded, setSelectedAdded] = useState(false);
  const didMountSlide = useRef(false);
  const { addToCart } = useCart();
  const slide = heroSlides[activeSlide];
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

      gsap.to(".atelier-image", {
        yPercent: -10,
        ease: "none",
        scrollTrigger: {
          trigger: ".atelier-band",
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
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 5600);

    return () => window.clearInterval(timer);
  }, []);

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
    setActiveSlide((index + heroSlides.length) % heroSlides.length);
  }

  return (
    <>
      <section className="hero-section" aria-labelledby="hero-title">
        <Image
          className="hero-slide-image"
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
              Shop the edit <ArrowRight size={18} />
            </Link>
            <Link className="secondary-link" href="/policies/returns">
              View commitments
            </Link>
          </div>
        </div>

        <div className="hero-controls" aria-label="Hero carousel controls">
          <button type="button" aria-label="Previous hero image" onClick={() => goToSlide(activeSlide - 1)}>
            <ChevronLeft size={20} />
          </button>
          <div className="hero-dots" role="tablist" aria-label="Hero images">
            {heroSlides.map((item, index) => (
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
        <span>200+ global brand partners</span>
        <span>Certified material testing</span>
        <span>Flexible jewelry customization</span>
        <span>Private client shopping experience</span>
      </section>

      <section id="collections" className="collection-band reveal">
        <div>
          <p className="section-kicker">Editorial collections</p>
          <h2>Two high-jewelry moods, one crimson house code.</h2>
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
        </div>
      </section>

      <section id="products" className="product-section reveal" aria-labelledby="products-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Shop the edit</p>
            <h2 id="products-title">Featured rings and necklaces</h2>
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
            <span>{activeProduct.weight}</span>
            <span>{activeProduct.packaging}</span>
          </div>
          <button
            type="button"
            className={`primary-link ${selectedAdded ? "is-added" : ""}`}
            onClick={addSelectedProduct}
          >
            {selectedAdded ? "Added to bag" : "Add selected piece"} <ArrowRight size={18} />
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

      <section id="craft" className="atelier-band reveal">
        <div className="atelier-copy">
          <p className="section-kicker">The Muxcor atelier</p>
          <h2>Designed for polished consumer storytelling, backed by manufacturing depth.</h2>
          <p>
            Guangzhou Muxcor International Co., Ltd. supports jewelry lines with
            trend-forward design, flexible customization, certified materials,
            and one-stop production service for rings, necklaces, bracelets,
            earrings, and jewelry sets.
          </p>
          <div className="atelier-stats">
            <div>
              <strong>200+</strong>
              <span>Global brand partners</span>
            </div>
            <div>
              <strong>6 pcs</strong>
              <span>Flexible sample MOQ reference</span>
            </div>
            <div>
              <strong>5 cm</strong>
              <span>Gift-ready box depth</span>
            </div>
          </div>
        </div>
        <div className="atelier-visual" aria-hidden="true">
          <Image
            className="atelier-image"
            src="/products/pearl-layered-necklace.png"
            alt=""
            width={620}
            height={620}
          />
        </div>
      </section>

      <section id="certifications" className="certification-band reveal">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Compliance confidence</p>
            <h2>Credentials ready for global jewelry shoppers.</h2>
          </div>
          <ShieldCheck size={42} aria-hidden="true" />
        </div>
        <div className="credential-grid">
          {credentials.map((credential) => (
            <div className="credential-item" key={credential}>
              <BadgeCheck size={21} />
              <span>{credential}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="membership-band reveal" aria-label="Newsletter signup">
        <Sparkles size={26} aria-hidden="true" />
        <h2>Join the crimson list</h2>
        <p>
          Receive new ring and necklace drops, private styling notes, and early
          access to limited production runs.
        </p>
        <form className="signup-form">
          <label htmlFor="email">Email address</label>
          <div>
            <input id="email" type="email" placeholder="client@example.com" />
            <button type="submit">Notify me</button>
          </div>
        </form>
      </section>
    </>
  );
}
