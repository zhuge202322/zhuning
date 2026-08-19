import OrderList from "@/components/admin/OrderList";

type OrdersPageProps = { searchParams: Promise<{ customer?: string }> };

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const { customer = "" } = await searchParams;
  return <div><div className="mb-6"><h2 className="text-xl font-bold text-slate-800">订单管理</h2><p className="text-sm text-slate-500 mt-1">查看询盘、转正式订单并跟踪订单履约状态。</p></div><OrderList initialCustomerFilter={customer} /></div>;
}
