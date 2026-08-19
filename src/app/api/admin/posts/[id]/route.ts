import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminResponse, requireAdmin } from '@/lib/admin-guard';
import { errorResponse, parsePositiveId, validatePostInput } from '@/lib/input-validation';
import { parseJsonObject, prismaErrorResponse } from '@/lib/api-route';
import { postScalarData } from '@/lib/catalog-write-data';
import { assertLocalMediaAssetsExist, MissingMediaAssetError } from '@/lib/media-asset-validation';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const { id } = await ctx.params;
  const postId = parsePositiveId(id);
  if (!postId) return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(post);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const { id } = await ctx.params;
  const postId = parsePositiveId(id);
  if (!postId) return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
  const parsed = await parseJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as any;
  const validation = validatePostInput(body, 'update');
  if (!validation.ok) return errorResponse(validation.error || 'Invalid post data');
  const {
    title, slug, excerpt, content, featuredImage, authorName, date,
    titleFr, titleEs, titleAr,
    excerptFr, excerptEs, excerptAr,
    contentFr, contentEs, contentAr,
  } = body;

  try {
  const post = await prisma.$transaction(async (tx) => {
    await assertLocalMediaAssetsExist(tx, body);
    return tx.post.update({ where: { id: postId }, data: postScalarData(body) });
  });
  return NextResponse.json(post);
  } catch (error) {
    if (error instanceof MissingMediaAssetError) return errorResponse(error.message);
    return prismaErrorResponse(error) ?? NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const { id } = await ctx.params;
  const postId = parsePositiveId(id);
  if (!postId) return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
  try {
    await prisma.post.delete({ where: { id: postId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return prismaErrorResponse(error) ?? NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
