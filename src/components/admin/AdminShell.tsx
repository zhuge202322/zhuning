'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  FileText,
  BarChart3,
  KeyRound,
  Image,
  LogOut,
  Users,
  ShoppingCart,
  PanelsTopLeft,
  Settings,
  WandSparkles,
} from 'lucide-react';

const NAV = [
  { href: '/admin', label: '仪表盘', icon: LayoutDashboard },
  { href: '/admin/analytics', label: '数据分析', icon: BarChart3 },
  { href: '/admin/products', label: '产品管理', icon: Package },
  { href: '/admin/orders', label: '订单管理', icon: ShoppingCart },
  { href: '/admin/customers', label: '客户管理', icon: Users },
  { href: '/admin/categories', label: '产品类目', icon: FolderOpen },
  { href: '/admin/pages', label: '页面板块', icon: PanelsTopLeft },
  { href: '/admin/settings', label: '网站设置', icon: Settings },
  { href: '/admin/ai-seo', label: 'AI SEO 优化', icon: WandSparkles },
  { href: '/admin/posts', label: '文章管理', icon: FileText },
  { href: '/admin/media', label: '网站媒体', icon: Image },
  { href: '/admin/media-library', label: '媒体库', icon: Image },
  { href: '/admin/account', label: '账号安全', icon: KeyRound },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 shrink-0 bg-slate-900 text-slate-100 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="text-lg font-extrabold">Myklens 管理后台</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/admin' ? path === '/admin' : path === item.href || path.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  active
                    ? 'bg-brand-primary text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6">
          <h1 className="text-base font-bold text-slate-800">
            {NAV.find((n) =>
              n.href === '/admin' ? path === '/admin' : path === n.href || path.startsWith(`${n.href}/`)
            )?.label || '管理后台'}
          </h1>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
