"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, Heart, Ruler, ShieldCheck, Sparkles } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { PageMotion } from "@/components/PageMotion";
import { ProductCard } from "@/components/ProductCard";
import { detailPanelGroups } from "@/data/company";
import { formatProductPrice } from "@/lib/currency";
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
  const editorialGroups = detailPanelGroups.filter((group) => !group.necklacesOnly || product.category === "Necklaces");
  const [activeEditorial, setActiveEditorial] = useState(editorialGroups[0].id);
  const activeEditorialGroup = editorialGroups.find((group) => group.id === activeEditorial) ?? editorialGroups[0];
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
          <strong className="detail-price">{formatProductPrice(product.price)}</strong>
          <div className="detail-actions">
            <button
              className={`primary-link ${justAdded ? "is-added" : ""}`}
              type="button"
              onClick={addCurrentProduct}
            >
              {justAdded ? "Added to inquiry cart" : "Add to inquiry cart"} <ArrowRight size={18} />
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
              <span>Packing reference</span>
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
              Keep the piece dry, avoid direct perfume contact, and clean it
              gently with a soft cloth. Final packing and shipment details are
              confirmed with the quotation for each SKU.
            </p>
          </div>
        </div>
      </section>

      <section className="product-editorial page-reveal">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Product and production reference</p>
            <h2>Review the details behind the piece.</h2>
          </div>
        </div>
        <div className="detail-panel-tabs" role="tablist" aria-label="Product detail sections">
          {editorialGroups.map((group) => (
            <button
              className={activeEditorialGroup.id === group.id ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeEditorialGroup.id === group.id}
              aria-controls={`detail-panel-${group.id}`}
              id={`detail-tab-${group.id}`}
              onClick={() => setActiveEditorial(group.id)}
              key={group.id}
            >
              {group.label}
            </button>
          ))}
        </div>
        <div
          className="detail-editorial-copy"
          role="tabpanel"
          id={`detail-panel-${activeEditorialGroup.id}`}
          aria-labelledby={`detail-tab-${activeEditorialGroup.id}`}
        >
          <h3>{activeEditorialGroup.title}</h3>
          <p>{activeEditorialGroup.copy}</p>
          <div className="detail-panel-gallery">
            {activeEditorialGroup.panels.map((panel) => (
              <Image
                src={panel.src}
                alt={panel.alt}
                width={panel.width}
                height={panel.height}
                unoptimized
                sizes="(max-width: 860px) calc(100vw - 36px), 760px"
                key={panel.src}
              />
            ))}
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
