import CustomerList from "@/components/admin/CustomerList";

export default function AdminCustomersPage() {
  return <div><div className="mb-6"><h2 className="text-xl font-bold text-slate-800">客户管理</h2><p className="text-sm text-slate-500 mt-1">管理商城客户资料、账号状态和订单历史。</p></div><CustomerList /></div>;
}
