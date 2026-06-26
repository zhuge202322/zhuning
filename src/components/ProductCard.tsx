"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/CartContext";
import type { StoreProduct } from "@/lib/storefront-data";

function getCompactProductName(product: StoreProduct) {
  const name = product.name.toLowerCase();

  if (product.category === "Rings") {
    if (name.includes("wedding")) return "Zircon Wedding Ring";
    if (name.includes("arabic")) return "Arabic Chunky Ring";
    if (name.includes("gemstone")) return "Gemstone Statement Ring";
    if (name.includes("obsidian")) return "Obsidian Statement Ring";
    if (name.includes("pink")) return "Pink Zircon Ring";
    if (name.includes("full diamond")) return "Full Zircon Ring";
    return "Sculptural Statement Ring";
  }

  if (name.includes("pearl") && name.includes("layer")) return "Layered Pearl Necklace";
  if (name.includes("pearl")) return "Pearl Strand Necklace";
  if (name.includes("choker")) return "Rhinestone Choker";
  if (name.includes("pendant")) return "Oval Pendant Necklace";
  if (name.includes("tennis")) return "Crystal Tennis Necklace";
  if (name.includes("flower")) return "Crystal Flower Necklace";
  return "Polished Chain Necklace";
}

export function ProductCard({ motionIndex = 0, product }: { motionIndex?: number; product: StoreProduct }) {
  const { addToCart, isWishlisted, toggleWishlist } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const displayName = getCompactProductName(product);
  const saved = isWishlisted(product.id);

  useEffect(() => {
    if (!justAdded) return;
    const timeout = window.setTimeout(() => setJustAdded(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [justAdded]);

  function handleAdd() {
    addToCart(product);
    setJustAdded(true);
  }

  function handleWishlist() {
    toggleWishlist(product);
  }

  return (
    <article className="product-card stagger-card" data-motion-index={motionIndex}>
      <button
        type="button"
        className={`favorite-button ${saved ? "active" : ""}`}
        aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name}`}
        aria-pressed={saved}
        onClick={handleWishlist}
      >
        <Heart size={18} fill={saved ? "currentColor" : "none"} />
      </button>
      <Link className="product-media" href={`/products/${product.id}`} aria-label={`View ${product.name}`}>
        <Image
          className="product-image"
          src={product.image}
          alt={product.name}
          width={520}
          height={520}
          loading="lazy"
        />
      </Link>
      <div className="product-copy">
        <span>{product.category}</span>
        <h3>
          <Link href={`/products/${product.id}`} title={product.name}>
            {displayName}
          </Link>
        </h3>
        <dl>
          <div>
            <dt>Material</dt>
            <dd>{product.material}</dd>
          </div>
          <div>
            <dt>SKU</dt>
            <dd>{product.sku}</dd>
          </div>
        </dl>
        <div className="product-footer">
          <strong>${product.price}</strong>
          <button type="button" onClick={handleAdd} className={justAdded ? "is-added" : ""}>
            <ShoppingBag size={17} />
            {justAdded ? "Added" : "Add"}
          </button>
        </div>
      </div>
    </article>
  );
}
