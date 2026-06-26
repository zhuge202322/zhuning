'use client';

import { useEffect, useState } from 'react';
import { Save, RefreshCw, Image, Film, CheckCircle2, Mail, Phone, MessageSquare, Link as LinkIcon, Settings } from 'lucide-react';
import MediaUploader from '@/components/admin/MediaUploader';

type SiteMediaItem = {
  id: number;
  key: string;
  label: string;
  url: string;
  kind: 'image' | 'video' | 'text';
};

export default function MediaManagerPage() {
  const [items, setItems] = useState<SiteMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/media');
      if (!res.ok) throw new Error('Failed to load site media items');
      const data = await res.json();
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Error loading media settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateUrl(key: string, url: string | null) {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, url: url || '' } : item))
    );
  }

  async function onSave() {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch('/api/admin/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 font-medium py-12">
        <RefreshCw className="w-5 h-5 animate-spin" /> Loading settings...
      </div>
    );
  }

  const mediaItems = items.filter((x) => x.kind !== 'text');
  const configItems = items.filter((x) => x.kind === 'text');

  function getIcon(key: string) {
    if (key.includes('email')) return <Mail className="w-4 h-4 text-slate-500" />;
    if (key.includes('phone')) return <Phone className="w-4 h-4 text-slate-500" />;
    if (key.includes('whatsapp')) return <MessageSquare className="w-4 h-4 text-emerald-600" />;
    if (key.includes('social')) return <LinkIcon className="w-4 h-4 text-brand-primary" />;
    return <Settings className="w-4 h-4 text-slate-500" />;
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">网站全局配置中心 (Media & Settings)</h2>
          <p className="text-xs text-slate-500 mt-1">
            在这里可以统一管理网站所有的本地媒体文件（Logo、背景、视频）以及邮箱、电话、WhatsApp和社交媒体等全局业务信息。
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-brand-primary text-white px-5 py-2.5 rounded-xl font-bold shadow hover:opacity-90 disabled:opacity-50 transition"
        >
          <Save className="w-4 h-4" /> {saving ? '正在保存…' : '保存修改'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 px-4 py-3">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-700 text-sm rounded-xl border border-emerald-200 px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> 网站全局配置已更新成功！
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div>
          <h3 className="text-sm font-extrabold text-slate-800">1. 页脚 & 联系页全局业务信息 (Contact & Social Links)</h3>
          <p className="text-xs text-slate-400 mt-0.5">管理员在这里修改后，页脚（Footer）和 Contact 联络页面的相关信息会实时更新。</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {configItems.map((item) => (
            <div key={item.key} className="space-y-1.5 p-4 rounded-xl bg-slate-50/50 border border-slate-200/60">
              <div className="flex items-center gap-2">
                {getIcon(item.key)}
                <span className="text-xs font-bold text-slate-700">{item.label}</span>
              </div>
              <input
                type="text"
                value={item.url}
                onChange={(e) => updateUrl(item.key, e.target.value)}
                placeholder="请输入配置内容..."
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 outline-none bg-white focus:border-brand-primary transition"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div>
          <h3 className="text-sm font-extrabold text-slate-800">2. 网站多媒体资源管理 (Media Banners)</h3>
          <p className="text-xs text-slate-400 mt-0.5">替换网站大背景图、轮播主图和公司视频。</p>
        </div>
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white">
          {mediaItems.map((item) => (
            <div key={item.key} className="p-5 flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-800">{item.label}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-200/50">
                    {item.key}
                  </span>
                  {item.kind === 'video' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded font-bold">
                      <Film className="w-3 h-3" /> 视频
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-bold">
                      <Image className="w-3 h-3" /> 图片
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 break-all font-mono">当前路径: {item.url || '未设置'}</p>
              </div>
              <div className="w-full md:w-auto shrink-0">
                <MediaUploader
                  value={item.url}
                  onChange={(url) => updateUrl(item.key, url)}
                  kind={item.kind as any}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
