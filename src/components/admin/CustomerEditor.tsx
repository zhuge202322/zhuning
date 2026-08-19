"use client";

import { useState } from "react";

type Customer = { id: number; name: string; email: string; phone: string; status: string; notes: string; marketingOptIn: boolean };

export function CustomerEditor({ customer, onSaved }: { customer: Customer; onSaved: (customer: Customer) => void }) {
  const [value, setValue] = useState(customer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true); setError("");
    try {
      const { id: _id, ...payload } = value;
      const response = await fetch(`/api/admin/customers/${customer.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) setError(body.error || "客户保存失败"); else onSaved(body.customer);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "客户保存失败");
    } finally {
      setBusy(false);
    }
  }
  return <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4">
    <div className="grid gap-3 md:grid-cols-2">
      <label className="text-xs font-bold text-slate-500">姓名<input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={value.name} onChange={(e) => setValue({ ...value, name: e.target.value })} /></label>
      <label className="text-xs font-bold text-slate-500">邮箱<input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={value.email} onChange={(e) => setValue({ ...value, email: e.target.value })} /></label>
      <label className="text-xs font-bold text-slate-500">电话<input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={value.phone} onChange={(e) => setValue({ ...value, phone: e.target.value })} /></label>
      <label className="text-xs font-bold text-slate-500">客户状态<select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={value.status} onChange={(e) => setValue({ ...value, status: e.target.value })}><option value="ACTIVE">正常</option><option value="INQUIRY">询盘客户</option><option value="DISABLED">已禁用</option></select></label>
    </div>
    <label className="text-xs font-bold text-slate-500">备注<textarea className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={3} value={value.notes} onChange={(e) => setValue({ ...value, notes: e.target.value })} /></label>
    {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    <button type="button" disabled={busy} onClick={save} className="w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "保存中..." : "保存客户"}</button>
  </div>;
}
