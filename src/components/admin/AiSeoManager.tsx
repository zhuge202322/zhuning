"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, LoaderCircle, RefreshCw, Save, Search, Sparkles } from "lucide-react";
import type { SeoTargetType } from "@/lib/cms-types";
import type { AiConfigPublic, AiGenerateResult, SeoDraft, SeoRecord, SeoTarget } from "@/lib/seo-types";

const TYPE_OPTIONS: Array<{ value: SeoTargetType; label: string }> = [
  { value: "PRODUCT", label: "产品" },
  { value: "CATEGORY", label: "产品类目" },
  { value: "POST", label: "文章" },
  { value: "PAGE", label: "静态页面" },
];

const EMPTY_DRAFT: SeoDraft = { title: "", description: "", keywords: [], canonicalUrl: "", ogImage: "", robots: "index,follow" };

export function AiSeoManager() {
  const [config, setConfig] = useState<AiConfigPublic | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [type, setType] = useState<SeoTargetType>("PRODUCT");
  const [targets, setTargets] = useState<SeoTarget[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<AiGenerateResult[]>([]);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => { void loadConfig(); }, []);
  useEffect(() => { setSelected([]); setResults([]); void loadTargets(""); }, [type]);

  async function jsonRequest(url: string, options?: RequestInit) {
    const response = await fetch(url, { cache: "no-store", ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "请求失败");
    return data;
  }

  async function loadConfig() {
    setError("");
    try { setConfig((await jsonRequest("/api/admin/ai-seo/config")).config); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "AI 配置加载失败"); }
  }

  async function saveConfig() {
    if (!config) return;
    setBusy("config"); setError(""); setMessage("");
    try {
      const data = await jsonRequest("/api/admin/ai-seo/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: config.endpoint, model: config.model, enabled: config.enabled, apiKey }) });
      setConfig(data.config); setApiKey(""); setMessage("AI 服务配置已加密保存。");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "AI 配置保存失败"); }
    finally { setBusy(""); }
  }

  async function loadTargets(query = search) {
    setBusy("targets"); setError("");
    try { setTargets((await jsonRequest(`/api/admin/seo?type=${type}&search=${encodeURIComponent(query)}`)).targets); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "内容列表加载失败"); }
    finally { setBusy(""); }
  }

  function toggleTarget(key: string) {
    setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : current.length >= 20 ? current : [...current, key]);
  }

  async function generate() {
    if (!selected.length) { setError("请至少选择一个内容。"); return; }
    setBusy("generate"); setError(""); setMessage("");
    try {
      const data = await jsonRequest("/api/admin/ai-seo/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targets: selected.map((key) => ({ type, key })), overwrite }) });
      setResults(data.results); setMessage("SEO 草稿已生成，请审核后逐条保存。");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "AI SEO 生成失败"); }
    finally { setBusy(""); }
  }

  async function loadSaved(target: SeoTarget) {
    setBusy(`load:${target.key}`); setError("");
    try {
      const data = await jsonRequest(`/api/admin/seo?type=${target.type}&key=${encodeURIComponent(target.key)}`) as { seo: SeoRecord | null };
      setResults((current) => [{ type: target.type, key: target.key, label: target.label, status: "generated", draft: data.seo ? { title: data.seo.title, description: data.seo.description, keywords: data.seo.keywords, canonicalUrl: data.seo.canonicalUrl, ogImage: data.seo.ogImage, robots: data.seo.robots } : { ...EMPTY_DRAFT, ogImage: target.image } }, ...current.filter((item) => item.key !== target.key)]);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "SEO 内容加载失败"); }
    finally { setBusy(""); }
  }

  function updateDraft(key: string, field: keyof SeoDraft, value: string) {
    setResults((current) => current.map((item) => item.key === key && item.draft ? { ...item, draft: { ...item.draft, [field]: field === "keywords" ? value.split(",").map((word) => word.trim()).filter(Boolean) : value } } : item));
  }

  async function saveSeo(result: AiGenerateResult) {
    if (!result.draft) return;
    setBusy(`save:${result.key}`); setError(""); setMessage("");
    try {
      await jsonRequest("/api/admin/seo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetType: result.type, targetKey: result.key, ...result.draft }) });
      setMessage(`“${result.label}”的 SEO 已保存。`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "SEO 保存失败"); }
    finally { setBusy(""); }
  }

  const generatedCount = useMemo(() => results.filter((item) => item.status === "generated").length, [results]);

  return (
    <div className="max-w-6xl space-y-6">
      <div><h2 className="text-xl font-bold text-slate-900">AI SEO 优化</h2><p className="mt-1 text-sm text-slate-500">使用 AI 生成英文 SEO 草稿，审核修改后再发布到网站。</p></div>
      {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{message}</div>}

      <section className="rounded-lg border border-sky-200 bg-sky-50 p-5 text-sm text-sky-950">
        <h3 className="font-bold">使用说明</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>先在“AI 服务配置”中填写中转 API 地址、模型和 API Key，并保存配置。</li>
          <li>选择内容类型，搜索并勾选需要优化的产品、类目或页面，最多 20 项。</li>
          <li>点击“生成 SEO 草稿”，检查标题、描述、关键词、Canonical 和 Robots 设置。</li>
          <li>确认内容准确后，点击每条结果的“保存 SEO”；AI 内容不会自动发布。</li>
        </ol>
        <p className="mt-3 text-xs text-sky-800">API Key 只会加密保存于 SQLite，页面不会显示完整密钥。生成失败时请先检查 API 地址、模型名称、Key 状态和服务器网络。</p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2"><KeyRound className="h-5 w-5 text-brand-primary" /><h3 className="font-bold text-slate-900">AI 服务配置</h3></div>
        {!config ? <div className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />加载配置...</div> : <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">API 地址<input value={config.endpoint} onChange={(event) => setConfig({ ...config, endpoint: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm" /></label>
          <label className="text-sm font-semibold text-slate-700">模型<input value={config.model} onChange={(event) => setConfig({ ...config, model: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm" /></label>
          <label className="text-sm font-semibold text-slate-700">API Key<input type="password" autoComplete="new-password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={config.hasApiKey ? "留空表示保留现有 Key" : "请输入 API Key"} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm" /><span className="mt-1 block text-xs font-normal text-slate-500">{config.hasApiKey ? `已配置（末四位：${config.keyHint}）` : "尚未配置"}</span></label>
          <div className="flex items-end justify-between gap-4"><label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={config.enabled} onChange={(event) => setConfig({ ...config, enabled: event.target.checked })} />启用 AI SEO</label><button type="button" onClick={saveConfig} disabled={busy === "config"} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{busy === "config" ? "保存中..." : "保存配置"}</button></div>
        </div>}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
          <label className="text-sm font-semibold text-slate-700">内容类型<select value={type} onChange={(event) => setType(event.target.value as SeoTargetType)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">{TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-700">搜索内容<input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void loadTargets(); }} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" placeholder="输入名称搜索" /></label>
          <button type="button" onClick={() => loadTargets()} className="mt-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700"><Search className="h-4 w-4" />搜索</button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-slate-100 py-3"><p className="text-sm text-slate-500">已选择 {selected.length} 项，最多选择 20 项。批量生成不会自动保存。</p><div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} />允许覆盖已有 SEO 草稿</label><button type="button" onClick={generate} disabled={!selected.length || busy === "generate"} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Sparkles className="h-4 w-4" />{busy === "generate" ? "生成中..." : "生成 SEO 草稿"}</button></div></div>
        <div className="mt-3 max-h-80 divide-y divide-slate-100 overflow-y-auto border border-slate-200">
          {busy === "targets" ? <div className="flex items-center gap-2 p-4 text-sm text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" />加载内容...</div> : targets.map((target) => <div key={target.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-3"><input aria-label={`选择 ${target.label}`} type="checkbox" checked={selected.includes(target.key)} onChange={() => toggleTarget(target.key)} disabled={!selected.includes(target.key) && selected.length >= 20} /><div className="min-w-0"><strong className="block truncate text-sm text-slate-800">{target.label}</strong><span className="block truncate text-xs text-slate-500">{target.key}</span></div><button type="button" onClick={() => loadSaved(target)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700">编辑 SEO</button></div>)}
          {!targets.length && busy !== "targets" && <p className="p-4 text-sm text-slate-500">没有找到内容。</p>}
        </div>
      </section>

      {results.length > 0 && <section className="space-y-4"><div className="flex items-center justify-between"><h3 className="font-bold text-slate-900">草稿审核（{generatedCount}）</h3><span className="text-xs text-slate-500">AI 输出不会自动发布</span></div>{results.map((result) => result.status !== "generated" || !result.draft ? <div key={result.key} className={`rounded-md border p-4 text-sm ${result.status === "failed" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}><strong>{result.label}</strong>：{result.error}</div> : <article key={result.key} className="rounded-lg border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-slate-900">{result.label}</strong><span className="text-xs text-slate-500">{result.type} / {result.key}</span></div><button type="button" onClick={() => saveSeo(result)} disabled={busy === `save:${result.key}`} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />保存 SEO</button></div><div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">SEO 标题（{result.draft.title.length}/70）<input value={result.draft.title} onChange={(event) => updateDraft(result.key, "title", event.target.value)} maxLength={70} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm font-semibold text-slate-700">Robots<select value={result.draft.robots} onChange={(event) => updateDraft(result.key, "robots", event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"><option value="index,follow">允许收录</option><option value="noindex,follow">不收录，允许跟踪链接</option></select></label>
            <label className="text-sm font-semibold text-slate-700 md:col-span-2">SEO 描述（{result.draft.description.length}/170）<textarea value={result.draft.description} onChange={(event) => updateDraft(result.key, "description", event.target.value)} maxLength={170} rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm font-semibold text-slate-700 md:col-span-2">关键词（逗号分隔）<input value={result.draft.keywords.join(", ")} onChange={(event) => updateDraft(result.key, "keywords", event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm font-semibold text-slate-700">Canonical 地址<input value={result.draft.canonicalUrl} onChange={(event) => updateDraft(result.key, "canonicalUrl", event.target.value)} placeholder="留空使用系统生成地址" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
            <label className="text-sm font-semibold text-slate-700">社交分享图片<input value={result.draft.ogImage} onChange={(event) => updateDraft(result.key, "ogImage", event.target.value)} placeholder="/uploads/... 或 https://..." className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
          </div></article>)}</section>}
    </div>
  );
}
