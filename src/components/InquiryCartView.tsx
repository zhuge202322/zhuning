"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Minus, Plus, Send, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { PageMotion } from "@/components/PageMotion";
import { formatProductPrice } from "@/lib/currency";

export function InquiryCartView() {
  const { cart, clearCart, subtotal, totalItems, updateQuantity } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [inquiryNumber, setInquiryNumber] = useState("");

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart.length || submitting) return;

    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          company: form.get("company"),
          country: form.get("country"),
          message: form.get("message"),
          items: cart.map((item) => ({
            dbId: item.dbId,
            name: item.name,
            sku: item.sku,
            image: item.image,
            price: item.price,
            quantity: item.quantity,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to send inquiry");

      setInquiryNumber(data.inquiryNumber);
      clearCart();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send inquiry");
    } finally {
      setSubmitting(false);
    }
  }

  if (inquiryNumber) {
    return (
      <>
        <PageMotion />
        <section className="inquiry-success page-reveal">
          <CheckCircle2 size={42} />
          <h1>Inquiry sent</h1>
          <p>
            Your reference is <strong>{inquiryNumber}</strong>. The request now appears in the
            admin order list for follow-up.
          </p>
          <Link className="primary-link" href="/products">
            Continue browsing <ArrowRight size={18} />
          </Link>
        </section>
      </>
    );
  }

  return (
    <>
      <PageMotion />
      <section className="page-hero compact page-reveal">
        <p className="section-kicker">Procurement workflow</p>
        <h1>Review your inquiry cart.</h1>
        <p>Add the products and quantities you need, then send one consolidated request to the team.</p>
      </section>

      <section className="inquiry-layout page-reveal">
        <div className="inquiry-products">
          <div className="inquiry-heading">
            <ShoppingBag size={22} />
            <div>
              <h2>Selected products</h2>
              <p>{totalItems} item(s) in this inquiry</p>
            </div>
          </div>

          {cart.length ? (
            <div className="inquiry-lines">
              {cart.map((item) => (
                <article className="inquiry-line" key={item.id}>
                  <Link href={`/products/${item.id}`}>
                    <Image src={item.image} alt={item.name} width={110} height={110} />
                  </Link>
                  <div className="inquiry-line-copy">
                    <span>{item.category} / SKU {item.sku}</span>
                    <Link href={`/products/${item.id}`}>{item.name}</Link>
                    <strong>{formatProductPrice(item.price)}</strong>
                  </div>
                  <div className="inquiry-line-actions">
                    <div className="quantity-controls">
                      <button type="button" aria-label={`Decrease ${item.name}`} onClick={() => updateQuantity(item.id, -1)}>
                        <Minus size={15} />
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" aria-label={`Increase ${item.name}`} onClick={() => updateQuantity(item.id, 1)}>
                        <Plus size={15} />
                      </button>
                    </div>
                    <button className="remove-line" type="button" onClick={() => updateQuantity(item.id, -item.quantity)}>
                      <Trash2 size={16} /> Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="catalog-empty-state inquiry-empty">
              <h2>Your inquiry cart is empty</h2>
              <p>Browse the catalogue and add the SKUs you want the team to quote.</p>
              <Link className="primary-link" href="/products">Browse products</Link>
            </div>
          )}

          <div className="inquiry-total">
            <span>Current product value</span>
            <strong>{formatProductPrice(subtotal)}</strong>
            <small>Freight, packing, MOQ, and final quotation are confirmed separately.</small>
          </div>
        </div>

        <form className="inquiry-form" onSubmit={submitInquiry}>
          <div>
            <p className="section-kicker">Contact details</p>
            <h2>Send to the sourcing team</h2>
          </div>
          <label>
            Full name
            <input name="name" required autoComplete="name" />
          </label>
          <label>
            Business email
            <input name="email" required type="email" autoComplete="email" />
          </label>
          <label>
            Phone / WhatsApp
            <input name="phone" required type="tel" autoComplete="tel" />
          </label>
          <div className="inquiry-form-row">
            <label>
              Company
              <input name="company" autoComplete="organization" />
            </label>
            <label>
              Country / market
              <input name="country" autoComplete="country-name" />
            </label>
          </div>
          <label>
            Requirements
            <textarea name="message" rows={5} placeholder="Target quantity, customization, delivery market, or other requirements." />
          </label>
          {error ? <p className="inquiry-error" role="alert">{error}</p> : null}
          <button className="primary-link" type="submit" disabled={!cart.length || submitting}>
            <Send size={18} /> {submitting ? "Sending..." : "Send product inquiry"}
          </button>
        </form>
      </section>
    </>
  );
}
