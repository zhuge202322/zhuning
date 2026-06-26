"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { StoreProduct } from "@/lib/storefront-data";

export type CartLine = StoreProduct & { quantity: number };

type CartContextValue = {
  cart: CartLine[];
  cartOpen: boolean;
  wishlist: StoreProduct[];
  wishlistOpen: boolean;
  totalItems: number;
  subtotal: number;
  wishlistCount: number;
  addToCart: (product: StoreProduct) => void;
  updateQuantity: (productId: string, delta: number) => void;
  toggleWishlist: (product: StoreProduct) => void;
  removeFromWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  openCart: () => void;
  closeCart: () => void;
  openWishlist: () => void;
  closeWishlist: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const CART_STORAGE_KEY = "muxcor-shopping-bag";
const WISHLIST_STORAGE_KEY = "muxcor-wishlist";

function readStoredItems<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredItems<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Shopping should still work when a browser blocks local storage.
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlist, setWishlist] = useState<StoreProduct[]>([]);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [hasRestoredStorage, setHasRestoredStorage] = useState(false);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const wishlistCount = wishlist.length;

  useEffect(() => {
    setCart(readStoredItems<CartLine[]>(CART_STORAGE_KEY, []));
    setWishlist(readStoredItems<StoreProduct[]>(WISHLIST_STORAGE_KEY, []));
    setHasRestoredStorage(true);
  }, []);

  useEffect(() => {
    if (!hasRestoredStorage) return;
    writeStoredItems(CART_STORAGE_KEY, cart);
  }, [cart, hasRestoredStorage]);

  useEffect(() => {
    if (!hasRestoredStorage) return;
    writeStoredItems(WISHLIST_STORAGE_KEY, wishlist);
  }, [wishlist, hasRestoredStorage]);

  const addToCart = useCallback((product: StoreProduct) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });
    setWishlistOpen(false);
    setCartOpen(true);
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const toggleWishlist = useCallback((product: StoreProduct) => {
    const alreadySaved = wishlist.some((item) => item.id === product.id);
    setWishlist((current) => {
      const exists = current.some((item) => item.id === product.id);
      if (exists) return current.filter((item) => item.id !== product.id);
      return [product, ...current];
    });
    setCartOpen(false);
    setWishlistOpen(!alreadySaved);
  }, [wishlist]);

  const removeFromWishlist = useCallback((productId: string) => {
    setWishlist((current) => current.filter((item) => item.id !== productId));
  }, []);

  const isWishlisted = useCallback(
    (productId: string) => wishlist.some((item) => item.id === productId),
    [wishlist],
  );

  const openCart = useCallback(() => {
    setWishlistOpen(false);
    setCartOpen(true);
  }, []);

  const closeCart = useCallback(() => {
    setCartOpen(false);
  }, []);

  const openWishlist = useCallback(() => {
    setCartOpen(false);
    setWishlistOpen(true);
  }, []);

  const closeWishlist = useCallback(() => {
    setWishlistOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      cart,
      cartOpen,
      wishlist,
      wishlistOpen,
      totalItems,
      subtotal,
      wishlistCount,
      addToCart,
      updateQuantity,
      toggleWishlist,
      removeFromWishlist,
      isWishlisted,
      openCart,
      closeCart,
      openWishlist,
      closeWishlist,
    }),
    [
      addToCart,
      cart,
      cartOpen,
      closeCart,
      closeWishlist,
      isWishlisted,
      openCart,
      openWishlist,
      removeFromWishlist,
      subtotal,
      toggleWishlist,
      totalItems,
      updateQuantity,
      wishlist,
      wishlistCount,
      wishlistOpen,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
