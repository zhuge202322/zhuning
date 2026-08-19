"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, Save } from "lucide-react";

type Setting = { key: string; value: string; label: string; type: string; group: string };

const GROUP_LABELS: Record<string, string> = {
  brand: "Brand",
  support: "Customer service",
  company: "Company",
  social: "Social media",
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
      if (!response.ok) throw new Error(data.error || "Failed to load settings");
      setSettings(data.settings);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load settings");
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
      if (!response.ok) throw new Error(data.error || "Failed to save settings");
      setMessage("Settings saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const groups = useMemo(() => Object.entries(GROUP_LABELS).map(([key, label]) => ({
    key,
    label,
    settings: settings.filter((setting) => setting.group === key),
  })), [settings]);

  if (loading) return <div className="flex items-center gap-2 py-12 text-sm text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" /> Loading settings...</div>;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-bold text-slate-900">Site settings</h2><p className="mt-1 text-sm text-slate-500">Manage the storefront brand, customer service details, company address, and social links.</p></div>
        <button type="button" onClick={saveSettings} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save settings"}</button>
      </div>
      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{message}</div> : null}
      {groups.map((group) => (
        <section key={group.key} className="border-t border-slate-200 pt-5">
          <h3 className="mb-4 text-sm font-bold uppercase text-slate-700">{group.label}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {group.settings.map((setting) => (
              <label key={setting.key} className={setting.type === "textarea" ? "md:col-span-2" : ""}>
                <span className="text-sm font-semibold text-slate-700">{setting.label}</span>
                <span className="ml-2 font-mono text-xs text-slate-400">{setting.key}</span>
                {setting.type === "textarea" ? (
                  <textarea rows={3} value={setting.value} onChange={(event) => setSettings((current) => current.map((item) => item.key === setting.key ? { ...item, value: event.target.value } : item))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-primary" />
                ) : (
                  <input type={setting.type === "email" ? "email" : "text"} value={setting.value} onChange={(event) => setSettings((current) => current.map((item) => item.key === setting.key ? { ...item, value: event.target.value } : item))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-primary" />
                )}
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
