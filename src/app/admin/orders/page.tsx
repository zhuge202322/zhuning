import Link from "next/link";
import { PackageCheck, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type OrdersPageProps = {
  searchParams: Promise<{ customer?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const { customer } = await searchParams;
  const orders = await prisma.order.findMany({
    where: customer ? { customerEmail: customer } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      items: true,
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Orders ({orders.length})</h2>
          <p className="text-sm text-slate-500 mt-1">Track B2C customer orders, payment, and fulfillment.</p>
        </div>
        {customer ? (
          <Link href="/admin/orders" className="text-sm font-bold text-brand-primary hover:underline">
            Clear customer filter
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4">
        {orders.map((order) => (
          <article key={order.id} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-brand-primary" />
                  <h3 className="font-extrabold text-slate-800">{order.orderNumber}</h3>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {order.customerName} / {order.customerEmail}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                  {order.status}
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  {order.paymentStatus}
                </span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {order.fulfillmentStatus}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {order.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[56px_1fr_auto] items-center gap-3">
                  {item.image ? (
                    <img src={item.image} alt="" className="w-14 h-14 rounded-xl object-cover bg-slate-100" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-100" />
                  )}
                  <div>
                    <div className="font-bold text-slate-800">{item.productName}</div>
                    <div className="text-xs text-slate-500">SKU {item.sku || "N/A"} / Qty {item.quantity}</div>
                  </div>
                  <div className="font-bold text-slate-800">${Number(item.price).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Truck className="w-4 h-4" />
                Created {order.createdAt.toISOString().slice(0, 10)}
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Total</div>
                <div className="text-xl font-extrabold text-slate-900">
                  {order.currency} ${Number(order.total).toFixed(2)}
                </div>
              </div>
            </div>
          </article>
        ))}
        {orders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-400">
            No orders yet.
          </div>
        )}
      </div>
    </div>
  );
}
