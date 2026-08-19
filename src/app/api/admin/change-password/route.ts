import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { destroySession } from '@/lib/auth';
import { isAdminResponse, requireAdmin } from '@/lib/admin-guard';
import { parseJsonObject, prismaErrorResponse } from '@/lib/api-route';

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;

  const parsed = await parseJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const { currentPassword, newPassword } = parsed.data;

  if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string' || !newPassword) {
    return NextResponse.json({ error: '请填写完整信息' }, { status: 400 });
  }
  if (newPassword.length < 12) {
    return NextResponse.json({ error: '新密码至少需要 12 个字符' }, { status: 400 });
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

  const user = await prisma.adminUser.findUnique({ where: { id: admin.id } });
  if (!user) {
    return NextResponse.json({ error: '账号不存在' }, { status: 404 });
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: '当前密码错误' }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  try {
    const updatedAt = new Date(Math.max(Date.now(), user.updatedAt.getTime() + 1));
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash, updatedAt },
    });
  } catch (error) {
    return prismaErrorResponse(error) ?? NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }

  // 让旧 session 失效，强制重新登录
  await destroySession();

  return NextResponse.json({ ok: true });
}
