import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  const admins = await prisma.adminUser.findMany({ orderBy: { id: 'asc' } });
  if (admins.length > 1) {
    return NextResponse.json({ error: 'Admin account configuration is invalid' }, { status: 500 });
  }

  const envUsername = process.env.ADMIN_USERNAME?.trim();
  const envPassword = process.env.ADMIN_PASSWORD;
  if (admins.length === 0 && envUsername && envPassword && username === envUsername && password === envPassword) {
    const user = await prisma.adminUser.create({
      data: { username: envUsername, passwordHash: await bcrypt.hash(envPassword, 12) },
    });
    await createSession({ id: user.id, username: user.username });
    return NextResponse.json({ ok: true });
  }

  const user = admins[0];
  if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  await createSession({ id: user.id, username: user.username });
  return NextResponse.json({ ok: true });
}
