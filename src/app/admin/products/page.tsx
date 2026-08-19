import Link from 'next/link';
import { Plus, Database } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import ProductDeleteButton from '@/components/admin/ProductDeleteButton';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }],
    include: {
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      categories: true,
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800">产品（{products.length}）</h2>
        <div className="flex gap-2">
          <Link
            href="/admin/products/import"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold !text-white shadow transition hover:bg-slate-800"
          >
            <Database className="w-4 h-4" /> 导入 Excel 数据
          </Link>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-bold !text-white shadow transition hover:bg-blue-800"
          >
            <Plus className="w-4 h-4" /> 新建产品
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">图片</th>
              <th className="px-4 py-3">产品名称</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">价格</th>
              <th className="px-4 py-3">别名</th>
              <th className="px-4 py-3">产品类目</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  {p.images[0] ? (
                    <img src={p.images[0].src} alt="" className="w-12 h-12 rounded-lg object-cover bg-slate-100" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-100" />
                  )}
                </td>
                <td className="px-4 py-3 font-bold text-slate-800">{p.name}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.sourceSku || '无'}</td>
                <td className="px-4 py-3 font-bold text-slate-800">
                  {p.price ? `$${Number(p.price).toFixed(2)}` : '未设置'}
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.slug}</td>
                <td className="px-4 py-3 text-slate-600">
                  {p.categories.map((c) => c.name).join(', ') || '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-brand-primary font-bold hover:underline"
                    >
                      编辑
                    </Link>
                    <ProductDeleteButton id={p.id} name={p.name} />
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">暂无产品。</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
