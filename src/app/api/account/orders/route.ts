import { NextRequest, NextResponse } from "next/server";
import { internalErrorResponse } from "@/lib/api-route";
import { assertCustomerAuthConfigured, CustomerAuthConfigurationError, getCustomerSession } from "@/lib/customer-auth";
import { errorResponse, parsePositiveId } from "@/lib/input-validation";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try { assertCustomerAuthConfigured(); } catch (error) {
    if (error instanceof CustomerAuthConfigurationError) return NextResponse.json({ error: error.message }, { status: 503 });
    throw error;
  }
  const customer = await getCustomerSession();
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const page = Number(req.nextUrl.searchParams.get("page") || 1);
  const limit = Number(req.nextUrl.searchParams.get("limit") || 10);
  const cursorValue = req.nextUrl.searchParams.get("cursor");
  const cursor = cursorValue === null ? null : parsePositiveId(cursorValue);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50 || (cursorValue !== null && !cursor)) return errorResponse("Invalid order pagination");
  try {
    if (cursor && !await prisma.order.findFirst({ where: { id: cursor, customerId: customer.id }, select: { id: true } })) return errorResponse("Invalid order cursor");
    const [rows, total] = await prisma.$transaction([
      prisma.order.findMany({
        where: { customerId: customer.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : { skip: (page - 1) * limit }),
        include: { items: true },
      }),
      prisma.order.count({ where: { customerId: customer.id } }),
    ]);
    const hasMore = rows.length > limit;
    const orders = rows.slice(0, limit);
    return NextResponse.json({ orders, page, limit, total, totalPages: Math.ceil(total / limit), nextCursor: hasMore ? String(orders.at(-1)?.id || "") : null });
  } catch (error) {
    return internalErrorResponse("Customer order history failed", error);
  }
}
