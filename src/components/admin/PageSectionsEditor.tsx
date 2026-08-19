"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, RefreshCw, Save } from "lucide-react";

type Section = {
  id: number; pageKey: string; sectionKey: string; eyebrow: string; title: string; body: string;
  buttonLabel: string; buttonHref: string; mediaUrl: string; mediaAlt: string; dataJson: string;
  sortOrder: number; enabled: boolean;
};
type PageOption = { key: string; label: string };

export function PageSectionsEditor() {
  const [pageKey, setPageKey] = useState("home");
  const [pages, setPages] = useState<PageOption[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => { void loadPage(pageKey); }, [pageKey]);

  async function loadPage(selectedPage: string, preserveMessage = false) {
    setLoading(true); setError("");
    if (!preserveMessage) setMessage("");
    try {
      const response = await fetch(`/api/admin/sections?pageKey=${encodeURIComponent(selectedPage)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load sections");
      setPages(data.pages); setSections(data.sections);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load sections");
    } finally { setLoading(false); }
  }

  function updateSection(index: number, patch: Partial<Section>) {
    setSections((current) => current.map((section, sectionIndex) => sectionIndex === index ? { ...section, ...patch } : section));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    setSections((current) => { const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; });
  }

  async function saveAll() {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "savePage",
          pageKey,
          sections: sections.map((section, index) => ({
            pageKey: section.pageKey, sectionKey: section.sectionKey, eyebrow: section.eyebrow,
            title: section.title, body: section.body, buttonLabel: section.buttonLabel,
            buttonHref: section.buttonHref, mediaUrl: section.mediaUrl, mediaAlt: section.mediaAlt,
            dataJson: section.dataJson, enabled: section.enabled, sortOrder: index * 10,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save page sections");
      await loadPage(pageKey, true);
      setMessage("Page sections saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to save page sections");
    } finally { setSaving(false); }
  }

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="text-xl font-bold text-slate-900">Page sections</h2><p className="mt-1 text-sm text-slate-500">Edit the predefined storefront sections without changing the page layout.</p></div>
        <div className="flex items-end gap-3">
          <label><span className="block text-xs font-bold uppercase text-slate-500">Page</span><select value={pageKey} onChange={(event) => setPageKey(event.target.value)} className="mt-1 min-w-48 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">{pages.length ? pages.map((page) => <option key={page.key} value={page.key}>{page.label}</option>) : <option value="home">Homepage</option>}</select></label>
          <button type="button" onClick={saveAll} disabled={saving || loading} className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save page"}</button>
        </div>
      </div>
      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{message}</div> : null}
      {loading ? <div className="flex items-center gap-2 py-12 text-sm text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" /> Loading sections...</div> : null}
      {!loading ? <div className="space-y-4">{sections.map((section, index) => (
        <article key={section.sectionKey} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-bold text-slate-900">{section.sectionKey}</h3><span className="text-xs text-slate-400">{section.pageKey}.{section.sectionKey}</span></div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={section.enabled} onChange={(event) => updateSection(index, { enabled: event.target.checked })} /> Enabled</label>
              <button type="button" title="Move section up" aria-label="Move section up" onClick={() => move(index, -1)} disabled={index === 0} className="rounded-md border border-slate-200 p-2 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" title="Move section down" aria-label="Move section down" onClick={() => move(index, 1)} disabled={index === sections.length - 1} className="rounded-md border border-slate-200 p-2 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {(["eyebrow", "title", "buttonLabel", "buttonHref", "mediaUrl", "mediaAlt"] as const).map((field) => <label key={field}><span className="text-xs font-bold uppercase text-slate-500">{field}</span><input value={section[field]} onChange={(event) => updateSection(index, { [field]: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>)}
            <label className="md:col-span-2"><span className="text-xs font-bold uppercase text-slate-500">Body</span><textarea rows={4} value={section.body} onChange={(event) => updateSection(index, { body: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="md:col-span-2"><span className="text-xs font-bold uppercase text-slate-500">Structured content (JSON)</span><textarea rows={8} spellCheck={false} value={section.dataJson} onChange={(event) => updateSection(index, { dataJson: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs" /></label>
          </div>
        </article>
      ))}</div> : null}
    </div>
  );
}
