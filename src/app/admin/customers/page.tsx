import Link from "next/link";
import { Mail, Phone, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Customers ({customers.length})</h2>
        <p className="text-sm text-slate-500 mt-1">Manage B2C client profiles and order history.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Spend</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white grid place-items-center">
                      <UserRound className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{customer.name}</div>
                      <div className="text-xs text-slate-500">
                        Joined {customer.createdAt.toISOString().slice(0, 10)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {customer.email}
                  </div>
                  {customer.phone ? (
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {customer.phone}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-bold text-slate-800">{customer._count.orders}</td>
                <td className="px-4 py-3 font-bold text-slate-800">${Number(customer.totalSpend).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    {customer.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/orders?customer=${encodeURIComponent(customer.email)}`}
                    className="text-brand-primary font-bold hover:underline"
                  >
                    View orders
                  </Link>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
