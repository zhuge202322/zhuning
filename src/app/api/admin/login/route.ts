import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';
import { parseJsonObject, prismaErrorResponse } from '@/lib/api-route';

export async function POST(req: NextRequest) {
  const parsed = await parseJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const { username, password } = parsed.data;

  if (typeof username !== 'string' || !username || typeof password !== 'string' || !password) {
    return NextResponse.json({ error: '请输入管理员账号和密码' }, { status: 400 });
  }

  const admins = await prisma.adminUser.findMany({ orderBy: { id: 'asc' } });
  if (admins.length > 1) {
    return NextResponse.json({ error: '管理员账号配置无效' }, { status: 500 });
  }

  const envUsername = process.env.ADMIN_USERNAME?.trim();
  const envPassword = process.env.ADMIN_PASSWORD;
  if (admins.length === 0 && envUsername && envPassword && username === envUsername && password === envPassword) {
    try {
      const user = await prisma.adminUser.create({
        data: { username: envUsername, passwordHash: await bcrypt.hash(envPassword, 12) },
      });
      await createSession({ id: user.id, username: user.username, sessionVersion: user.updatedAt.toISOString() });
      return NextResponse.json({ ok: true });
    } catch (error) {
      return prismaErrorResponse(error) ?? NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
    }
  }

  const user = admins[0];
  if (!user || user.username !== username) return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });

  await createSession({ id: user.id, username: user.username, sessionVersion: user.updatedAt.toISOString() });
  return NextResponse.json({ ok: true });
}
