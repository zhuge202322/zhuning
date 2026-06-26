import Link from 'next/link';
import { Package, FolderOpen, FileText, ArrowRight, ShoppingCart, Users } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [productCount, categoryCount, postCount, orderCount, customerCount] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.post.count(),
    prisma.order.count(),
    prisma.customer.count(),
  ]);

  const cards = [
    { label: 'Products', value: productCount, href: '/admin/products', icon: Package, color: 'bg-blue-500' },
    { label: 'Orders', value: orderCount, href: '/admin/orders', icon: ShoppingCart, color: 'bg-rose-500' },
    { label: 'Customers', value: customerCount, href: '/admin/customers', icon: Users, color: 'bg-violet-500' },
    { label: 'Categories', value: categoryCount, href: '/admin/categories', icon: FolderOpen, color: 'bg-emerald-500' },
    { label: 'Posts', value: postCount, href: '/admin/posts', icon: FileText, color: 'bg-amber-500' },
  ];

  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Welcome back</h2>
      <p className="text-slate-500 mb-8">Quick overview of your content.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              href={c.href}
              className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-brand-primary hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${c.color} flex items-center justify-center text-white`}>
                  <Icon className="w-6 h-6" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-primary group-hover:translate-x-0.5 transition" />
              </div>
              <div className="text-3xl font-extrabold text-slate-800">{c.value}</div>
              <div className="text-sm font-medium text-slate-500 mt-1">{c.label}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
