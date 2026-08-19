import CustomerList from "@/components/admin/CustomerList";

export default function AdminCustomersPage() {
  return <div><div className="mb-6"><h2 className="text-xl font-bold text-slate-800">Customers</h2><p className="text-sm text-slate-500 mt-1">Manage B2C client profiles, access, and order history.</p></div><CustomerList /></div>;
}
