import {
  getOverview, getLandingStats, getTopPages, getSourceBreakdown,
  getDeviceBreakdown, getDailyTrend, getRecentVisits, type Range,
} from '@/lib/analytics-query';
import { Eye, Users, Megaphone, Smartphone } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const RANGES: { v: Range; label: string }[] = [
  { v: 1, label: 'Today' },
  { v: 7, label: '7 days' },
  { v: 30, label: '30 days' },
  { v: 90, label: '90 days' },
];

const SOURCE_LABEL: Record<string, string> = {
  google_ads: 'Google Ads',
  facebook_ads: 'Facebook Ads',
  google: 'Google (organic)',
  facebook: 'Facebook',
  bing: 'Bing',
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  twitter: 'Twitter / X',
  referral: 'Referral',
  direct: 'Direct',
};
const SOURCE_COLOR: Record<string, string> = {
  google_ads: 'bg-blue-500',
  facebook_ads: 'bg-indigo-500',
  google: 'bg-sky-400',
  facebook: 'bg-violet-500',
  direct: 'bg-slate-400',
  referral: 'bg-amber-500',
};

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const days = (Number(sp?.range) || 7) as Range;
  const rangeValue: Range = ([1, 7, 30, 90].includes(days) ? days : 7) as Range;

  const [overview, googleLp, fbLp, topPages, sources, devices, trend, recent] = await Promise.all([
    getOverview(rangeValue),
    getLandingStats('/landing', rangeValue),
    getLandingStats('/facebook-landing', rangeValue),
    getTopPages(rangeValue),
    getSourceBreakdown(rangeValue),
    getDeviceBreakdown(rangeValue),
    getDailyTrend(rangeValue),
    getRecentVisits(20),
  ]);

  const totalSourceCount = sources.reduce((a, b) => a + b.count, 0) || 1;
  const maxTrend = Math.max(1, ...trend.map((t) => t.pv));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Analytics</h2>
          <p className="text-sm text-slate-500">Visitor traffic insights from the last {rangeValue} day(s).</p>
        </div>
        <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {RANGES.map((r) => (
            <Link
              key={r.v}
              href={`/admin/analytics?range=${r.v}`}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                rangeValue === r.v ? 'bg-brand-primary text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Page Views" value={overview.pv} icon={Eye} color="bg-blue-500" />
        <StatCard label="Unique Visitors" value={overview.uv} icon={Users} color="bg-emerald-500" />
        <StatCard
          label="Google Landing PV"
          value={googleLp.pv}
          subtitle={`${googleLp.uv} unique`}
          icon={Megaphone}
          color="bg-sky-500"
          href="/landing"
        />
        <StatCard
          label="Facebook Landing PV"
          value={fbLp.pv}
          subtitle={`${fbLp.uv} unique`}
          icon={Megaphone}
          color="bg-violet-500"
          href="/facebook-landing"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Daily traffic</h3>
        <div className="h-48 flex items-end gap-1">
          {trend.map((t) => {
            const h = (t.pv / maxTrend) * 100;
            return (
              <div key={t.date} className="flex-1 flex flex-col items-center group">
                <div className="w-full relative flex items-end" style={{ height: '100%' }}>
                  <div
                    className="w-full bg-brand-primary rounded-t-md transition-all"
                    style={{ height: `${h}%` }}
                    title={`${t.date}: ${t.pv} PV / ${t.uv} UV`}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-flow-col auto-cols-fr text-[10px] text-slate-400 mt-2">
          {trend.map((t, i) => (
            <span key={t.date} className="text-center">
              {rangeValue <= 7 ? t.date.slice(5) : i % Math.ceil(trend.length / 8) === 0 ? t.date.slice(5) : ''}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Top pages</h3>
          <div className="space-y-2">
            {topPages.length === 0 && <p className="text-sm text-slate-400">No data yet.</p>}
            {topPages.map((p) => {
              const max = topPages[0].count;
              const pct = (p.count / max) * 100;
              return (
                <div key={p.path} className="flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="relative h-7 rounded-md bg-slate-100 overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-brand-primary/15" style={{ width: `${pct}%` }} />
                      <div className="absolute inset-0 px-3 flex items-center font-mono text-xs text-slate-700 truncate">
                        {p.path}
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-slate-700 w-12 text-right">{p.count}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Traffic sources</h3>
          <div className="space-y-3">
            {sources.length === 0 && <p className="text-sm text-slate-400">No data yet.</p>}
            {sources.map((s) => {
              const pct = ((s.count / totalSourceCount) * 100).toFixed(1);
              const color = SOURCE_COLOR[s.source] || 'bg-slate-400';
              return (
                <div key={s.source}>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                    <span>{SOURCE_LABEL[s.source] || s.source}</span>
                    <span className="text-slate-400">{s.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Smartphone className="w-4 h-4" /> Devices
          </h3>
          <div className="space-y-2 text-sm">
            {devices.length === 0 && <p className="text-slate-400">No data yet.</p>}
            {devices.map((d) => (
              <div key={d.device} className="flex justify-between border-b border-slate-100 pb-2 last:border-0">
                <span className="text-slate-600 capitalize">{d.device}</span>
                <span className="font-bold text-slate-800">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Recent visits</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500 uppercase">
                <tr>
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Path</th>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4">Device</th>
                  <th className="py-2">Campaign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-slate-400">No visits yet.</td></tr>
                )}
                {recent.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-2 pr-4 text-slate-500 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-slate-700">{r.path}</td>
                    <td className="py-2 pr-4 text-slate-600">{SOURCE_LABEL[r.source] || r.source}</td>
                    <td className="py-2 pr-4 text-slate-600 capitalize">{r.device || '-'}</td>
                    <td className="py-2 text-slate-500 text-xs">{r.utmCampaign || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, subtitle, icon: Icon, color, href,
}: {
  label: string; value: number; subtitle?: string; icon: any; color: string; href?: string;
}) {
  const inner = (
    <div className={`bg-white rounded-2xl p-5 border border-slate-200 ${href ? 'hover:border-brand-primary hover:shadow-md transition' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl font-extrabold text-slate-800">{value.toLocaleString()}</div>
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">{label}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
    </div>
  );
  return href ? <Link href={href} target="_blank">{inner}</Link> : inner;
}
