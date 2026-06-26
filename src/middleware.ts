import { NextResponse, NextRequest } from 'next/server';
import { getSessionFromToken, ADMIN_COOKIE } from '@/lib/auth';

function attachPathHeader(res: NextResponse, path: string) {
  res.headers.set('x-pathname', path);
  return res;
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Admin & admin-api: guard auth
  if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
    const isAdminLogin = path === '/admin/login' || path === '/api/admin/login';
    if (!isAdminLogin) {
      const token = req.cookies.get(ADMIN_COOKIE)?.value;
      const session = await getSessionFromToken(token);
      if (!session) {
        if (path.startsWith('/api/')) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const url = req.nextUrl.clone();
        url.pathname = '/admin/login';
        return NextResponse.redirect(url);
      }
    }
    return attachPathHeader(NextResponse.next(), path);
  }

  return attachPathHeader(NextResponse.next(), path);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads|.*\\..*).*)'],
};
