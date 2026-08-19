import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { parseJsonObject, internalErrorResponse, prismaErrorResponse } from "@/lib/api-route";
import { CustomerAuthConfigurationError, getCustomerSession, normalizeCustomerEmail } from "@/lib/customer-auth";
import { errorResponse, parsePositiveId } from "@/lib/input-validation";
import { ORDER_STATUS, ORDER_TYPE } from "@/lib/order-status";
import { prisma } from "@/lib/prisma";

type RequestedLine = { productId: number; skuId: number | null; quantity: number };
type AuthoritativeItem = { productId: number; productName: string; sku: string; image: string; quantity: number; price: number };

function inquiryInput(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = normalizeCustomerEmail(body.email);
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const country = typeof body.country === "string" ? body.country.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!name || name.length > 160 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 320 || !phone || phone.length > 80) return { ok: false as const, error: "Name, valid email, and phone are required." };
  if ([company, country].some((value) => value.length > 160) || message.length > 5000 || !Array.isArray(body.items) || !body.items.length || body.items.length > 100) return { ok: false as const, error: "The inquiry details are invalid." };
  const lines = new Map<string, RequestedLine>();
  for (const raw of body.items) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false as const, error: "The inquiry contains invalid products." };
    const row = raw as Record<string, unknown>;
    const productId = parsePositiveId(row.productId ?? row.dbId);
    const skuId = row.skuId === undefined || row.skuId === null || row.skuId === "" ? null : parsePositiveId(row.skuId);
    const quantity = Number(row.quantity);
    if (!productId || (row.skuId !== undefined && row.skuId !== null && row.skuId !== "" && !skuId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 9999) return { ok: false as const, error: "The inquiry contains invalid products." };
    const key = `${productId}:${skuId ?? 0}`;
    const combined = (lines.get(key)?.quantity ?? 0) + quantity;
    if (combined > 9999) return { ok: false as const, error: "The inquiry quantity is too large." };
    lines.set(key, { productId, skuId, quantity: combined });
  }
  return { ok: true as const, value: { name, email, phone, company, country, message, lines: [...lines.values()] } };
}

function priceFromText(value: string, fallback: number) {
  if (!value.trim()) return fallback;
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function POST(request: NextRequest) {
  const parsed = await parseJsonObject(request);
  if (!parsed.ok) return parsed.response;
  const validation = inquiryInput(parsed.data);
  if (!validation.ok) return errorResponse(validation.error);
  const { name, email, phone, company, country, message, lines } = validation.value;
  try {
    const existingCustomer = await prisma.customer.findUnique({ where: { email } });
    let sessionCustomer: Awaited<ReturnType<typeof getCustomerSession>> = null;
    if (existingCustomer) {
      if (!existingCustomer.passwordHash) return errorResponse("This email is linked to an existing inquiry record. Please contact support to activate online access.", 409);
      try {
        sessionCustomer = await getCustomerSession();
      } catch (error) {
        if (error instanceof CustomerAuthConfigurationError) return errorResponse(error.message, 503);
        throw error;
      }
      if (!sessionCustomer || sessionCustomer.id !== existingCustomer.id || sessionCustomer.email !== email) return errorResponse("Sign in to submit an inquiry for this customer account.", 403);
    }
    const products = await prisma.product.findMany({
      where: { id: { in: [...new Set(lines.map((line) => line.productId))] } },
      select: { id: true, name: true, sourceSku: true, price: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { src: true } }, skus: { select: { id: true, name: true, price: true, image: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { src: true } } } } },
    });
    const productMap = new Map(products.map((product) => [product.id, product]));
    const items: AuthoritativeItem[] = [];
    for (const line of lines) {
      const product = productMap.get(line.productId);
      if (!product) return errorResponse("One or more products are no longer available.");
      const sku = line.skuId ? product.skus.find((candidate) => candidate.id === line.skuId) : null;
      if (line.skuId && !sku) return errorResponse("One or more product variants are invalid.");
      const productPrice = Math.max(0, Number(product.price ?? 0));
      items.push({ productId: product.id, productName: product.name, sku: sku?.name || product.sourceSku || `MX-${product.id}`, image: sku?.image || sku?.images[0]?.src || product.images[0]?.src || "", quantity: line.quantity, price: sku ? priceFromText(sku.price, productPrice) : productPrice });
    }
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const notes = [company && `Company: ${company}`, country && `Country/market: ${country}`, `Phone/WhatsApp: ${phone}`, message && `Requirements: ${message}`].filter(Boolean).join("\n");
    const inquiryNumber = `INQ-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
    await prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findUnique({ where: { email } });
      if (existing && !existing.passwordHash) throw Object.assign(new Error("Legacy inquiry customer requires support verification"), { code: "LEGACY_CUSTOMER" });
      if (existing && (!sessionCustomer || existing.id !== sessionCustomer.id)) throw Object.assign(new Error("Customer session required"), { code: "CUSTOMER_SESSION_REQUIRED" });
      const customer = existing || await tx.customer.create({ data: { name, email, phone, status: "INQUIRY" } });
      await tx.order.create({ data: { orderNumber: inquiryNumber, customerId: customer.id, customerName: customer.name, customerEmail: customer.email, orderType: ORDER_TYPE.INQUIRY, status: ORDER_STATUS.PENDING_INQUIRY, paymentStatus: "NOT_REQUIRED", fulfillmentStatus: "NOT_REQUIRED", currency: "USD", subtotal, shipping: 0, total: subtotal, notes, items: { create: items } } });
      const aggregate = await tx.order.aggregate({ where: { customerId: customer.id }, _count: { _all: true }, _sum: { total: true } });
      await tx.customer.update({ where: { id: customer.id }, data: { totalOrders: aggregate._count._all, totalSpend: aggregate._sum.total ?? 0 } });
    });
    return NextResponse.json({ ok: true, inquiryNumber }, { status: 201 });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "LEGACY_CUSTOMER") return errorResponse("This email is linked to an existing inquiry record. Please contact support to activate online access.", 409);
    if (code === "CUSTOMER_SESSION_REQUIRED") return errorResponse("Sign in to submit an inquiry for this customer account.", 403);
    const prismaResponse = prismaErrorResponse(error);
    if (prismaResponse) return prismaResponse;
    return internalErrorResponse("Failed to create product inquiry", error);
  }
}
