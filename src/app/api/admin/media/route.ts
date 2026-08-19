import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminResponse, requireAdmin } from '@/lib/admin-guard';
import { isSafeMediaUrl } from '@/lib/cms-registry';
import { parseJsonObject, prismaErrorResponse } from '@/lib/api-route';
import { errorResponse } from '@/lib/input-validation';
import { assertLocalMediaAssetsExist, MissingMediaAssetError } from '@/lib/media-asset-validation';

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

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.siteMedia.findMany({ where: { key: { in: [...keys] } }, select: { key: true } });
      if (existing.length !== validated.length) throw new Error('MEDIA_RECORD_NOT_FOUND');
      await assertLocalMediaAssetsExist(tx, validated);
      await Promise.all(validated.map((item) => tx.siteMedia.update({ where: { key: item.key }, data: { url: item.url } })));
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MissingMediaAssetError) return errorResponse(error.message);
    if (error instanceof Error && error.message === 'MEDIA_RECORD_NOT_FOUND') return errorResponse('Media record not found', 404);
    return prismaErrorResponse(error) ?? errorResponse('Internal server error', 500);
  }
}
