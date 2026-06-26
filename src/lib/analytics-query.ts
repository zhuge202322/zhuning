import { prisma } from './prisma';

export type Range = 1 | 7 | 30 | 90;

function startDate(days: Range): Date {
  const d = new Date();
  d.setDate(d.getDate() - days + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

const baseFilter = (days: Range) => ({
  isBot: false,
  createdAt: { gte: startDate(days) },
});

export async function getOverview(days: Range) {
  const where = baseFilter(days);
  const [pv, uvRows] = await Promise.all([
    prisma.pageView.count({ where }),
    prisma.pageView.findMany({
      where,
      select: { visitorId: true },
      distinct: ['visitorId'],
    }),
  ]);
  return { pv, uv: uvRows.length };
}

export async function getLandingStats(path: string, days: Range) {
  const where = { ...baseFilter(days), path };
  const [pv, uvRows, sources] = await Promise.all([
    prisma.pageView.count({ where }),
    prisma.pageView.findMany({ where, select: { visitorId: true }, distinct: ['visitorId'] }),
    prisma.pageView.groupBy({
      by: ['source'],
      where,
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
      take: 6,
    }),
  ]);
  return {
    pv,
    uv: uvRows.length,
    sources: sources.map((s) => ({ source: s.source, count: s._count._all })),
  };
}

export async function getTopPages(days: Range, limit = 10) {
  const rows = await prisma.pageView.groupBy({
    by: ['path'],
    where: baseFilter(days),
    _count: { _all: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  });
  return rows.map((r) => ({ path: r.path, count: r._count._all }));
}

export async function getSourceBreakdown(days: Range) {
  const rows = await prisma.pageView.groupBy({
    by: ['source'],
    where: baseFilter(days),
    _count: { _all: true },
    orderBy: { _count: { id: 'desc' } },
  });
  return rows.map((r) => ({ source: r.source, count: r._count._all }));
}

export async function getDeviceBreakdown(days: Range) {
  const rows = await prisma.pageView.groupBy({
    by: ['device'],
    where: baseFilter(days),
    _count: { _all: true },
    orderBy: { _count: { id: 'desc' } },
  });
  return rows.map((r) => ({ device: r.device || 'unknown', count: r._count._all }));
}

export async function getDailyTrend(days: Range) {
  const rows = await prisma.pageView.findMany({
    where: baseFilter(days),
    select: { createdAt: true, visitorId: true },
  });
  const buckets = new Map<string, { pv: number; uv: Set<string> }>();
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { pv: 0, uv: new Set() });
  }
  for (const r of rows) {
    const key = r.createdAt.toISOString().slice(0, 10);
    const b = buckets.get(key);
    if (!b) continue;
    b.pv += 1;
    if (r.visitorId) b.uv.add(r.visitorId);
  }
  return Array.from(buckets.entries()).map(([date, v]) => ({ date, pv: v.pv, uv: v.uv.size }));
}

export async function getRecentVisits(limit = 25) {
  const rows = await prisma.pageView.findMany({
    where: { isBot: false },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true, path: true, source: true, referrer: true, device: true,
      utmSource: true, utmCampaign: true, createdAt: true,
    },
  });
  return rows;
}
