import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminResponse, requireAdmin } from '@/lib/admin-guard';
import { errorResponse, parsePositiveId, validateCategoryInput } from '@/lib/input-validation';
import { parseJsonObject, prismaErrorResponse } from '@/lib/api-route';
import { categoryScalarData } from '@/lib/catalog-write-data';
import { assertLocalMediaAssetsExist, MissingMediaAssetError } from '@/lib/media-asset-validation';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const { id } = await ctx.params;
  const categoryId = parsePositiveId(id);
  if (!categoryId) return NextResponse.json({ error: 'Invalid category id' }, { status: 400 });
  const parsed = await parseJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as any;
  const validation = validateCategoryInput(body, 'update');
  if (!validation.ok) return errorResponse(validation.error || 'Invalid category data');
  const { name, slug, imageUrl, nameFr, nameEs, nameAr } = body;
  try {
    const cat = await prisma.$transaction(async (tx) => {
      await assertLocalMediaAssetsExist(tx, body);
      return tx.category.update({ where: { id: categoryId }, data: categoryScalarData(body) });
    });
    return NextResponse.json(cat);
  } catch (error) {
    if (error instanceof MissingMediaAssetError) return errorResponse(error.message);
    return prismaErrorResponse(error) ?? NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const { id } = await ctx.params;
  const categoryId = parsePositiveId(id);
  if (!categoryId) return NextResponse.json({ error: 'Invalid category id' }, { status: 400 });
  try {
    await prisma.category.delete({ where: { id: categoryId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return prismaErrorResponse(error) ?? NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
