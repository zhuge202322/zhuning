import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { assertSingleSuperAdmin, isSuperAdminSession } from "@/lib/admin-guard-core.mjs";

type AdminRecord = { id: number; username: string; sessionVersion: string };

export async function getRequiredAdmin(): Promise<AdminRecord | null> {
  const session = await getSession();
  if (!session) return null;

  const admins = await prisma.adminUser.findMany({
    select: { id: true, username: true, updatedAt: true },
    orderBy: { id: "asc" },
  });
  assertSingleSuperAdmin(admins);
  const row = admins[0] ?? null;
  const admin = row ? { id: row.id, username: row.username, sessionVersion: row.updatedAt.toISOString() } : null;
  return isSuperAdminSession(session, admin) ? admin : null;
}

export async function requireAdmin(): Promise<AdminRecord | NextResponse> {
  try {
    const admin = await getRequiredAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return admin;
  } catch (error) {
    console.error("Admin guard failure", error);
    return NextResponse.json({ error: "Admin account configuration is invalid" }, { status: 500 });
  }
}

export function isAdminResponse(value: AdminRecord | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
