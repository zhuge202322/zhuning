import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const posts = await prisma.post.findMany({ orderBy: { date: 'desc' } });
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    title, slug, excerpt, content, featuredImage, authorName, date,
    titleFr, titleEs, titleAr,
    excerptFr, excerptEs, excerptAr,
    contentFr, contentEs, contentAr,
  } = body;
  if (!title || !slug) return NextResponse.json({ error: 'Title and slug required' }, { status: 400 });

  const post = await prisma.post.create({
    data: {
      title,
      slug,
      excerpt: excerpt || '',
      content: content || '',
      featuredImage: featuredImage || null,
      authorName: authorName || 'Myklens Team',
      date: date ? new Date(date) : new Date(),
      titleFr: titleFr || '', titleEs: titleEs || '', titleAr: titleAr || '',
      excerptFr: excerptFr || '', excerptEs: excerptEs || '', excerptAr: excerptAr || '',
      contentFr: contentFr || '', contentEs: contentEs || '', contentAr: contentAr || '',
    },
  });
  return NextResponse.json(post);
}
