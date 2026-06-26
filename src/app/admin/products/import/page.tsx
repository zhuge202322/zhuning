import { Database } from "lucide-react";

export default function ImportProductsPage() {
  return (
    <div className="max-w-3xl">
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white grid place-items-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Excel Product Import</h2>
            <p className="text-sm text-slate-500">
              Product data is imported from the local Excel workbook into the B2C store database.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 space-y-3">
          <p>
            The current importer reads <strong>Necklace</strong> and <strong>Rings</strong> sheets from
            <code className="mx-1 rounded bg-white px-1.5 py-0.5">6.16上架产品整理-1.xlsx</code>.
          </p>
          <p>
            It extracts product names, SKUs, materials, prices, weights, packaging data, and embedded images,
            then creates categories, products, gallery images, SKUs, a sample customer, and a sample order.
          </p>
          <p className="font-bold text-slate-800">
            Run this command from the project directory when the Excel files change:
          </p>
          <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
pnpm db:push && pnpm db:import-products
          </pre>
        </div>
      </div>
    </div>
  );
}
