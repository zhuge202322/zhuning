import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';
import { isAdminResponse, requireAdmin } from '@/lib/admin-guard';

export async function POST() {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  await destroySession();
  return NextResponse.json({ ok: true });
}
