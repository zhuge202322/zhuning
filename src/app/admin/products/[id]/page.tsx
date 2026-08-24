import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ProductForm from '@/components/admin/ProductForm';
import { flattenCategoryTree } from '@/lib/category-tree';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  if (Number.isNaN(productId)) notFound();

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        categories: true,
        skus: {
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, parentId: true, sortOrder: true },
    }),
  ]);

  if (!product) notFound();

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-6">编辑产品</h2>
      <ProductForm
        mode="edit"
        productId={product.id}
        categories={flattenCategoryTree(categories).map((category) => ({
          id: category.id,
          name: category.name,
          depth: category.depth,
          rootId: category.path[0].id,
          pathLabel: category.path.map((item) => item.name).join(' / '),
        }))}
        initial={{
          name: product.name,
          slug: product.slug,
          shortDescription: product.shortDescription,
          description: product.description,
          specs: (product as any).specs || '',
          specsPdf: (product as any).specsPdf || '',
          formula: (product as any).formula || '',
          formulaPdf: (product as any).formulaPdf || '',
          featured: (product as any).featured,
          images: ((product as any).images || []).map((img: any) => ({ src: img.src, alt: img.alt })),
          categoryIds: ((product as any).categories || []).map((c: any) => c.id),
          skus: (product as any).skus?.map((s: any) => ({
            id: s.id,
            name: s.name,
            nameFr: s.nameFr || '',
            nameEs: s.nameEs || '',
            nameAr: s.nameAr || '',
            image: s.image,
            images: (s.images || []).map((img: any) => ({ src: img.src, alt: s.name })),
            price: s.price || '',
            size: s.size || '',
          })) || [],
          translations: {
            name: { fr: (product as any).nameFr || '', es: (product as any).nameEs || '', ar: (product as any).nameAr || '' },
            shortDescription: { fr: (product as any).shortDescriptionFr || '', es: (product as any).shortDescriptionEs || '', ar: (product as any).shortDescriptionAr || '' },
            description: { fr: (product as any).descriptionFr || '', es: (product as any).descriptionEs || '', ar: (product as any).descriptionAr || '' },
            specs: { fr: (product as any).specsFr || '', es: (product as any).specsEs || '', ar: (product as any).specsAr || '' },
            formula: { fr: (product as any).formulaFr || '', es: (product as any).formulaEs || '', ar: (product as any).formulaAr || '' },
          },
        }}
      />
    </div>
  );
}
