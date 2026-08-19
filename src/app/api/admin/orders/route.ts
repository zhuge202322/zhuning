import { NextRequest, NextResponse } from "next/server";
import { isAdminResponse, requireAdmin } from "@/lib/admin-guard";
import { errorResponse } from "@/lib/input-validation";
import { ORDER_STATUSES_BY_TYPE, ORDER_TYPE, type OrderType } from "@/lib/order-status";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const params = req.nextUrl.searchParams;
  const type = params.get("type") || "";
  const status = params.get("status") || "";
  const customer = (params.get("customer") || "").trim();
  const q = (params.get("q") || "").trim();
  const limit = Number(params.get("limit") || 20);
  const page = Number(params.get("page") || 1);
  const statuses = Object.values(ORDER_STATUSES_BY_TYPE).flat() as readonly string[];
  if ((type && !Object.values(ORDER_TYPE).includes(type as OrderType)) || (status && !statuses.includes(status)) || !Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(page) || page < 1) return errorResponse("Invalid order filters");
  const where = {
    ...(type ? { orderType: type } : {}),
    ...(status ? { status } : {}),
    AND: [
      ...(customer ? [{ OR: [{ customerEmail: { contains: customer } }, { customerName: { contains: customer } }] }] : []),
      ...(q ? [{ OR: [{ orderNumber: { contains: q } }, { customerEmail: { contains: q } }, { customerName: { contains: q } }] }] : []),
    ],
  };
  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { customer: { select: { id: true, name: true, email: true, status: true } }, items: true } }),
    prisma.order.count({ where }),
  ]);
  return NextResponse.json({ items, page, limit, total, totalPages: Math.ceil(total / limit) });
}
