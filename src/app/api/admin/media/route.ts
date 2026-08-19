import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminResponse, requireAdmin } from '@/lib/admin-guard';
import { isSafeMediaUrl } from '@/lib/cms-registry';
import { parseJsonObject, prismaErrorResponse } from '@/lib/api-route';
import { errorResponse } from '@/lib/input-validation';

export async function GET() {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const rows = await prisma.siteMedia.findMany({ orderBy: { id: 'asc' } });
  return NextResponse.json(rows);
}

/**
 * Bulk update site media URLs.
 * Body: { items: [{ key: string, url: string }] }
 */
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const parsed = await parseJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const items = Array.isArray(parsed.data.items) ? parsed.data.items : [];

  if (items.length === 0) {
    return errorResponse('No items provided');
  }

  const validated: { key: string; url: string }[] = [];
  const keys = new Set<string>();
  for (const item of items) {
    if (!item || typeof item !== 'object' || typeof item.key !== 'string' || !item.key.trim() || typeof item.url !== 'string' || !isSafeMediaUrl(item.url)) {
      return errorResponse('Invalid media item');
    }
    const key = item.key.trim();
    if (keys.has(key)) return errorResponse('Duplicate media key');
    keys.add(key);
    validated.push({ key, url: item.url.trim() });
  }

  const existing = await prisma.siteMedia.findMany({ where: { key: { in: [...keys] } }, select: { key: true } });
  if (existing.length !== validated.length) return errorResponse('Media record not found', 404);

  try {
    await prisma.$transaction(validated.map((item) => prisma.siteMedia.update({
      where: { key: item.key },
      data: { url: item.url },
    })));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return prismaErrorResponse(error) ?? errorResponse('Internal server error', 500);
  }
}
