"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, RefreshCw, Save } from "lucide-react";
import MediaUploader from "@/components/admin/MediaUploader";

type Section = {
  id: number; pageKey: string; sectionKey: string; eyebrow: string; title: string; body: string;
  buttonLabel: string; buttonHref: string; mediaUrl: string; mediaAlt: string; dataJson: string;
  sortOrder: number; enabled: boolean;
};
type PageOption = { key: string; label: string };

const PAGE_LABELS: Record<string, string> = {
  home: "首页",
  about: "关于我们",
  customization: "定制服务",
  certifications: "资质认证",
  "after-sales": "售后服务",
  privacy: "隐私政策",
  returns: "退换货政策",
  "product-detail": "产品详情页",
};

const SECTION_LABELS: Record<string, string> = {
  hero: "首屏",
  proof: "信任证明",
  categories: "产品类目",
  catalogue: "产品目录",
  spotlight: "重点推荐",
  company: "公司介绍",
  customization: "定制服务",
  certifications: "资质认证",
  inquiry: "询盘入口",
  stats: "数据统计",
  story: "公司故事",
  history: "发展历程",
  capabilities: "业务能力",
  presentation: "公司展示",
  gallery: "图片画廊",
  contact: "联系方式",
  brief: "需求沟通",
  process: "定制流程",
  reference: "参考资料",
  "process-media": "工艺视频",
  assurance: "生产确认",
  summary: "内容摘要",
  evidence: "资质证据",
  library: "资料库",
  commitment: "服务承诺",
  "product-review": "产品评价",
  production: "生产支持",
  shipping: "物流配送",
  resolution: "问题处理",
  information: "信息收集",
  usage: "信息使用",
  protection: "信息保护",
  choices: "客户选择",
  window: "退换时间",
  exchanges: "换货支持",
  exclusions: "不适用范围",
  refunds: "退款说明",
  "product-detail": "产品详情",
  care: "产品护理",
  editorial: "详情内容",
  related: "相关产品",
};

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
      if (!response.ok) throw new Error(data.error || "页面板块加载失败");
      setPages(data.pages); setSections(data.sections);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "页面板块加载失败");
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
      if (!response.ok) throw new Error(data.error || "页面板块保存失败");
      await loadPage(pageKey, true);
      setMessage("页面板块已保存。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "页面板块保存失败");
    } finally { setSaving(false); }
  }

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="text-xl font-bold text-slate-900">页面板块</h2><p className="mt-1 text-sm text-slate-500">编辑预设的网站板块内容，不改变页面整体布局。</p></div>
        <div className="flex items-end gap-3">
          <label><span className="block text-xs font-bold uppercase text-slate-500">页面</span><select value={pageKey} onChange={(event) => setPageKey(event.target.value)} className="mt-1 min-w-48 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">{pages.length ? pages.map((page) => <option key={page.key} value={page.key}>{PAGE_LABELS[page.key] || page.label}</option>) : <option value="home">首页</option>}</select></label>
          <button type="button" onClick={saveAll} disabled={saving || loading} className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "保存中..." : "保存页面"}</button>
        </div>
      </div>
      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{message}</div> : null}
      {loading ? <div className="flex items-center gap-2 py-12 text-sm text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" /> 页面板块加载中...</div> : null}
      {!loading ? <div className="space-y-4">{sections.map((section, index) => (
        <article key={section.sectionKey} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-bold text-slate-900">{SECTION_LABELS[section.sectionKey] || section.sectionKey}</h3><span className="text-xs text-slate-400">{section.pageKey}.{section.sectionKey}</span></div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={section.enabled} onChange={(event) => updateSection(index, { enabled: event.target.checked })} /> 启用</label>
              <button type="button" title="上移板块" aria-label="上移板块" onClick={() => move(index, -1)} disabled={index === 0} className="rounded-md border border-slate-200 p-2 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" title="下移板块" aria-label="下移板块" onClick={() => move(index, 1)} disabled={index === sections.length - 1} className="rounded-md border border-slate-200 p-2 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {(["eyebrow", "title", "buttonLabel", "buttonHref", "mediaAlt"] as const).map((field) => <label key={field}><span className="text-xs font-bold uppercase text-slate-500">{{ eyebrow: "眉题", title: "标题", buttonLabel: "按钮文字", buttonHref: "按钮链接", mediaAlt: "媒体替代文字" }[field]}</span><input value={section[field]} onChange={(event) => updateSection(index, { [field]: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>)}
            <div className="md:col-span-2"><MediaUploader label="板块媒体" value={section.mediaUrl} onChange={(url) => updateSection(index, { mediaUrl: url || "" })} kind={section.mediaUrl.toLowerCase().endsWith(".mp4") ? "video" : "image"} /></div>
            <label className="md:col-span-2"><span className="text-xs font-bold uppercase text-slate-500">正文</span><textarea rows={4} value={section.body} onChange={(event) => updateSection(index, { body: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="md:col-span-2"><span className="text-xs font-bold uppercase text-slate-500">结构化内容（JSON）</span><textarea rows={8} spellCheck={false} value={section.dataJson} onChange={(event) => updateSection(index, { dataJson: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs" /></label>
          </div>
        </article>
      ))}</div> : null}
    </div>
  );
}
