import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminResponse, requireAdmin } from '@/lib/admin-guard';
import { errorResponse, parsePositiveId, validateCategoryInput } from '@/lib/input-validation';
import { parseJsonObject, prismaErrorResponse } from '@/lib/api-route';
import { categoryScalarData } from '@/lib/catalog-write-data';
import { assertLocalMediaAssetsExist, MissingMediaAssetError } from '@/lib/media-asset-validation';
import { descendantCategoryIds, validateMoveProductAssignments, validateParentChange } from '@/lib/category-tree';

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
    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.category.findMany({ select: { id: true, parentId: true } });
      const current = rows.find((row) => row.id === categoryId);
      if (!current) return { error: '分类不存在', status: 404 };
      const nextParentId = body.parentId === undefined ? current.parentId : body.parentId;
      const parentValidation = validateParentChange(rows, categoryId, nextParentId);
      if (!parentValidation.ok) return { error: parentValidation.error || '父分类无效', status: 400 };
      if (nextParentId !== current.parentId) {
        const affectedIds = descendantCategoryIds(rows, categoryId);
        const affectedProducts = await tx.product.findMany({
          where: { categories: { some: { id: { in: affectedIds } } } },
          select: { id: true, categories: { select: { id: true } } },
        });
        const assignmentValidation = validateMoveProductAssignments(
          rows,
          categoryId,
          nextParentId,
          affectedProducts.map((product) => ({ productId: product.id, categoryIds: product.categories.map((category) => category.id) })),
        );
        if (!assignmentValidation.ok) return { error: assignmentValidation.error || '移动分类会导致产品分类无效', status: 400 };
      }
      await assertLocalMediaAssetsExist(tx, body);
      const category = await tx.category.update({ where: { id: categoryId }, data: categoryScalarData(body) });
      return { category };
    });
    if ('error' in result) return NextResponse.json({ error: result.error || '父分类无效' }, { status: result.status });
    return NextResponse.json(result.category);
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
    const result = await prisma.$transaction(async (tx) => {
      const childCount = await tx.category.count({ where: { parentId: categoryId } });
      if (childCount > 0) return { error: '请先删除或移动该分类下的子分类' };
      await tx.category.delete({ where: { id: categoryId } });
      return { ok: true };
    });
    if ('error' in result) return errorResponse(result.error || '无法删除分类');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return prismaErrorResponse(error) ?? NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
