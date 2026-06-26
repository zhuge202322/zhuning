import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cats = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json(cats);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, slug, imageUrl, nameFr, nameEs, nameAr } = body;
  if (!name || !slug) return NextResponse.json({ error: 'Name and slug required' }, { status: 400 });
  const cat = await prisma.category.create({
    data: {
      name, slug, imageUrl: imageUrl || null,
      nameFr: nameFr || '', nameEs: nameEs || '', nameAr: nameAr || '',
    },
  });
  return NextResponse.json(cat);
}
