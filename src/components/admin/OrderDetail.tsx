"use client";
import { useState } from "react";
import { OrderEditor } from "@/components/admin/OrderEditor";

export default function OrderDetail({ order }: { order: any }) {
  const [value, setValue] = useState(order);
  return <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]"><div className="bg-white rounded-2xl border border-slate-200 p-5"><h3 className="font-bold text-slate-800">Items and snapshots</h3><div className="mt-4 grid gap-3">{value.items.map((item: any) => <div className="flex items-center justify-between border-b border-slate-100 pb-3" key={item.id}><div><strong>{item.productName}</strong><p className="text-xs text-slate-500">{item.sku || "No SKU"} / Qty {item.quantity}</p></div><strong>${Number(item.price).toFixed(2)}</strong></div>)}</div><div className="mt-5 grid grid-cols-3 gap-3 text-sm"><div><span className="text-slate-500">Type</span><strong className="block">{value.orderType}</strong></div><div><span className="text-slate-500">Status</span><strong className="block">{value.status}</strong></div><div><span className="text-slate-500">Total</span><strong className="block">{value.currency} {Number(value.total).toFixed(2)}</strong></div></div></div><div className="bg-white rounded-2xl border border-slate-200 p-5"><h3 className="font-bold text-slate-800">Order controls</h3><OrderEditor order={value} onSaved={(updated) => setValue({ ...value, ...updated })} /></div></div>;
}

