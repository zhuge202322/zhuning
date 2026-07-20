"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { formatProductPrice } from "@/lib/currency";
import type { StoreProduct } from "@/lib/storefront-data";

export function ProductCard({ motionIndex = 0, product }: { motionIndex?: number; product: StoreProduct }) {
  const { addToCart, isWishlisted, toggleWishlist } = useCart();
  const [justAdded, setJustAdded] = useState(false);
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
            {product.name}
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
          <strong>{formatProductPrice(product.price)}</strong>
          <button type="button" onClick={handleAdd} className={justAdded ? "is-added" : ""}>
            <ShoppingBag size={17} />
            {justAdded ? "Added" : "Inquire"}
          </button>
        </div>
      </div>
    </article>
  );
}
