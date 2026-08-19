import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminResponse, requireAdmin } from '@/lib/admin-guard';
import { errorResponse, validateProductInput } from '@/lib/input-validation';
import { parseJsonObject, prismaErrorResponse } from '@/lib/api-route';
import { productImageCreates, productScalarData, productSkuCreates } from '@/lib/catalog-write-data';
import { assertLocalMediaAssetsExist, MissingMediaAssetError } from '@/lib/media-asset-validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const products = await prisma.product.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }],
    include: {
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      categories: true,
    },
  });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const parsed = await parseJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as any;
  const validation = validateProductInput(body);
  if (!validation.ok) return errorResponse(validation.error || 'Invalid product data');
  const {
    name, slug, shortDescription, description, images, categoryIds,
    featured, skus,
    nameFr, nameEs, nameAr,
    shortDescriptionFr, shortDescriptionEs, shortDescriptionAr,
    descriptionFr, descriptionEs, descriptionAr,
    specs, specsFr, specsEs, specsAr, specsPdf,
    formula, formulaFr, formulaEs, formulaAr, formulaPdf,
  } = body;

  try {
  const product = await prisma.$transaction(async (tx) => {
  await assertLocalMediaAssetsExist(tx, body);
  return tx.product.create({
    data: {
      ...productScalarData(body),
      categories: categoryIds?.length
        ? { connect: categoryIds.map((id: number) => ({ id })) }
        : undefined,
      images: images?.length
        ? { create: productImageCreates(images) }
        : undefined,
      skus: skus?.length
        ? { create: productSkuCreates(skus) }
        : undefined,
    } as any,
    include: { images: true, categories: true, skus: true },
  });
  });

  return NextResponse.json(product);
  } catch (error) {
    if (error instanceof MissingMediaAssetError) return errorResponse(error.message);
    return prismaErrorResponse(error) ?? NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
