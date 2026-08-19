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
            <h2 className="text-xl font-bold text-slate-800">Excel 产品导入</h2>
            <p className="text-sm text-slate-500">
              从本地 Excel 工作簿将产品数据导入 B2C 商城数据库。
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 space-y-3">
          <p>
            当前导入程序会读取
            <strong>项链</strong>和<strong>戒指</strong>工作表，数据来源于
            <code className="mx-1 rounded bg-white px-1.5 py-0.5">6.16上架产品整理-1.xlsx</code>.
          </p>
          <p>
            程序会提取产品名称、SKU、材质、价格、重量、包装信息和嵌入图片，
            然后创建产品类目、产品、画廊图片、SKU、示例客户和示例订单。
          </p>
          <p className="font-bold text-slate-800">
            Excel 文件发生变化时，请在项目目录执行以下命令：
          </p>
          <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
pnpm db:push && pnpm db:import-products
          </pre>
        </div>
      </div>
    </div>
  );
}
