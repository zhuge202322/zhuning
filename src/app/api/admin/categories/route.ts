import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminResponse, requireAdmin } from '@/lib/admin-guard';
import { errorResponse, validateCategoryInput } from '@/lib/input-validation';
import { parseJsonObject, prismaErrorResponse } from '@/lib/api-route';
import { categoryScalarData } from '@/lib/catalog-write-data';
import { assertLocalMediaAssetsExist, MissingMediaAssetError } from '@/lib/media-asset-validation';
import { validateParentChange } from '@/lib/category-tree';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const cats = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json(cats);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const parsed = await parseJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as any;
  const validation = validateCategoryInput(body);
  if (!validation.ok) return errorResponse(validation.error || 'Invalid category data');
  const { name, slug, imageUrl, nameFr, nameEs, nameAr } = body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.category.findMany({ select: { id: true, parentId: true } });
      const parentValidation = validateParentChange(rows, null, body.parentId ?? null);
      if (!parentValidation.ok) return { error: parentValidation.error || '父分类无效' };
      await assertLocalMediaAssetsExist(tx, body);
      const category = await tx.category.create({ data: categoryScalarData(body) as any });
      return { category };
    });
    if ('error' in result) return errorResponse(result.error || '父分类无效');
    return NextResponse.json(result.category);
  } catch (error) {
    if (error instanceof MissingMediaAssetError) return errorResponse(error.message);
    return prismaErrorResponse(error) ?? NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
