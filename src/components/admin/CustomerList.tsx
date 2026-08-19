"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mail, Phone, UserRound } from "lucide-react";
import { CustomerEditor } from "@/components/admin/CustomerEditor";

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
        if (!response.ok) throw new Error(body.error || "Unable to load customers");
        setResult(body);
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "Unable to load customers");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [page, query, status]);

  function updateFilter(update: () => void) { setPage(1); update(); }
  return <>
    <div className="mb-4 flex flex-wrap gap-3"><input className="min-w-64 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Search name, email, or phone" value={query} onChange={(event) => updateFilter(() => setQuery(event.target.value))} /><select className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={status} onChange={(event) => updateFilter(() => setStatus(event.target.value))}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INQUIRY">Inquiry</option><option value="DISABLED">Disabled</option></select></div>
    {error ? <p className="mb-3 text-sm text-rose-600" role="alert">{error}</p> : null}
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden"><table className="w-full"><thead className="bg-slate-50 text-left text-xs font-bold text-slate-500 uppercase tracking-wide"><tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Orders</th><th className="px-4 py-3">Spend</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100 text-sm">
      {result.items.map((customer) => <tr key={customer.id} className="hover:bg-slate-50"><td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-900 text-white grid place-items-center"><UserRound className="w-5 h-5" /></div><div><div className="font-bold text-slate-800">{customer.name}</div><div className="text-xs text-slate-500">{customer.totalOrders} order(s)</div></div></div></td><td className="px-4 py-3 text-slate-600"><div className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" />{customer.email}</div>{customer.phone ? <div className="flex items-center gap-2 mt-1 text-xs"><Phone className="w-4 h-4 text-slate-400" />{customer.phone}</div> : null}</td><td className="px-4 py-3 font-bold">{customer.totalOrders}</td><td className="px-4 py-3 font-bold">${Number(customer.totalSpend).toFixed(2)}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${customer.status === "DISABLED" ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>{customer.status}</span></td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-3"><Link href={`/admin/orders?customer=${encodeURIComponent(customer.email)}`} className="text-brand-primary font-bold hover:underline">Orders</Link><button type="button" className="text-slate-600 font-bold hover:underline" onClick={() => setEditing(editing === customer.id ? null : customer.id)}>Edit</button></div>{editing === customer.id ? <CustomerEditor customer={customer} onSaved={(updated) => { setResult((current) => ({ ...current, items: current.items.map((row) => row.id === updated.id ? { ...row, ...updated } : row) })); setEditing(null); }} /> : null}</td></tr>)}
      {!loading && result.items.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No customers found.</td></tr> : null}
      {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading customers...</td></tr> : null}
    </tbody></table><div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500"><span>Page {result.page} of {Math.max(1, result.totalPages)} / {result.total} customers</span><div className="flex gap-2"><button type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Previous</button><button type="button" disabled={loading || page >= result.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Next</button></div></div></div>
  </>;
}

