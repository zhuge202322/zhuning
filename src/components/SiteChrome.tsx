"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ChevronRight,
  Heart,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { CartProvider, useCart } from "@/components/CartContext";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/account", label: "Account" },
  { href: "/policies/returns", label: "Returns" },
  { href: "/policies/privacy", label: "Privacy" },
];

const productMegaMenu = [
  {
    href: "/products?category=necklaces",
    title: "Necklaces",
    copy: "Pearl layers, chokers, pendants, and evening chains.",
    image: "/products/pearl-layered-necklace.png",
    stat: "125 pieces",
  },
  {
    href: "/products?category=rings",
    title: "Rings",
    copy: "Statement stones, sculptural bands, and polished settings.",
    image: "/products/zircon-anniversary-ring.png",
    stat: "61 pieces",
  },
];

function Shell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const {
    addToCart,
    cart,
    cartOpen,
    closeCart,
    closeWishlist,
    openCart,
    openWishlist,
    removeFromWishlist,
    subtotal,
    totalItems,
    updateQuantity,
    wishlist,
    wishlistCount,
    wishlistOpen,
  } = useCart();
  const panelOpen = cartOpen || wishlistOpen;

  function closePanels() {
    closeCart();
    closeWishlist();
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header" aria-label="Main navigation">
        <button
          className="icon-button mobile-only"
          aria-label="Open menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <Menu size={20} />
        </button>
        <Link className="brand-mark" href="/" aria-label="Muxcor home">
          <span>M</span>
          MUXCOR
        </Link>
        <nav className="desktop-nav" aria-label="Shop sections">
          {navItems.map((item) =>
            item.label === "Products" ? (
              <div className="nav-item has-mega" key={item.href}>
                <Link className="nav-link" href={item.href}>
                  {item.label}
                </Link>
                <div className="mega-menu" aria-label="Product categories">
                  <div className="mega-panel">
                    <div className="mega-intro">
                      <span>Crimson Drop Luxury</span>
                      <strong>Shop by category</strong>
                      <Link href="/products">
                        All jewelry
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                    <div className="mega-card-grid">
                      {productMegaMenu.map((categoryItem) => (
                        <Link className="mega-card" href={categoryItem.href} key={categoryItem.title}>
                          <Image src={categoryItem.image} alt="" width={156} height={156} />
                          <span>{categoryItem.stat}</span>
                          <strong>{categoryItem.title}</strong>
                          <p>{categoryItem.copy}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Link className="nav-link" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="header-actions">
          <button className="icon-button" aria-label="Search">
            <Search size={19} />
          </button>
          <button
            className="bag-button wishlist-trigger"
            aria-label={`Open wishlist with ${wishlistCount} items`}
            onClick={openWishlist}
            type="button"
          >
            <Heart size={19} />
            <span>{wishlistCount}</span>
          </button>
          <Link className="icon-button" href="/account" aria-label="Account">
            <User size={19} />
          </Link>
          <button
            className="bag-button"
            aria-label={`Open shopping bag with ${totalItems} items`}
            onClick={openCart}
          >
            <ShoppingBag size={19} />
            <span>{totalItems}</span>
          </button>
        </div>
      </header>

      <nav className={`mobile-nav ${mobileMenuOpen ? "open" : ""}`} aria-label="Mobile shop sections">
        {navItems.map((item) => (
          <Link href={item.href} key={item.href} onClick={() => setMobileMenuOpen(false)}>
            {item.label}
          </Link>
        ))}
        <Link href="/products?category=necklaces" onClick={() => setMobileMenuOpen(false)}>
          Necklaces
        </Link>
        <Link href="/products?category=rings" onClick={() => setMobileMenuOpen(false)}>
          Rings
        </Link>
      </nav>

      <main id="main">{children}</main>

      <footer className="site-footer">
        <div>
          <Link className="brand-mark" href="/" aria-label="Muxcor home">
            <span>M</span>
            MUXCOR
          </Link>
          <p>
            Guangzhou Muxcor International Co., Ltd. No. 179 Yingbin Road,
            Guangzhou City, Guangdong Province, China.
          </p>
        </div>
        <a href="mailto:gary@muxcor.com">gary@muxcor.com</a>
      </footer>

      <div className={`cart-scrim ${panelOpen ? "open" : ""}`} onClick={closePanels} />
      <aside className={`cart-drawer wishlist-drawer ${wishlistOpen ? "open" : ""}`} aria-label="Wishlist">
        <div className="cart-header">
          <div>
            <span>Wishlist</span>
            <strong>{wishlistCount} saved</strong>
          </div>
          <button className="icon-button" aria-label="Close wishlist" onClick={closeWishlist} type="button">
            <X size={20} />
          </button>
        </div>
        <div className="cart-lines">
          {wishlist.length === 0 ? (
            <div className="empty-cart wishlist-empty">
              <Heart size={24} />
              <p>Save rings and necklaces here while you compare your favorites.</p>
              <Link className="secondary-link" href="/products" onClick={closeWishlist}>
                Browse collection
              </Link>
            </div>
          ) : (
            wishlist.map((item) => (
              <div className="cart-line wishlist-line" key={item.id}>
                <Link href={`/products/${item.id}`} onClick={closeWishlist}>
                  <Image src={item.image} alt={item.name} width={86} height={86} />
                </Link>
                <div>
                  <Link href={`/products/${item.id}`} onClick={closeWishlist}>
                    <strong>{item.name}</strong>
                  </Link>
                  <span>${item.price}</span>
                  <div className="wishlist-line-actions">
                    <button type="button" onClick={() => addToCart(item)}>
                      <ShoppingBag size={15} />
                      Add to bag
                    </button>
                    <button type="button" onClick={() => removeFromWishlist(item.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
      <aside className={`cart-drawer ${cartOpen ? "open" : ""}`} aria-label="Shopping bag">
        <div className="cart-header">
          <div>
            <span>Shopping bag</span>
            <strong>{totalItems} items</strong>
          </div>
          <button className="icon-button" aria-label="Close shopping bag" onClick={closeCart} type="button">
            <X size={20} />
          </button>
        </div>
        <div className="cart-lines">
          {cart.length === 0 ? (
            <p className="empty-cart">Your bag is ready for rings and necklaces.</p>
          ) : (
            cart.map((item) => (
              <div className="cart-line" key={item.id}>
                <Image src={item.image} alt={item.name} width={86} height={86} />
                <div>
                  <strong>{item.name}</strong>
                  <span>${item.price}</span>
                  <div className="quantity-controls">
                    <button aria-label={`Decrease ${item.name}`} onClick={() => updateQuantity(item.id, -1)}>
                      <Minus size={15} />
                    </button>
                    <span>{item.quantity}</span>
                    <button aria-label={`Increase ${item.name}`} onClick={() => updateQuantity(item.id, 1)}>
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="cart-footer">
          <div>
            <span>Subtotal</span>
            <strong>${subtotal}</strong>
          </div>
          <button type="button" disabled={cart.length === 0}>
            Continue to checkout
          </button>
        </div>
      </aside>
    </div>
  );
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Shell>{children}</Shell>
    </CartProvider>
  );
}
