import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
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
  const body = await req.json();
  const {
    name, slug, shortDescription, description, images, categoryIds,
    featured, skus,
    nameFr, nameEs, nameAr,
    shortDescriptionFr, shortDescriptionEs, shortDescriptionAr,
    descriptionFr, descriptionEs, descriptionAr,
    specs, specsFr, specsEs, specsAr, specsPdf,
    formula, formulaFr, formulaEs, formulaAr, formulaPdf,
  } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      name,
      slug,
      shortDescription: shortDescription || '',
      description: description || '',
      featured: !!featured,
      nameFr: nameFr || '',
      nameEs: nameEs || '',
      nameAr: nameAr || '',
      shortDescriptionFr: shortDescriptionFr || '',
      shortDescriptionEs: shortDescriptionEs || '',
      shortDescriptionAr: shortDescriptionAr || '',
      descriptionFr: descriptionFr || '',
      descriptionEs: descriptionEs || '',
      descriptionAr: descriptionAr || '',
      specs: specs || '',
      specsFr: specsFr || '',
      specsEs: specsEs || '',
      specsAr: specsAr || '',
      specsPdf: specsPdf || null,
      formula: formula || '',
      formulaFr: formulaFr || '',
      formulaEs: formulaEs || '',
      formulaAr: formulaAr || '',
      formulaPdf: formulaPdf || null,
      categories: categoryIds?.length
        ? { connect: categoryIds.map((id: number) => ({ id })) }
        : undefined,
      images: images?.length
        ? {
            create: images.map((img: any, i: number) => ({
              src: img.src,
              alt: img.alt || '',
              sortOrder: i,
            })),
          }
        : undefined,
      skus: skus?.length
        ? {
            create: skus.map((s: any) => ({
              name: s.name,
              nameFr: s.nameFr || '',
              nameEs: s.nameEs || '',
              nameAr: s.nameAr || '',
              image: s.images?.length ? (typeof s.images[0] === 'string' ? s.images[0] : s.images[0].src) : (s.image || ''),
              price: s.price || '',
              size: s.size || '',
              images: s.images?.length
                ? {
                    create: s.images.map((img: any, idx: number) => ({
                      src: typeof img === 'string' ? img : img.src,
                      sortOrder: idx,
                    })),
                  }
                : undefined,
            })),
          }
        : undefined,
    },
    include: { images: true, categories: true, skus: true },
  });

  return NextResponse.json(product);
}
