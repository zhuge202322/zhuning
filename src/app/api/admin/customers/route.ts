import { NextRequest, NextResponse } from "next/server";
import { isAdminResponse, requireAdmin } from "@/lib/admin-guard";
import { errorResponse } from "@/lib/input-validation";
import { prisma } from "@/lib/prisma";

const STATUSES = ["ACTIVE", "INQUIRY", "DISABLED"];
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const params = req.nextUrl.searchParams;
  const q = (params.get("q") || "").trim();
  const status = (params.get("status") || "").trim();
  const limit = Number(params.get("limit") || 20);
  const page = Number(params.get("page") || 1);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(page) || page < 1 || (status && !STATUSES.includes(status))) return errorResponse("Invalid customer filters");
  const where = { ...(status ? { status } : {}), ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.customer.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, name: true, email: true, phone: true, status: true, notes: true, totalOrders: true, totalSpend: true, marketingOptIn: true, lastLoginAt: true, disabledAt: true, createdAt: true, updatedAt: true, _count: { select: { orders: true } } } }),
    prisma.customer.count({ where }),
  ]);
  return NextResponse.json({ items, page, limit, total, totalPages: Math.ceil(total / limit) });
}

