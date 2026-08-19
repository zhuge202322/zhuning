"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Clipboard, Film, Image as ImageIcon, Loader2, Pencil, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import type { MediaAsset } from "@/components/admin/MediaPicker";
import { replaceMediaAsset, uploadMediaAsset } from "@/components/admin/uploadMediaAsset";

type MediaType = "all" | "image" | "video";
type Reference = { type: string; id: number; field: string; label: string };

export default function MediaLibrary() {
  const uploadRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<MediaType>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | "upload" | null>(null);
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [replacing, setReplacing] = useState<MediaAsset | null>(null);
  const [error, setError] = useState("");
  const [references, setReferences] = useState<Reference[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadAssets = useCallback(async ({ cursor = null, append = false, signal }: { cursor?: string | null; append?: boolean; signal?: AbortSignal } = {}) => {
    append ? setLoadingMore(true) : setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ type, limit: "24" });
      if (query.trim()) params.set("q", query.trim());
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/admin/media/assets?${params}`, { cache: "no-store", signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "媒体资源加载失败");
      const incoming = Array.isArray(data.items) ? data.items as MediaAsset[] : [];
      setAssets((current) => {
        const merged = append ? [...current, ...incoming] : incoming;
        return [...new Map(merged.map((asset: MediaAsset) => [asset.id, asset])).values()];
      });
      setNextCursor(data.nextCursor);
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(caught instanceof Error ? caught.message : "媒体资源加载失败");
    } finally { if (!signal?.aborted) { setLoading(false); setLoadingMore(false); } }
  }, [query, type]);

  useEffect(() => {
    setAssets([]);
    setNextCursor(null);
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadAssets({ signal: controller.signal }), 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [loadAssets]);

  async function uploadFiles(files: FileList) {
    setBusyId("upload"); setError("");
    try {
      for (const file of Array.from(files)) {
        await uploadMediaAsset(file);
      }
      await loadAssets();
      } catch (caught) { setError(caught instanceof Error ? caught.message : "上传失败"); }
    finally { setBusyId(null); }
  }

  async function saveAlt() {
    if (!editing) return;
    setBusyId(editing.id); setError("");
    try {
      const response = await fetch(`/api/admin/media/assets/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alt: editing.alt, expectedUpdatedAt: editing.updatedAt }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "替代文字更新失败");
      setAssets((current) => current.map((asset) => asset.id === data.asset.id ? data.asset : asset));
      setEditing(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "替代文字更新失败"); }
    finally { setBusyId(null); }
  }

  async function replace(file: File) {
    if (!replacing) return;
    const target = replacing;
    setBusyId(target.id); setError("");
    try {
      const data = await replaceMediaAsset(target, file);
      setAssets((current) => current.map((asset) => asset.id === data.asset.id ? data.asset : asset));
      setReplacing(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "媒体替换失败"); }
    finally { setBusyId(null); }
  }

  async function remove(asset: MediaAsset) {
    if (!window.confirm(`确定删除“${asset.originalName}”吗？此操作无法撤销。`)) return;
    setBusyId(asset.id); setError(""); setReferences([]);
    try {
      const response = await fetch(`/api/admin/media/assets/${asset.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409 && Array.isArray(data.references)) setReferences(data.references);
        throw new Error(data.error || "媒体删除失败");
      }
      setAssets((current) => current.filter((item) => item.id !== asset.id));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "媒体删除失败"); }
    finally { setBusyId(null); }
  }

  async function copyUrl(asset: MediaAsset) {
    await navigator.clipboard.writeText(`${window.location.origin}${asset.url}`);
    setCopiedId(asset.id); window.setTimeout(() => setCopiedId(null), 1400);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="text-xl font-bold text-slate-900">媒体库</h2><p className="mt-1 text-sm text-slate-500">上传并复用本地图片和视频资源。</p></div>
        <button type="button" onClick={() => uploadRef.current?.click()} disabled={busyId === "upload"} className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busyId === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{busyId === "upload" ? "上传中..." : "上传媒体"}</button>
      </div>
      <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4" multiple className="hidden" onChange={(event) => { if (event.target.files?.length) void uploadFiles(event.target.files); event.target.value = ""; }} />
      <div className="flex flex-wrap gap-3 border-y border-slate-200 py-4">
        <label className="relative min-w-64 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文件名或替代文字" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-primary" /></label>
        <div className="inline-flex rounded-md border border-slate-300 bg-white p-1">{(["all", "image", "video"] as const).map((option) => <button key={option} type="button" onClick={() => setType(option)} className={`rounded px-3 py-1.5 text-sm font-semibold ${type === option ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{option === "all" ? "全部" : option === "image" ? "图片" : "视频"}</button>)}</div>
        <button type="button" onClick={() => void loadAssets()} title="刷新媒体" className="rounded-md border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /></button>
      </div>
      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><p className="font-semibold">{error}</p>{references.length ? <ul className="mt-2 space-y-1 text-xs">{references.map((reference) => <li key={`${reference.type}-${reference.id}-${reference.field}`}>{reference.type}: {reference.label} ({reference.field})</li>)}</ul> : null}</div> : null}
      {loading ? <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />媒体资源加载中...</div> : null}
      {!loading && !error && assets.length === 0 ? <div className="border-y border-slate-200 py-20 text-center"><ImageIcon className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-600">暂无媒体资源</p><p className="mt-1 text-xs text-slate-400">请上传文件或调整搜索筛选条件。</p></div> : null}
      {!loading && assets.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{assets.map((asset) => (
        <article key={asset.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="relative aspect-[4/3] bg-slate-100">{asset.mimeType.startsWith("video/") ? <video src={asset.url} controls preload="metadata" className="h-full w-full object-cover" /> : <img src={asset.url} alt={asset.alt || asset.originalName} className="h-full w-full object-cover" />}<span className="absolute left-2 top-2 rounded-md bg-white/90 p-1.5 text-slate-700">{asset.mimeType.startsWith("video/") ? <Film className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}</span></div>
          <div className="space-y-3 p-3"><div><p className="truncate text-sm font-bold text-slate-900" title={asset.originalName}>{asset.originalName}</p><p className="mt-0.5 text-xs text-slate-500">{asset.width && asset.height ? `${asset.width} x ${asset.height} · ` : ""}{(asset.byteSize / 1024).toFixed(1)} KB</p><p className="mt-1 truncate text-xs text-slate-500">{asset.alt || "暂无替代文字"}</p></div>
            <div className="grid grid-cols-4 gap-1 border-t border-slate-100 pt-2">
              <button type="button" onClick={() => void copyUrl(asset)} title="复制链接" className="flex justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100">{copiedId === asset.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Clipboard className="h-4 w-4" />}</button>
              <button type="button" onClick={() => setEditing({ ...asset })} title="编辑替代文字" className="flex justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
              <button type="button" onClick={() => { setReplacing(asset); replaceRef.current?.click(); }} title="替换文件" className="flex justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100"><RefreshCw className="h-4 w-4" /></button>
              <button type="button" disabled={busyId === asset.id} onClick={() => void remove(asset)} title="删除媒体" className="flex justify-center rounded-md p-2 text-red-600 hover:bg-red-50 disabled:opacity-50">{busyId === asset.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>
            </div>
          </div>
        </article>
      ))}</div> : null}
      {!loading && nextCursor ? <div className="flex justify-center"><button type="button" disabled={loadingMore} onClick={() => void loadAssets({ cursor: nextCursor, append: true })} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">{loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}加载更多</button></div> : null}
      <input ref={replaceRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void replace(file); event.target.value = ""; }} />
      {editing ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"><div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl"><h3 className="font-bold text-slate-900">编辑替代文字</h3><p className="mt-1 truncate text-xs text-slate-500">{editing.originalName}</p><textarea autoFocus rows={4} value={editing.alt} onChange={(event) => setEditing({ ...editing, alt: event.target.value })} className="mt-4 w-full rounded-md border border-slate-300 p-3 text-sm outline-none focus:border-brand-primary" /><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">取消</button><button type="button" onClick={() => void saveAlt()} disabled={busyId === editing.id} className="rounded-md bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">保存</button></div></div></div> : null}
    </div>
  );
}
