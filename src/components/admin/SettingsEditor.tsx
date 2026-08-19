"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, Save } from "lucide-react";
import ImageUploader from "@/components/admin/ImageUploader";

type Setting = { key: string; value: string; label: string; type: string; group: string };

const GROUP_LABELS: Record<string, string> = {
  brand: "品牌信息",
  support: "客服联系方式",
  company: "公司信息",
  social: "社交媒体",
};

const SETTING_LABELS: Record<string, string> = {
  "site.name": "网站名称",
  "site.logo": "公司 Logo",
  "support.email": "客服邮箱",
  "support.phone": "客服电话",
  "support.whatsapp": "WhatsApp",
  "company.address": "公司地址",
  "social.instagram": "Instagram",
  "social.facebook": "Facebook",
  "social.tiktok": "TikTok",
  "social.youtube": "YouTube",
};

export function SettingsEditor() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/settings", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "网站设置加载失败");
      setSettings(data.settings);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "网站设置加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: settings.map(({ key, value }) => ({ key, value })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "网站设置保存失败");
      setMessage("网站设置已保存。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "网站设置保存失败");
    } finally {
      setSaving(false);
    }
  }

  const groups = useMemo(() => Object.entries(GROUP_LABELS).map(([key, label]) => ({
    key,
    label,
    settings: settings.filter((setting) => setting.group === key),
  })), [settings]);

  if (loading) return <div className="flex items-center gap-2 py-12 text-sm text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" /> 网站设置加载中...</div>;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-bold text-slate-900">网站设置</h2><p className="mt-1 text-sm text-slate-500">管理商城品牌、客服联系方式、公司地址和社交媒体链接。</p></div>
        <button type="button" onClick={saveSettings} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "保存中..." : "保存设置"}</button>
      </div>
      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{message}</div> : null}
      {groups.map((group) => (
        <section key={group.key} className="border-t border-slate-200 pt-5">
          <h3 className="mb-4 text-sm font-bold uppercase text-slate-700">{group.label}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {group.settings.map((setting) => (
              <div key={setting.key} className={setting.type === "textarea" ? "md:col-span-2" : ""}>
                <span className="text-sm font-semibold text-slate-700">{SETTING_LABELS[setting.key] || setting.label}</span>
                <span className="ml-2 font-mono text-xs text-slate-400">{setting.key}</span>
                {setting.type === "image" ? (
                  <div className="mt-2"><ImageUploader value={setting.value} onChange={(value) => setSettings((current) => current.map((item) => item.key === setting.key ? { ...item, value: value || "" } : item))} /></div>
                ) : setting.type === "textarea" ? (
                  <textarea rows={3} value={setting.value} onChange={(event) => setSettings((current) => current.map((item) => item.key === setting.key ? { ...item, value: event.target.value } : item))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-primary" />
                ) : (
                  <input type={setting.type === "email" ? "email" : "text"} value={setting.value} onChange={(event) => setSettings((current) => current.map((item) => item.key === setting.key ? { ...item, value: event.target.value } : item))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-primary" />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
