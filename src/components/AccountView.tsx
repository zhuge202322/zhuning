"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, LogOut, PackageCheck, ShieldCheck, ShoppingBag, Sparkles, Truck, X } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { PageMotion } from "@/components/PageMotion";
import { formatProductPrice } from "@/lib/currency";

type Customer = { name: string; email: string };
type AccountOrder = { id: number; orderNumber: string; orderType: string; status: string; total: string | number; currency: string; createdAt: string; items: { id: number; productName: string; quantity: number }[] };

export function AccountView() {
  const { addToCart, removeFromWishlist, wishlist, wishlistCount } = useCart();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [logoutBusy, setLogoutBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadOrders() {
      setLoading(true);
      setError("");
      try {
        const [sessionResponse, ordersResponse] = await Promise.all([
          fetch("/api/account/session", { signal: controller.signal }),
          fetch(`/api/account/orders?page=${page}&limit=5`, { signal: controller.signal }),
        ]);
        const [sessionBody, ordersBody] = await Promise.all([sessionResponse.json(), ordersResponse.json()]);
        if (sessionResponse.ok) setCustomer(sessionBody.customer);
        else if (sessionResponse.status !== 401) throw new Error(sessionBody.error || "Unable to load your account.");
        if (!ordersResponse.ok) {
          if (ordersResponse.status === 401) { setOrders([]); setTotalOrders(0); setTotalPages(1); return; }
          throw new Error(ordersBody.error || "Unable to load your order history.");
        }
        setOrders(ordersBody.orders || []);
        setTotalOrders(Number(ordersBody.total || 0));
        setTotalPages(Math.max(1, Number(ordersBody.totalPages || 1)));
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load your order history.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadOrders();
    return () => controller.abort();
  }, [page]);

  async function logout() {
    setLogoutBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/logout", { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Unable to sign out.");
      }
      window.location.href = "/account/login";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign out.");
    } finally {
      setLogoutBusy(false);
    }
  }

  const accountStats = [
    { label: "Saved pieces", value: String(wishlistCount), icon: Heart },
    { label: "Client orders", value: String(totalOrders), icon: PackageCheck },
    { label: "Inquiry cart", value: "Open", icon: Sparkles },
  ];

  return <>
    <PageMotion />
    <section className="account-hero page-reveal">
      <div><p className="section-kicker">My Muxcor</p><h1>{customer ? `Welcome, ${customer.name}.` : "A quiet dashboard for your client journey."}</h1><p>Review recent inquiries, formal orders, and saved pieces in one private space.</p></div>
      {customer ? <button className="secondary-link" type="button" disabled={logoutBusy} onClick={logout}><LogOut size={16} /> {logoutBusy ? "Signing out..." : "Sign out"}</button> : <Link className="primary-link" href="/account/login">Sign in or register</Link>}
    </section>
    <section className="account-grid page-reveal">{accountStats.map(({ label, value, icon: Icon }) => <article className="account-stat stagger-card" key={label}><Icon size={22} /><strong>{value}</strong><span>{label}</span></article>)}</section>
    <section className="account-layout page-reveal">
      <div className="dashboard-panel"><div className="panel-heading"><div><p className="section-kicker">Order history</p><h2>Recent activity</h2></div><Truck size={28} /></div>{error ? <p className="account-error" role="alert">{error}</p> : null}<div className="order-list">
        {loading ? <div className="mini-empty-state"><p>Loading your private order archive...</p></div> : orders.length ? orders.map((order) => <article className="order-row" key={order.id}><div><span>{order.orderNumber} / {order.orderType}</span><strong>{order.items[0]?.productName || "Client order"}{order.items.length > 1 ? ` + ${order.items.length - 1} more` : ""}</strong></div><div><b>{order.status}</b><small>{order.currency} {Number(order.total).toFixed(2)} / {new Date(order.createdAt).toLocaleDateString("en-US")}</small></div></article>) : <div className="mini-empty-state"><PackageCheck size={24} /><p>No orders are linked to this client space yet.</p><Link className="secondary-link" href="/inquiry-cart">Review inquiry cart</Link></div>}
      </div>{!loading && totalPages > 1 ? <div className="account-pagination"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><span>Page {page} of {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button></div> : null}</div>
      <div className="dashboard-panel"><div className="panel-heading"><div><p className="section-kicker">Wishlist</p><h2>Saved for later</h2></div><Heart size={28} /></div><div className="mini-product-list">
        {wishlist.length === 0 ? <div className="mini-empty-state"><Heart size={24} /><p>Your wishlist is ready for rings and necklaces.</p><Link className="secondary-link" href="/products">Browse collection</Link></div> : wishlist.map((product) => <div className="mini-product-item" key={product.id}><Link href={`/products/${product.id}`}><Image src={product.image} alt={product.name} width={72} height={72} /><span>{product.name}</span><strong>{formatProductPrice(product.price)}</strong></Link><div className="mini-product-actions"><button type="button" aria-label={`Add ${product.name} to bag`} onClick={() => addToCart(product)}><ShoppingBag size={15} /></button><button type="button" aria-label={`Remove ${product.name} from wishlist`} onClick={() => removeFromWishlist(product.id)}><X size={15} /></button></div></div>)}
      </div></div>
      <div className="dashboard-panel care-panel"><ShieldCheck size={30} /><h2>Client care shortcuts</h2><p>Review return windows, privacy protection, and certification details before your next order.</p><div><Link href="/policies/returns">Returns policy</Link><Link href="/policies/privacy">Privacy policy</Link><Link href="/inquiry-cart">Inquiry cart</Link></div></div>
    </section>
  </>;
}
