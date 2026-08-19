import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminResponse, requireAdmin } from '@/lib/admin-guard';
import { errorResponse, parsePositiveId, validateProductInput } from '@/lib/input-validation';
import { parseJsonObject, prismaErrorResponse } from '@/lib/api-route';
import { productImageCreates, productScalarData, productSkuCreates } from '@/lib/catalog-write-data';

export const dynamic = 'force-dynamic';

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
  const product = await prisma.$transaction(async (tx) => {
  if (images !== undefined) await tx.productImage.deleteMany({ where: { productId: pid } });
  if (skus !== undefined) await tx.productSku.deleteMany({ where: { productId: pid } });

  return tx.product.update({
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
  });

  return NextResponse.json(product);
  } catch (error) {
    return prismaErrorResponse(error) ?? NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
    return prismaErrorResponse(error) ?? NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
