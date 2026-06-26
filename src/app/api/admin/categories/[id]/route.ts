import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { name, slug, imageUrl, nameFr, nameEs, nameAr } = body;
  const cat = await prisma.category.update({
    where: { id: Number(id) },
    data: {
      name, slug, imageUrl: imageUrl ?? null,
      ...(nameFr !== undefined ? { nameFr } : {}),
      ...(nameEs !== undefined ? { nameEs } : {}),
      ...(nameAr !== undefined ? { nameAr } : {}),
    },
  });
  return NextResponse.json(cat);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await prisma.category.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
