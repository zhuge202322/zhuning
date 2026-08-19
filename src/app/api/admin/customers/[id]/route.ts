import { NextRequest, NextResponse } from "next/server";
import { isAdminResponse, requireAdmin } from "@/lib/admin-guard";
import { internalErrorResponse, parseJsonObject, prismaErrorResponse } from "@/lib/api-route";
import { normalizeCustomerEmail } from "@/lib/customer-auth";
import { errorResponse, parsePositiveId } from "@/lib/input-validation";
import { prisma } from "@/lib/prisma";

const STATUSES = ["ACTIVE", "INQUIRY", "DISABLED"];
type Context = { params: Promise<{ id: string }> };
async function idFrom(context: Context) { return parsePositiveId((await context.params).id); }

export async function GET(_req: NextRequest, context: Context) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const id = await idFrom(context);
  if (!id) return errorResponse("Invalid customer id");
  const customer = await prisma.customer.findUnique({ where: { id }, select: { id: true, name: true, email: true, phone: true, status: true, notes: true, totalOrders: true, totalSpend: true, marketingOptIn: true, lastLoginAt: true, disabledAt: true, createdAt: true, updatedAt: true, orders: { orderBy: { createdAt: "desc" }, include: { items: true } } } });
  if (!customer) return errorResponse("Customer not found", 404);
  return NextResponse.json({ customer });
}

export async function PATCH(req: NextRequest, context: Context) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const id = await idFrom(context);
  if (!id) return errorResponse("Invalid customer id");
  const parsed = await parseJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const allowed = ["name", "email", "phone", "status", "notes", "marketingOptIn"];
  if (!Object.keys(parsed.data).length || Object.keys(parsed.data).some((key) => !allowed.includes(key))) return errorResponse("Invalid customer fields");
  const data: Record<string, unknown> = {};
  for (const field of ["name", "phone", "notes"] as const) if (parsed.data[field] !== undefined) {
    if (typeof parsed.data[field] !== "string" || parsed.data[field].length > (field === "notes" ? 5000 : 160) || (field === "name" && !parsed.data[field].trim())) return errorResponse(`Invalid ${field}`);
    data[field] = parsed.data[field].trim();
  }
  if (parsed.data.email !== undefined) { const email = normalizeCustomerEmail(parsed.data.email); if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 320) return errorResponse("Invalid email"); data.email = email; }
  if (parsed.data.marketingOptIn !== undefined) { if (typeof parsed.data.marketingOptIn !== "boolean") return errorResponse("Invalid marketing preference"); data.marketingOptIn = parsed.data.marketingOptIn; }
  if (parsed.data.status !== undefined && (typeof parsed.data.status !== "string" || !STATUSES.includes(parsed.data.status))) return errorResponse("Invalid customer status");
  try {
    const customer = await prisma.$transaction(async (tx) => {
      const current = await tx.customer.findUnique({ where: { id } });
      if (!current) throw Object.assign(new Error("Customer not found"), { code: "P2025" });
      const nextStatus = typeof parsed.data.status === "string" ? parsed.data.status : current.status;
      const changedAccess = (current.status === "DISABLED") !== (nextStatus === "DISABLED");
      const updated = await tx.customer.update({ where: { id }, data: { ...data, ...(parsed.data.status !== undefined ? { status: nextStatus, disabledAt: nextStatus === "DISABLED" ? new Date() : null } : {}), ...(changedAccess ? { authVersion: { increment: 1 } } : {}) }, select: { id: true, name: true, email: true, phone: true, status: true, notes: true, totalOrders: true, totalSpend: true, marketingOptIn: true, lastLoginAt: true, disabledAt: true, createdAt: true, updatedAt: true } });
      if (updated.name !== current.name || updated.email !== current.email) await tx.order.updateMany({ where: { customerId: id }, data: { customerName: updated.name, customerEmail: updated.email } });
      return updated;
    });
    return NextResponse.json({ customer });
  } catch (error) { return prismaErrorResponse(error) ?? internalErrorResponse("Customer update failed", error); }
}

