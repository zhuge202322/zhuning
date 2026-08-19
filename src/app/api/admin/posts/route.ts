import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminResponse, requireAdmin } from '@/lib/admin-guard';
import { errorResponse, validatePostInput } from '@/lib/input-validation';
import { parseJsonObject, prismaErrorResponse } from '@/lib/api-route';
import { postScalarData } from '@/lib/catalog-write-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const posts = await prisma.post.findMany({ orderBy: { date: 'desc' } });
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const parsed = await parseJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as any;
  const validation = validatePostInput(body);
  if (!validation.ok) return errorResponse(validation.error || 'Invalid post data');
  const {
    title, slug, excerpt, content, featuredImage, authorName, date,
    titleFr, titleEs, titleAr,
    excerptFr, excerptEs, excerptAr,
    contentFr, contentEs, contentAr,
  } = body;

  try {
  const post = await prisma.post.create({ data: postScalarData(body) as any });
  return NextResponse.json(post);
  } catch (error) {
    return prismaErrorResponse(error) ?? NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
