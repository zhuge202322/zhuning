"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mail, Phone, UserRound } from "lucide-react";
import { CustomerEditor } from "@/components/admin/CustomerEditor";
import { CUSTOMER_STATUS_LABEL, labelOf } from "@/components/admin/admin-labels";

type Customer = { id: number; name: string; email: string; phone: string; status: string; notes: string; totalOrders: number; totalSpend: string | number; marketingOptIn: boolean };
type CustomerPage = { items: Customer[]; page: number; total: number; totalPages: number };
const pageSize = 20;

export default function CustomerList() {
  const [result, setResult] = useState<CustomerPage>({ items: [], page: 1, total: 0, totalPages: 1 });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (query.trim()) params.set("q", query.trim());
      if (status !== "ALL") params.set("status", status);
      setLoading(true); setError("");
      try {
        const response = await fetch(`/api/admin/customers?${params}`, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "客户列表加载失败");
        setResult(body);
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "客户列表加载失败");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [page, query, status]);

  function updateFilter(update: () => void) { setPage(1); update(); }
  return <>
    <div className="mb-4 flex flex-wrap gap-3"><input className="min-w-64 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="搜索姓名、邮箱或电话" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} /><select className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={status} onChange={(event) => updateFilter(() => setStatus(event.target.value))}><option value="ALL">全部状态</option><option value="ACTIVE">正常</option><option value="INQUIRY">询盘客户</option><option value="DISABLED">已禁用</option></select></div>
    {error ? <p className="mb-3 text-sm text-rose-600" role="alert">{error}</p> : null}
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden"><table className="w-full"><thead className="bg-slate-50 text-left text-xs font-bold text-slate-500 uppercase tracking-wide"><tr><th className="px-4 py-3">客户</th><th className="px-4 py-3">联系方式</th><th className="px-4 py-3">订单数</th><th className="px-4 py-3">消费金额</th><th className="px-4 py-3">状态</th><th className="px-4 py-3 text-right">操作</th></tr></thead><tbody className="divide-y divide-slate-100 text-sm">
      {result.items.map((customer) => <tr key={customer.id} className="hover:bg-slate-50"><td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-900 text-white grid place-items-center"><UserRound className="w-5 h-5" /></div><div><div className="font-bold text-slate-800">{customer.name}</div><div className="text-xs text-slate-500">{customer.totalOrders} 个订单</div></div></div></td><td className="px-4 py-3 text-slate-600"><div className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" />{customer.email}</div>{customer.phone ? <div className="flex items-center gap-2 mt-1 text-xs"><Phone className="w-4 h-4 text-slate-400" />{customer.phone}</div> : null}</td><td className="px-4 py-3 font-bold">{customer.totalOrders}</td><td className="px-4 py-3 font-bold">${Number(customer.totalSpend).toFixed(2)}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${customer.status === "DISABLED" ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>{labelOf(CUSTOMER_STATUS_LABEL, customer.status)}</span></td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-3"><Link href={`/admin/orders?customer=${encodeURIComponent(customer.email)}`} className="text-brand-primary font-bold hover:underline">查看订单</Link><button type="button" className="text-slate-600 font-bold hover:underline" onClick={() => setEditing(editing === customer.id ? null : customer.id)}>{editing === customer.id ? "收起编辑" : "编辑"}</button></div>{editing === customer.id ? <CustomerEditor customer={customer} onSaved={(updated) => { setResult((current) => ({ ...current, items: current.items.map((row) => row.id === updated.id ? { ...row, ...updated } : row) })); setEditing(null); }} /> : null}</td></tr>)}
      {!loading && result.items.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">暂无客户。</td></tr> : null}
      {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">客户加载中...</td></tr> : null}
    </tbody></table><div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500"><span>第 {result.page} 页，共 {Math.max(1, result.totalPages)} 页 / {result.total} 位客户</span><div className="flex gap-2"><button type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">上一页</button><button type="button" disabled={loading || page >= result.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">下一页</button></div></div></div>
  </>;
}
