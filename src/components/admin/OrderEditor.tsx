"use client";

import { useState } from "react";

type Order = {
  id: number; updatedAt: string; orderType: string; status: string; paymentStatus: string; fulfillmentStatus: string;
  notes: string; shipping: string | number; total: string | number;
  shippingRecipient?: string | null; shippingPhone?: string | null; shippingCountry?: string | null;
  shippingAddressLine1?: string | null; shippingAddressLine2?: string | null; shippingPostalCode?: string | null;
  shippingCarrier: string | null; trackingNumber: string | null; paymentMethod: string | null; paymentReference: string | null;
};

const inputClass = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

export function OrderEditor({ order, onSaved }: { order: Order; onSaved: (order: Order) => void }) {
  const [value, setValue] = useState(order);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const statuses = value.orderType === "FORMAL" ? ["CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"] : ["PENDING_INQUIRY", "CONTACTED", "QUOTED", "CANCELLED"];
  const fulfillmentStatus = value.orderType !== "FORMAL" ? "NOT_REQUIRED" : value.status === "CONFIRMED" ? "UNFULFILLED" : value.status === "PROCESSING" ? "PROCESSING" : value.status === "SHIPPED" ? "SHIPPED" : value.status === "COMPLETED" ? "FULFILLED" : "CANCELLED";

  async function save(extra: Record<string, unknown> = {}) {
    setBusy(true); setError("");
    const inquiryPayload = { status: value.status, notes: value.notes };
    const formalPayload = {
      ...inquiryPayload,
      paymentStatus: value.paymentStatus,
      fulfillmentStatus,
      shipping: Number(value.shipping),
      shippingRecipient: value.shippingRecipient || "",
      shippingPhone: value.shippingPhone || "",
      shippingCountry: value.shippingCountry || "",
      shippingAddressLine1: value.shippingAddressLine1 || "",
      shippingAddressLine2: value.shippingAddressLine2 || "",
      shippingPostalCode: value.shippingPostalCode || "",
      shippingCarrier: value.shippingCarrier || "",
      trackingNumber: value.trackingNumber || "",
      paymentMethod: value.paymentMethod || "",
      paymentReference: value.paymentReference || "",
    };
    try {
      const response = await fetch(`/api/admin/orders/${value.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...(value.orderType === "FORMAL" ? formalPayload : inquiryPayload), ...extra, expectedUpdatedAt: value.updatedAt }),
      });
      const body = await response.json();
      if (!response.ok) setError(body.error || "Unable to save order");
      else { setValue(body.order); onSaved(body.order); }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save order");
    } finally {
      setBusy(false);
    }
  }

  return <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4">
    <div className="grid gap-3 md:grid-cols-3">
      <label className="text-xs font-bold text-slate-500">Status<select className={inputClass} value={value.status} onChange={(e) => setValue({ ...value, status: e.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
      {value.orderType === "FORMAL" ? <><label className="text-xs font-bold text-slate-500">Payment<select className={inputClass} value={value.paymentStatus} onChange={(e) => setValue({ ...value, paymentStatus: e.target.value })}><option>UNPAID</option><option>PENDING</option><option>PAID</option><option>REFUNDED</option></select></label><label className="text-xs font-bold text-slate-500">Fulfillment<input className={inputClass} value={fulfillmentStatus} readOnly /></label></> : null}
    </div>
    {value.orderType === "FORMAL" ? <>
      <div className="grid gap-3 md:grid-cols-3"><label className="text-xs font-bold text-slate-500">Shipping amount<input type="number" min="0" className={inputClass} value={value.shipping} onChange={(e) => setValue({ ...value, shipping: e.target.value })} /></label><label className="text-xs font-bold text-slate-500">Recipient<input className={inputClass} value={value.shippingRecipient || ""} onChange={(e) => setValue({ ...value, shippingRecipient: e.target.value })} /></label><label className="text-xs font-bold text-slate-500">Recipient phone<input className={inputClass} value={value.shippingPhone || ""} onChange={(e) => setValue({ ...value, shippingPhone: e.target.value })} /></label></div>
      <div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-bold text-slate-500">Country<input className={inputClass} value={value.shippingCountry || ""} onChange={(e) => setValue({ ...value, shippingCountry: e.target.value })} /></label><label className="text-xs font-bold text-slate-500">Postal code<input className={inputClass} value={value.shippingPostalCode || ""} onChange={(e) => setValue({ ...value, shippingPostalCode: e.target.value })} /></label><label className="text-xs font-bold text-slate-500">Address line 1<input className={inputClass} value={value.shippingAddressLine1 || ""} onChange={(e) => setValue({ ...value, shippingAddressLine1: e.target.value })} /></label><label className="text-xs font-bold text-slate-500">Address line 2<input className={inputClass} value={value.shippingAddressLine2 || ""} onChange={(e) => setValue({ ...value, shippingAddressLine2: e.target.value })} /></label></div>
      <div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-bold text-slate-500">Carrier<input className={inputClass} value={value.shippingCarrier || ""} onChange={(e) => setValue({ ...value, shippingCarrier: e.target.value })} /></label><label className="text-xs font-bold text-slate-500">Tracking number<input className={inputClass} value={value.trackingNumber || ""} onChange={(e) => setValue({ ...value, trackingNumber: e.target.value })} /></label><label className="text-xs font-bold text-slate-500">Payment method<input className={inputClass} value={value.paymentMethod || ""} onChange={(e) => setValue({ ...value, paymentMethod: e.target.value })} /></label><label className="text-xs font-bold text-slate-500">Payment reference<input className={inputClass} value={value.paymentReference || ""} onChange={(e) => setValue({ ...value, paymentReference: e.target.value })} /></label></div>
    </> : null}
    <label className="text-xs font-bold text-slate-500">Notes<textarea className={inputClass} rows={3} value={value.notes} onChange={(e) => setValue({ ...value, notes: e.target.value })} /></label>
    {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => save()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Saving..." : "Save order"}</button>{value.orderType === "INQUIRY" && value.status === "QUOTED" ? <button type="button" disabled={busy} onClick={() => save({ convertToFormal: true })} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">Convert to formal order</button> : null}</div>
  </div>;
}
