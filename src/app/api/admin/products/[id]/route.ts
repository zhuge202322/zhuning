import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminResponse, requireAdmin } from '@/lib/admin-guard';
import { errorResponse, parsePositiveId, validateProductInput } from '@/lib/input-validation';
import { parseJsonObject, prismaErrorResponse } from '@/lib/api-route';
import { productImageCreates, productScalarData, productSkuCreates } from '@/lib/catalog-write-data';
import { assertLocalMediaAssetsExist, MissingMediaAssetError } from '@/lib/media-asset-validation';
import { validateSameRootSelection } from '@/lib/category-tree';

export const dynamic = 'force-dynamic';

const IMPORTED_PRODUCT_MEDIA_PREFIX = '/uploads/imported-products/';

function importedProductMediaUrls(product: {
  images: Array<{ src: string }>;
  skus: Array<{ image: string; images: Array<{ src: string }> }>;
  specsPdf: string | null;
  formulaPdf: string | null;
}) {
  const candidates = [
    ...product.images.map((image) => image.src),
    ...product.skus.flatMap((sku) => [sku.image, ...sku.images.map((image) => image.src)]),
    product.specsPdf,
    product.formulaPdf,
  ];
  return candidates.filter((url): url is string => typeof url === 'string' && url.startsWith(IMPORTED_PRODUCT_MEDIA_PREFIX));
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const { id } = await ctx.params;
  const productId = parsePositiveId(id);
  if (!productId) return NextResponse.json({ error: 'Invalid product id' }, { status: 400 });
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      categories: true,
    },
  });
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(product);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const { id } = await ctx.params;
  const pid = parsePositiveId(id);
  if (!pid) return NextResponse.json({ error: 'Invalid product id' }, { status: 400 });
  const parsed = await parseJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as any;
  const validation = validateProductInput(body, 'update');
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
  const result = await prisma.$transaction(async (tx) => {
  const current = await tx.product.findUnique({
    where: { id: pid },
    select: {
      specsPdf: true,
      formulaPdf: true,
      images: { select: { src: true } },
      skus: { select: { image: true, images: { select: { src: true } } } },
    },
  });
  if (!current) return { error: '产品不存在' };
  if (categoryIds !== undefined) {
    const categoryRows = await tx.category.findMany({ select: { id: true, parentId: true } });
    const categoryValidation = validateSameRootSelection(categoryRows, categoryIds || []);
    if (!categoryValidation.ok) return { error: categoryValidation.error || '产品类目无效' };
  }
  await assertLocalMediaAssetsExist(tx, body, { allowedLegacyUrls: importedProductMediaUrls(current) });
  if (images !== undefined) await tx.productImage.deleteMany({ where: { productId: pid } });
  if (skus !== undefined) await tx.productSku.deleteMany({ where: { productId: pid } });

  const product = await tx.product.update({
    where: { id: pid },
    data: {
      ...productScalarData(body),
      ...(categoryIds !== undefined ? { categories: {
        set: (categoryIds || []).map((cid: number) => ({ id: cid })),
      } } : {}),
      images: images?.length
        ? { create: productImageCreates(images) }
        : undefined,
      skus: skus?.length
        ? { create: productSkuCreates(skus) }
        : undefined,
    },
    include: { images: true, categories: true, skus: true },
  });
  return { product };
  });

  if ('error' in result) return errorResponse(result.error || '产品类目无效');
  return NextResponse.json(result.product);
  } catch (error) {
    if (error instanceof MissingMediaAssetError) return errorResponse(error.message);
    return prismaErrorResponse(error) ?? NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const { id } = await ctx.params;
  const productId = parsePositiveId(id);
  if (!productId) return NextResponse.json({ error: 'Invalid product id' }, { status: 400 });
  try {
    await prisma.product.delete({ where: { id: productId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return prismaErrorResponse(error) ?? NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
