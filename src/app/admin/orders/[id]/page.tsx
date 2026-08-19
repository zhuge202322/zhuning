import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OrderDetail from "@/components/admin/OrderDetail";

export const dynamic = "force-dynamic";
export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const order = await prisma.order.findUnique({ where: { id }, include: { customer: { select: { id: true, name: true, email: true, phone: true, status: true } }, items: true } });
  if (!order) notFound();
  return <div><Link href="/admin/orders" className="text-sm font-bold text-brand-primary hover:underline">返回订单列表</Link><h2 className="mt-4 text-xl font-bold text-slate-800">{order.orderNumber}</h2><p className="mt-1 text-sm text-slate-500">{order.customerName} / {order.customerEmail}</p><OrderDetail order={{ ...order, subtotal: Number(order.subtotal), shipping: Number(order.shipping), total: Number(order.total), items: order.items.map((item) => ({ ...item, price: Number(item.price) })), createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString(), convertedAt: order.convertedAt?.toISOString() || null, paidAt: order.paidAt?.toISOString() || null, shippedAt: order.shippedAt?.toISOString() || null, completedAt: order.completedAt?.toISOString() || null, cancelledAt: order.cancelledAt?.toISOString() || null }} /></div>;
}
