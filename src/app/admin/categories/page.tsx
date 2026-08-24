import { prisma } from '@/lib/prisma';
import CategoriesManager from '@/components/admin/CategoriesManager';
import { flattenCategoryTree } from '@/lib/category-tree';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const cats = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-6">产品类目</h2>
      <CategoriesManager
        initial={flattenCategoryTree(cats).map((c) => ({
          id: c.id,
          name: c.name,
          nameFr: c.nameFr || '',
          nameEs: c.nameEs || '',
          nameAr: c.nameAr || '',
          slug: c.slug,
          imageUrl: c.imageUrl,
          productCount: c._count.products,
          parentId: c.parentId,
          depth: c.depth,
          pathLabel: c.path.map((item) => item.name).join(' / '),
          childCount: cats.filter((item) => item.parentId === c.id).length,
        }))}
      />
    </div>
  );
}
