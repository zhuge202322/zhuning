import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSession, destroySession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.id === 0) {
    return NextResponse.json(
      { error: 'This admin account is managed through Vercel environment variables.' },
      { status: 400 }
    );
  }

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: '请填写完整信息' }, { status: 400 });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return NextResponse.json({ error: '新密码至少需要 8 个字符' }, { status: 400 });
  }
  if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return NextResponse.json(
      { error: '新密码需同时包含字母和数字' },
      { status: 400 }
    );
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: '新密码不能与当前密码相同' }, { status: 400 });
  }

  const user = await prisma.adminUser.findUnique({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json({ error: '账号不存在' }, { status: 404 });
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: '当前密码错误' }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  // 让旧 session 失效，强制重新登录
  await destroySession();

  return NextResponse.json({ ok: true });
}
