import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminResponse, requireAdmin } from '@/lib/admin-guard';
import { errorResponse, validateCategoryInput } from '@/lib/input-validation';
import { parseJsonObject, prismaErrorResponse } from '@/lib/api-route';
import { categoryScalarData } from '@/lib/catalog-write-data';
import { assertLocalMediaAssetsExist, MissingMediaAssetError } from '@/lib/media-asset-validation';

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
    const cat = await prisma.$transaction(async (tx) => {
      await assertLocalMediaAssetsExist(tx, body);
      return tx.category.create({ data: categoryScalarData(body) as any });
    });
    return NextResponse.json(cat);
  } catch (error) {
    if (error instanceof MissingMediaAssetError) return errorResponse(error.message);
    return prismaErrorResponse(error) ?? NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
