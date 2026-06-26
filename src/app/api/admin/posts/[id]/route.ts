import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const post = await prisma.post.findUnique({ where: { id: Number(id) } });
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(post);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const {
    title, slug, excerpt, content, featuredImage, authorName, date,
    titleFr, titleEs, titleAr,
    excerptFr, excerptEs, excerptAr,
    contentFr, contentEs, contentAr,
  } = body;

  const post = await prisma.post.update({
    where: { id: Number(id) },
    data: {
      title,
      slug,
      excerpt: excerpt || '',
      content: content || '',
      featuredImage: featuredImage || null,
      authorName: authorName || 'Myklens Team',
      date: date ? new Date(date) : undefined,
      titleFr: titleFr ?? '', titleEs: titleEs ?? '', titleAr: titleAr ?? '',
      excerptFr: excerptFr ?? '', excerptEs: excerptEs ?? '', excerptAr: excerptAr ?? '',
      contentFr: contentFr ?? '', contentEs: contentEs ?? '', contentAr: contentAr ?? '',
    },
  });
  return NextResponse.json(post);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await prisma.post.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
