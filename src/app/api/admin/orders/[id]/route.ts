import { NextRequest, NextResponse } from "next/server";
import { isAdminResponse, requireAdmin } from "@/lib/admin-guard";
import { internalErrorResponse, parseJsonObject } from "@/lib/api-route";
import { errorResponse, parsePositiveId } from "@/lib/input-validation";
import {
  FULFILLMENT_STATUS,
  fulfillmentForOrderStatus,
  ORDER_STATUS,
  ORDER_TYPE,
  PAYMENT_STATUS,
  validateOrderTransition,
  type OrderType,
} from "@/lib/order-status";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
const STRING_FIELDS = ["notes", "shippingRecipient", "shippingPhone", "shippingCountry", "shippingAddressLine1", "shippingAddressLine2", "shippingPostalCode", "paymentMethod", "paymentReference", "shippingCarrier", "trackingNumber"] as const;
const ALLOWED_FIELDS = new Set(["expectedUpdatedAt", "convertToFormal", "status", "paymentStatus", "fulfillmentStatus", "shipping", ...STRING_FIELDS]);

function invalidOrder(message: string): never {
  throw Object.assign(new Error(message), { code: "INVALID_ORDER" });
}

export async function GET(_req: NextRequest, context: Context) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const id = parsePositiveId((await context.params).id);
  if (!id) return errorResponse("Invalid order id");
  const order = await prisma.order.findUnique({ where: { id }, include: { customer: { select: { id: true, name: true, email: true, phone: true, status: true } }, items: true } });
  if (!order) return errorResponse("Order not found", 404);
  return NextResponse.json({ order });
}

export async function PATCH(req: NextRequest, context: Context) {
  const admin = await requireAdmin();
  if (isAdminResponse(admin)) return admin;
  const id = parsePositiveId((await context.params).id);
  if (!id) return errorResponse("Invalid order id");
  const parsed = await parseJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (!Object.keys(body).length || Object.keys(body).some((key) => !ALLOWED_FIELDS.has(key))) return errorResponse("Invalid order fields");
  if (typeof body.expectedUpdatedAt !== "string") return errorResponse("expectedUpdatedAt is required");
  const expectedUpdatedAt = new Date(body.expectedUpdatedAt);
  if (Number.isNaN(expectedUpdatedAt.getTime())) return errorResponse("Invalid expectedUpdatedAt");
  if (body.convertToFormal !== undefined && typeof body.convertToFormal !== "boolean") return errorResponse("Invalid conversion request");
  if (body.status !== undefined && typeof body.status !== "string") return errorResponse("Invalid order status");
  if (body.shipping !== undefined && (typeof body.shipping !== "number" || !Number.isFinite(body.shipping) || body.shipping < 0 || body.shipping > 100000000)) return errorResponse("Invalid shipping amount");
  for (const field of STRING_FIELDS) if (body[field] !== undefined && (typeof body[field] !== "string" || body[field].length > (field === "notes" ? 10000 : 500))) return errorResponse(`Invalid ${field}`);
  if (body.paymentStatus !== undefined && (typeof body.paymentStatus !== "string" || !Object.values(PAYMENT_STATUS).includes(body.paymentStatus))) return errorResponse("Invalid payment status");
  if (body.fulfillmentStatus !== undefined && (typeof body.fulfillmentStatus !== "string" || !Object.values(FULFILLMENT_STATUS).includes(body.fulfillmentStatus))) return errorResponse("Invalid fulfillment status");

  try {
    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id } });
      if (!current) throw Object.assign(new Error("Order not found"), { code: "ORDER_NOT_FOUND" });
      if (current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw Object.assign(new Error("The order changed before this update was saved"), { code: "ORDER_CONFLICT" });
      const converting = body.convertToFormal === true;
      const requestedStatus = typeof body.status === "string" ? body.status : undefined;
      if (converting && (current.orderType !== ORDER_TYPE.INQUIRY || current.status !== ORDER_STATUS.QUOTED)) invalidOrder("Only a quoted inquiry can be converted");
      if (!converting && requestedStatus !== undefined) {
        const transition = validateOrderTransition(current.orderType as OrderType, current.status, requestedStatus);
        if (!transition.ok) invalidOrder(transition.error || "Invalid order status transition");
      }
      if (!converting && current.orderType !== ORDER_TYPE.FORMAL && (body.shipping !== undefined || STRING_FIELDS.slice(1).some((field) => body[field] !== undefined) || body.paymentStatus !== undefined || body.fulfillmentStatus !== undefined)) invalidOrder("Convert the inquiry before adding formal order fields");

      const nextType = converting ? ORDER_TYPE.FORMAL : current.orderType;
      const nextStatus = converting ? ORDER_STATUS.CONFIRMED : (requestedStatus ?? current.status);
      const paymentStatus = converting ? PAYMENT_STATUS.UNPAID : (typeof body.paymentStatus === "string" ? body.paymentStatus : current.paymentStatus);
      const shipping = typeof body.shipping === "number" ? body.shipping : Number(current.shipping);
      if (nextStatus === ORDER_STATUS.CANCELLED && paymentStatus === PAYMENT_STATUS.PAID) invalidOrder("A cancelled order cannot be marked paid");
      if (nextStatus === ORDER_STATUS.COMPLETED && ![PAYMENT_STATUS.PAID, PAYMENT_STATUS.REFUNDED].includes(paymentStatus)) invalidOrder("A completed order must be paid or refunded");
      if (current.paymentStatus === PAYMENT_STATUS.PAID && ![PAYMENT_STATUS.PAID, PAYMENT_STATUS.REFUNDED].includes(paymentStatus)) invalidOrder("A paid order cannot be moved back to an unpaid state");
      if (current.paymentStatus === PAYMENT_STATUS.REFUNDED && paymentStatus !== PAYMENT_STATUS.REFUNDED) invalidOrder("A refunded order cannot be moved back to an unpaid state");
      const financiallyLocked = [PAYMENT_STATUS.PAID, PAYMENT_STATUS.REFUNDED].includes(current.paymentStatus) || [ORDER_STATUS.SHIPPED, ORDER_STATUS.COMPLETED].includes(current.status as never);
      if (financiallyLocked && body.shipping !== undefined && shipping !== Number(current.shipping)) invalidOrder("The amount of a paid or fulfilled order cannot be changed");
      const now = new Date();
      const textValue = (field: typeof STRING_FIELDS[number]) => body[field] === undefined ? current[field] : ((body[field] as string).trim() || null);
      const shippingCarrier = textValue("shippingCarrier");
      const trackingNumber = textValue("trackingNumber");

      const expectedFulfillment = nextType === ORDER_TYPE.FORMAL ? fulfillmentForOrderStatus(nextStatus) : FULFILLMENT_STATUS.NOT_REQUIRED;
      if (body.fulfillmentStatus !== undefined && body.fulfillmentStatus !== expectedFulfillment) invalidOrder("Fulfillment status must match the order status");
      if (nextType === ORDER_TYPE.FORMAL && paymentStatus === PAYMENT_STATUS.NOT_REQUIRED) invalidOrder("Formal orders require a payment status");

      const paidAt = paymentStatus === PAYMENT_STATUS.PAID
        ? (current.paidAt || now)
        : paymentStatus === PAYMENT_STATUS.REFUNDED
          ? current.paidAt
          : null;
      if (paymentStatus === PAYMENT_STATUS.REFUNDED && !paidAt) invalidOrder("An unpaid order cannot be refunded");
      if ([ORDER_STATUS.PROCESSING, ORDER_STATUS.SHIPPED].includes(nextStatus as never) && paymentStatus !== PAYMENT_STATUS.PAID) invalidOrder("The order must be paid before processing or shipping");
      if ([ORDER_STATUS.SHIPPED, ORDER_STATUS.COMPLETED].includes(nextStatus as never) && (!shippingCarrier || !trackingNumber)) invalidOrder("Carrier and tracking number are required before shipping");

      const shippedAt = nextStatus === ORDER_STATUS.SHIPPED ? (current.shippedAt || now) : current.shippedAt;
      if (nextStatus === ORDER_STATUS.COMPLETED && (!shippedAt || !paidAt || ![PAYMENT_STATUS.PAID, PAYMENT_STATUS.REFUNDED].includes(paymentStatus as never))) invalidOrder("A completed order must have been shipped and paid");
      const completedAt = nextStatus === ORDER_STATUS.COMPLETED ? (current.completedAt || now) : current.completedAt;
      const cancelledAt = nextStatus === ORDER_STATUS.CANCELLED ? (current.cancelledAt || now) : current.cancelledAt;

      const data: Record<string, unknown> = {
        orderType: nextType,
        status: nextStatus,
        paymentStatus,
        fulfillmentStatus: expectedFulfillment,
        paidAt,
        shippedAt,
        completedAt,
        cancelledAt,
        ...(converting ? { convertedAt: now } : {}),
        ...(body.shipping !== undefined ? { shipping, total: Number(current.subtotal) + shipping } : {}),
      };
      for (const field of STRING_FIELDS) if (body[field] !== undefined) data[field] = field === "notes" ? (body[field] as string).trim() : ((body[field] as string).trim() || null);
      if (converting && shipping !== Number(current.shipping)) data.total = Number(current.subtotal) + shipping;

      const updateResult = await tx.order.updateMany({ where: { id, updatedAt: expectedUpdatedAt }, data: data as never });
      if (updateResult.count !== 1) throw Object.assign(new Error("The order changed before this update was saved"), { code: "ORDER_CONFLICT" });
      const updated = await tx.order.findUnique({ where: { id }, include: { customer: { select: { id: true, name: true, email: true, phone: true, status: true } }, items: true } });
      if (!updated) throw Object.assign(new Error("Order not found"), { code: "ORDER_NOT_FOUND" });
      if (updated.customerId) {
        const aggregate = await tx.order.aggregate({ where: { customerId: updated.customerId }, _count: { _all: true }, _sum: { total: true } });
        await tx.customer.update({ where: { id: updated.customerId }, data: { totalOrders: aggregate._count._all, totalSpend: aggregate._sum.total ?? 0 } });
      }
      return updated;
    });
    return NextResponse.json({ order });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "ORDER_NOT_FOUND") return errorResponse("Order not found", 404);
    if (code === "ORDER_CONFLICT") return errorResponse("This order was changed by another update. Reload and try again.", 409);
    if (code === "INVALID_ORDER") return errorResponse(error instanceof Error ? error.message : "Invalid order update");
    return internalErrorResponse("Order update failed", error);
  }
}
