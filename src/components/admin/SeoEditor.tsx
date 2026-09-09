"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, Save } from "lucide-react";
import type { SeoTargetType } from "@/lib/cms-types";
import type { SeoDraft, SeoRecord } from "@/lib/seo-types";
import ImageUploader from "./ImageUploader";

const EMPTY_DRAFT: SeoDraft = {
  title: "",
  description: "",
  keywords: [],
  canonicalUrl: "",
  ogImage: "",
  robots: "index,follow",
};

type Props = {
  targetType: SeoTargetType;
  targetKey: string;
  label?: string;
  defaultImage?: string;
};

export default function SeoEditor({ targetType, targetKey, label = "SEO 设置", defaultImage = "" }: Props) {
  return <SeoEditorState key={`${targetType}:${targetKey}`} targetType={targetType} targetKey={targetKey} label={label} defaultImage={defaultImage} />;
}

function SeoEditorState({ targetType, targetKey, label = "SEO 设置", defaultImage = "" }: Props) {
  const [draft, setDraft] = useState<SeoDraft>({ ...EMPTY_DRAFT, ogImage: defaultImage });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/admin/seo?type=${targetType}&key=${encodeURIComponent(targetKey)}`, { cache: "no-store" });
        const data = await response.json().catch(() => ({})) as { seo?: SeoRecord | null; error?: string };
        if (!response.ok) throw new Error(data.error || "SEO 内容加载失败");
        if (!cancelled && data.seo) {
          setDraft({
            title: data.seo.title,
            description: data.seo.description,
            keywords: data.seo.keywords,
            canonicalUrl: data.seo.canonicalUrl,
            ogImage: data.seo.ogImage,
            robots: data.seo.robots,
          });
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "SEO 内容加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [targetKey, targetType]);

  function update(field: keyof SeoDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: field === "keywords" ? value.split(",").map((item) => item.trim()).filter(Boolean) : value }));
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/seo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetKey, ...draft }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "SEO 保存失败");
      setMessage("SEO 内容已保存。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "SEO 保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-700">{label}</h3>
          <p className="mt-1 text-xs text-slate-500">可单独保存，审核后才会更新前台搜索引擎内容。</p>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-500">{targetType} / {targetKey}</span>
      </div>
      {loading ? <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />加载 SEO 内容...</div> : <>
        {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        {message ? <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{message}</div> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold text-slate-700">SEO 标题（{draft.title.length}/70）<input value={draft.title} maxLength={70} onChange={(event) => update("title", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 font-normal outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" /></label>
          <label className="text-sm font-bold text-slate-700">关键词（逗号分隔）<input value={draft.keywords.join(", ")} onChange={(event) => update("keywords", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 font-normal outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" /></label>
          <label className="text-sm font-bold text-slate-700 md:col-span-2">SEO 描述（{draft.description.length}/170）<textarea value={draft.description} maxLength={170} rows={3} onChange={(event) => update("description", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 font-normal outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" /></label>
          <label className="text-sm font-bold text-slate-700">Canonical 地址<input value={draft.canonicalUrl} onChange={(event) => update("canonicalUrl", event.target.value)} placeholder="留空使用系统地址" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 font-normal outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" /></label>
          <label className="text-sm font-bold text-slate-700">Robots<select value={draft.robots} onChange={(event) => update("robots", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-normal outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"><option value="index,follow">收录并跟随链接</option><option value="noindex,follow">不收录但跟随链接</option></select></label>
          <div className="md:col-span-2"><ImageUploader value={draft.ogImage || null} onChange={(value) => setDraft((current) => ({ ...current, ogImage: value || "" }))} label="社交分享图片" /></div>
        </div>
        <div className="mt-5 flex justify-end"><button type="button" onClick={save} disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "保存中..." : "保存 SEO"}</button></div>
      </>}
    </section>
  );
}
