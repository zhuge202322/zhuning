"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PackageCheck, Truck } from "lucide-react";
import { OrderEditor } from "@/components/admin/OrderEditor";
import { FULFILLMENT_STATUS_LABEL, ORDER_STATUS_LABEL, ORDER_TYPE_LABEL, PAYMENT_STATUS_LABEL, labelOf } from "@/components/admin/admin-labels";

type Order = { id: number; updatedAt: string; orderNumber: string; customerName: string; customerEmail: string; orderType: string; status: string; paymentStatus: string; fulfillmentStatus: string; currency: string; subtotal: number | string; shipping: number | string; total: number | string; notes: string; shippingRecipient?: string | null; shippingPhone?: string | null; shippingCountry?: string | null; shippingAddressLine1?: string | null; shippingAddressLine2?: string | null; shippingPostalCode?: string | null; shippingCarrier: string | null; trackingNumber: string | null; paymentMethod: string | null; paymentReference: string | null; createdAt: string; customer: { id: number; name: string; email: string; status: string } | null; items: { id: number; productName: string; sku: string; image: string; quantity: number; price: number | string }[] };
type OrderPage = { items: Order[]; page: number; total: number; totalPages: number };
const pageSize = 20;
const INQUIRY_STATUSES = ["PENDING_INQUIRY", "CONTACTED", "QUOTED", "CANCELLED"];
const FORMAL_STATUSES = ["CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"];

export default function OrderList({ initialCustomerFilter = "" }: { initialCustomerFilter?: string }) {
  const [result, setResult] = useState<OrderPage>({ items: [], page: 1, total: 0, totalPages: 1 });
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [query, setQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState(initialCustomerFilter);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const statuses = type === "FORMAL" ? FORMAL_STATUSES : type === "INQUIRY" ? INQUIRY_STATUSES : [...new Set([...INQUIRY_STATUSES, ...FORMAL_STATUSES])];

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (query.trim()) params.set("q", query.trim());
      if (customerFilter.trim()) params.set("customer", customerFilter.trim());
      if (type !== "ALL") params.set("type", type);
      if (status !== "ALL") params.set("status", status);
      setLoading(true); setError("");
      try {
        const response = await fetch(`/api/admin/orders?${params}`, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "订单列表加载失败");
        setResult(body);
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "订单列表加载失败");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [customerFilter, page, query, status, type]);

  function updateFilter(update: () => void) { setPage(1); update(); }
  return <>
    <div className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]"><input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="搜索订单号或客户" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} /><input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="按客户筛选" value={customerFilter} onChange={(event) => updateFilter(() => setCustomerFilter(event.target.value))} /><select className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={type} onChange={(event) => updateFilter(() => { setType(event.target.value); setStatus("ALL"); })}><option value="ALL">全部订单类型</option><option value="INQUIRY">询盘订单</option><option value="FORMAL">正式订单</option></select><select className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={status} onChange={(event) => updateFilter(() => setStatus(event.target.value))}><option value="ALL">全部状态</option>{statuses.map((item) => <option key={item} value={item}>{labelOf(ORDER_STATUS_LABEL, item)}</option>)}</select></div>
    {error ? <p className="mb-3 text-sm text-rose-600" role="alert">{error}</p> : null}
    <div className="grid gap-4">{result.items.map((order) => <article key={order.id} className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4"><div><div className="flex items-center gap-2"><PackageCheck className="w-5 h-5 text-brand-primary" /><Link href={`/admin/orders/${order.id}`} className="font-extrabold text-slate-800 hover:underline">{order.orderNumber}</Link><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{labelOf(ORDER_TYPE_LABEL, order.orderType)}</span></div><p className="text-sm text-slate-500 mt-1">{order.customerName} / {order.customerEmail}</p></div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">{labelOf(ORDER_STATUS_LABEL, order.status)}</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{labelOf(PAYMENT_STATUS_LABEL, order.paymentStatus)}</span><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{labelOf(FULFILLMENT_STATUS_LABEL, order.fulfillmentStatus)}</span></div></div>
      <div className="mt-4 grid gap-3">{order.items.map((item) => <div key={item.id} className="grid grid-cols-[56px_1fr_auto] items-center gap-3"><div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden">{item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : null}</div><div><div className="font-bold text-slate-800">{item.productName}</div><div className="text-xs text-slate-500">SKU {item.sku || "无"} / 数量 {item.quantity}</div></div><div className="font-bold text-slate-800">${Number(item.price).toFixed(2)}</div></div>)}</div>
      {order.notes ? <div className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{order.notes}</div> : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><div className="flex items-center gap-2 text-sm text-slate-500"><Truck className="w-4 h-4" />创建于 {new Date(order.createdAt).toLocaleDateString("zh-CN")}</div><div className="flex items-center gap-3"><strong>{order.currency} ${Number(order.total).toFixed(2)}</strong><button type="button" className="text-sm font-bold text-slate-600 hover:underline" onClick={() => setEditing(editing === order.id ? null : order.id)}>{editing === order.id ? "收起编辑" : "编辑订单"}</button></div></div>
      {editing === order.id ? <OrderEditor order={order} onSaved={(updated) => { setResult((current) => ({ ...current, items: current.items.map((row) => row.id === updated.id ? { ...row, ...updated } : row) })); setEditing(null); }} /> : null}
    </article>)}{!loading && result.items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-400">暂无订单。</div> : null}{loading ? <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-slate-400">订单加载中...</div> : null}</div>
    <div className="mt-4 flex items-center justify-between text-sm text-slate-500"><span>第 {result.page} 页，共 {Math.max(1, result.totalPages)} 页 / {result.total} 个订单</span><div className="flex gap-2"><button type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40">上一页</button><button type="button" disabled={loading || page >= result.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40">下一页</button></div></div>
  </>;
}
