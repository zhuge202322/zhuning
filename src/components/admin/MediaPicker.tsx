"use client";

import { useEffect, useState } from "react";
import { Check, Film, Image as ImageIcon, Loader2, Search, X } from "lucide-react";

export type MediaAsset = {
  id: number;
  originalName: string;
  fileName: string;
  url: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  alt: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  open: boolean;
  kind?: "image" | "video";
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
};

export default function MediaPicker({ open, kind, onClose, onSelect }: Props) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadPage(cursor: string | null, append: boolean, signal?: AbortSignal) {
    append ? setLoadingMore(true) : setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ type: kind || "all", limit: "24" });
      if (query.trim()) params.set("q", query.trim());
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/admin/media/assets?${params}`, { cache: "no-store", signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "媒体加载失败");
      const incoming = Array.isArray(data.items) ? data.items as MediaAsset[] : [];
      setAssets((current) => {
        const merged = append ? [...current, ...incoming] : incoming;
        return [...new Map(merged.map((asset: MediaAsset) => [asset.id, asset])).values()];
      });
      setNextCursor(data.nextCursor);
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(caught instanceof Error ? caught.message : "媒体加载失败");
    } finally {
      if (!signal?.aborted) { setLoading(false); setLoadingMore(false); }
    }
  }

  useEffect(() => {
    if (!open) return;
    setAssets([]);
    setNextCursor(null);
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadPage(null, false, controller.signal), 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query, kind]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-label="选择媒体">
      <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div><h2 className="font-bold text-slate-900">从媒体库选择</h2><p className="text-xs text-slate-500">选择已有的{kind === "video" ? "视频" : kind === "image" ? "图片" : "媒体"}资源。</p></div>
          <button type="button" onClick={onClose} title="关闭媒体选择器" className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="border-b border-slate-200 p-4">
          <label className="relative block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文件名或替代文字" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-primary" /></label>
        </div>
        <div className="min-h-64 flex-1 overflow-y-auto p-4">
          {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />媒体加载中...</div> : null}
          {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {!loading && !error && assets.length === 0 ? <div className="py-16 text-center text-sm text-slate-500">没有匹配的媒体资源。</div> : null}
          {!loading && !error && assets.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{assets.map((asset) => (
            <button key={asset.id} type="button" onClick={() => { onSelect(asset); onClose(); }} className="group overflow-hidden rounded-md border border-slate-200 bg-white text-left hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
              <div className="relative aspect-square bg-slate-100">
                {asset.mimeType.startsWith("video/") ? <video src={asset.url} className="h-full w-full object-cover" muted playsInline /> : <img src={asset.url} alt={asset.alt || asset.originalName} className="h-full w-full object-cover" />}
                <span className="absolute right-2 top-2 rounded-md bg-white/90 p-1 text-slate-700">{asset.mimeType.startsWith("video/") ? <Film className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}</span>
                <span className="absolute inset-0 flex items-center justify-center bg-brand-primary/70 opacity-0 transition group-hover:opacity-100"><Check className="h-7 w-7 text-white" /></span>
              </div>
              <div className="p-2"><p className="truncate text-xs font-semibold text-slate-800">{asset.originalName}</p><p className="truncate text-[11px] text-slate-500">{asset.alt || "暂无替代文字"}</p></div>
            </button>
          ))}</div> : null}
          {!loading && !error && nextCursor ? <div className="mt-5 flex justify-center"><button type="button" disabled={loadingMore} onClick={() => void loadPage(nextCursor, true)} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">{loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}加载更多</button></div> : null}
        </div>
      </div>
    </div>
  );
}
