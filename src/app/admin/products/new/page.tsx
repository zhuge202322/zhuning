import { prisma } from '@/lib/prisma';
import ProductForm from '@/components/admin/ProductForm';
import { flattenCategoryTree } from '@/lib/category-tree';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const categoryRows = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: { id: true, name: true, parentId: true, sortOrder: true },
  });
  const categories = flattenCategoryTree(categoryRows).map((category) => ({
    id: category.id,
    name: category.name,
    depth: category.depth,
    rootId: category.path[0].id,
    pathLabel: category.path.map((item) => item.name).join(' / '),
  }));

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-6">新建产品</h2>
      <ProductForm mode="create" categories={categories} />
    </div>
  );
}
