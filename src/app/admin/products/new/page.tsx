import { prisma } from '@/lib/prisma';
import ProductForm from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: { id: true, name: true },
  });

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-6">New Product</h2>
      <ProductForm mode="create" categories={categories} />
    </div>
  );
}
