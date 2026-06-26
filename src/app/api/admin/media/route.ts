import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const rows = await prisma.siteMedia.findMany({ orderBy: { id: 'asc' } });
  return NextResponse.json(rows);
}

/**
 * Bulk update site media URLs.
 * Body: { items: [{ key: string, url: string }] }
 */
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const items: { key: string; url: string }[] = Array.isArray(body?.items) ? body.items : [];

  if (items.length === 0) {
    return NextResponse.json({ error: 'No items provided' }, { status: 400 });
  }

  for (const item of items) {
    if (!item?.key || typeof item.url !== 'string') continue;
    await prisma.siteMedia.update({
      where: { key: item.key },
      data: { url: item.url },
    });
  }

  return NextResponse.json({ ok: true });
}
