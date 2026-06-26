"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, Heart, Ruler, ShieldCheck, Sparkles } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { PageMotion } from "@/components/PageMotion";
import { ProductCard } from "@/components/ProductCard";
import type { StoreProduct } from "@/lib/storefront-data";

export function ProductDetailView({
  product,
  relatedProducts,
}: {
  product: StoreProduct;
  relatedProducts: StoreProduct[];
}) {
  return <ProductGallery product={product} relatedProducts={relatedProducts} key={product.id} />;
}

function ProductGallery({
  product,
  relatedProducts,
}: {
  product: StoreProduct;
  relatedProducts: StoreProduct[];
}) {
  const { addToCart, isWishlisted, toggleWishlist } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const saved = isWishlisted(product.id);
  const galleryItems = useMemo(
    () =>
      product.images.length
        ? product.images.map((image, index) => ({
            image,
            name: index === 0 ? product.name : `${product.name} view ${index + 1}`,
          }))
        : [{ image: product.image, name: product.name }],
    [product],
  );

  useEffect(() => {
    if (!justAdded) return;
    const timeout = window.setTimeout(() => setJustAdded(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [justAdded]);

  function addCurrentProduct() {
    addToCart(product);
    setJustAdded(true);
  }

  return (
    <>
      <PageMotion />
      <section className="product-detail page-reveal">
        <div className="detail-gallery">
          <Link className="back-link" href="/products">
            <ArrowLeft size={17} />
            Back to collection
          </Link>
          <div className="detail-gallery-shell">
            <div className="gallery-inputs" aria-label="Product image options">
              {galleryItems.map((item, index) => (
                <input
                  className={`gallery-radio gallery-radio-${index}`}
                  type="radio"
                  name={`gallery-${product.dbId}`}
                  id={`gallery-${product.dbId}-${index}`}
                  defaultChecked={index === 0}
                  key={`input-${item.image}`}
                />
              ))}
            </div>
            <div className="detail-image-stack">
              {galleryItems.map((item, index) => (
                <div className={`detail-image-main gallery-main gallery-main-${index}`} key={`main-${item.image}`}>
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={900}
                    height={900}
                    loading={index === 0 ? "eager" : "lazy"}
                    preload={index === 0}
                  />
                </div>
              ))}
            </div>
            <div className="detail-thumbs" aria-label="Product image thumbnails">
              {galleryItems.map((item, index) => (
                <label
                  className={`gallery-thumb gallery-thumb-${index}`}
                  htmlFor={`gallery-${product.dbId}-${index}`}
                  data-gallery-image={item.image}
                  key={`thumb-${item.image}`}
                >
                  <span className="sr-only">Show {item.name}</span>
                  <Image
                    src={item.image}
                    alt=""
                    width={140}
                    height={140}
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="detail-copy">
          <p className="section-kicker">{product.collection}</p>
          <h1>{product.name}</h1>
          <p className="detail-note">{product.note}</p>
          <strong className="detail-price">${product.price}</strong>
          <div className="detail-actions">
            <button
              className={`primary-link ${justAdded ? "is-added" : ""}`}
              type="button"
              onClick={addCurrentProduct}
            >
              {justAdded ? "Added to bag" : "Add to bag"} <ArrowRight size={18} />
            </button>
            <button
              className={`secondary-link wishlist-action ${saved ? "active" : ""}`}
              type="button"
              onClick={() => toggleWishlist(product)}
              aria-pressed={saved}
            >
              <Heart size={17} fill={saved ? "currentColor" : "none"} />
              {saved ? "Saved" : "Save piece"}
            </button>
          </div>

          <div className="detail-spec-grid">
            <div>
              <BadgeCheck size={20} />
              <span>Material</span>
              <strong>{product.material}</strong>
            </div>
            <div>
              <Sparkles size={20} />
              <span>Stones</span>
              <strong>{product.stones}</strong>
            </div>
            <div>
              <Ruler size={20} />
              <span>Packaging</span>
              <strong>{product.packaging}</strong>
            </div>
            <div>
              <ShieldCheck size={20} />
              <span>SKU</span>
              <strong>{product.sku}</strong>
            </div>
          </div>

          <div className="detail-panel">
            <h2>Care and assurance</h2>
            <p>
              Store separately in the gift box, avoid direct perfume contact,
              and clean gently with a soft dry cloth. Muxcor production is backed
              by material testing and export-ready documentation.
            </p>
          </div>
        </div>
      </section>

      <section className="product-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">You may also like</p>
            <h2>Pieces in the same mood</h2>
          </div>
        </div>
        <div className="product-grid related-grid">
          {relatedProducts.map((item, index) => (
            <ProductCard product={item} motionIndex={index} key={item.id} />
          ))}
        </div>
      </section>
    </>
  );
}
