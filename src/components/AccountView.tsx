"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, PackageCheck, ShieldCheck, ShoppingBag, Sparkles, Truck, X } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { PageMotion } from "@/components/PageMotion";
import { formatProductPrice } from "@/lib/currency";

const orders: { id: string; title: string; status: string; eta: string }[] = [];

export function AccountView() {
  const { addToCart, removeFromWishlist, wishlist, wishlistCount } = useCart();
  const accountStats = [
    { label: "Saved pieces", value: String(wishlistCount), icon: Heart },
    { label: "Active orders", value: "0", icon: PackageCheck },
    { label: "Inquiry cart", value: "Open", icon: Sparkles },
  ];

  return (
    <>
      <PageMotion />
      <section className="account-hero page-reveal">
        <div>
          <p className="section-kicker">My Muxcor</p>
          <h1>A quiet dashboard for orders, saved pieces, and client care.</h1>
          <p>
            Review recent orders, revisit saved jewelry, and keep client-care
            essentials close before the next collection drop.
          </p>
        </div>
        <Link className="primary-link" href="/account/login">
          Sign in or register
        </Link>
      </section>

      <section className="account-grid page-reveal">
        {accountStats.map((item) => {
          const Icon = item.icon;
          return (
            <article className="account-stat stagger-card" key={item.label}>
              <Icon size={22} />
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </article>
          );
        })}
      </section>

      <section className="account-layout page-reveal">
        <div className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Order history</p>
              <h2>Recent activity</h2>
            </div>
            <Truck size={28} />
          </div>
          <div className="order-list">
            {orders.map((order) => (
              <article className="order-row" key={order.id}>
                <div>
                  <span>{order.id}</span>
                  <strong>{order.title}</strong>
                </div>
                <div>
                  <b>{order.status}</b>
                  <small>{order.eta}</small>
                </div>
              </article>
            ))}
            {orders.length === 0 ? (
              <div className="mini-empty-state">
                <PackageCheck size={24} />
                <p>No confirmed orders are linked to this local account yet.</p>
                <Link className="secondary-link" href="/inquiry-cart">Review inquiry cart</Link>
              </div>
            ) : null}
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Wishlist</p>
              <h2>Saved for later</h2>
            </div>
            <Heart size={28} />
          </div>
          <div className="mini-product-list">
            {wishlist.length === 0 ? (
              <div className="mini-empty-state">
                <Heart size={24} />
                <p>Your wishlist is ready for rings and necklaces.</p>
                <Link className="secondary-link" href="/products">
                  Browse collection
                </Link>
              </div>
            ) : (
              wishlist.map((product) => (
                <div className="mini-product-item" key={product.id}>
                  <Link href={`/products/${product.id}`}>
                    <Image src={product.image} alt={product.name} width={72} height={72} />
                    <span>{product.name}</span>
                    <strong>{formatProductPrice(product.price)}</strong>
                  </Link>
                  <div className="mini-product-actions">
                    <button type="button" aria-label={`Add ${product.name} to bag`} onClick={() => addToCart(product)}>
                      <ShoppingBag size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${product.name} from wishlist`}
                      onClick={() => removeFromWishlist(product.id)}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="dashboard-panel care-panel">
          <ShieldCheck size={30} />
          <h2>Client care shortcuts</h2>
          <p>
            Review return windows, privacy protection, and certification details
            before your next order.
          </p>
          <div>
            <Link href="/policies/returns">Returns policy</Link>
            <Link href="/policies/privacy">Privacy policy</Link>
            <Link href="/inquiry-cart">Inquiry cart</Link>
          </div>
        </div>
      </section>
    </>
  );
}
