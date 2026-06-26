import { prisma } from '@/lib/prisma';

export type MediaMap = Record<string, string>;

/**
 * Returns a map of all configured site media: { [key]: url }.
 * Used by layouts and server components to feed both inline rendering
 * and client components (Header / HeroCarousel) via props.
 */
export async function getAllSiteMedia(): Promise<MediaMap> {
  const rows = await prisma.siteMedia.findMany();
  const map: MediaMap = {};
  for (const r of rows) map[r.key] = r.url;
  return map;
}

/**
 * Server-side helper to look up a single media URL with a fallback.
 */
export async function getMedia(key: string, fallback = ''): Promise<string> {
  const row = await prisma.siteMedia.findUnique({ where: { key } });
  return row?.url || fallback;
}

/**
 * Pure helper: pick from a preloaded map with fallback.
 */
export function pickMedia(map: MediaMap, key: string, fallback = ''): string {
  return map[key] || fallback;
}
