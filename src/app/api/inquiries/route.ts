import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type InquiryItem = {
  dbId?: number;
  quantity?: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const company = String(body.company || "").trim();
    const country = String(body.country || "").trim();
    const message = String(body.message || "").trim();
    const items = Array.isArray(body.items) ? (body.items as InquiryItem[]) : [];

    if (!name || !email || !phone || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Name, valid email, and phone are required." }, { status: 400 });
    }
    if (!items.length) {
      return NextResponse.json({ error: "Add at least one product to the inquiry cart." }, { status: 400 });
    }

    const normalizedItems = items.map((item) => ({
      dbId: Number(item.dbId || 0),
      quantity: Math.max(1, Math.min(9999, Math.round(Number(item.quantity || 1)))),
    }));
    const requestedIds = [...new Set(normalizedItems.map((item) => item.dbId).filter((id) => id > 0))];
    if (!requestedIds.length || requestedIds.length > 100) {
      return NextResponse.json({ error: "The inquiry contains invalid products." }, { status: 400 });
    }

    const existingProducts = await prisma.product.findMany({
      where: { id: { in: requestedIds } },
      select: {
        id: true,
        name: true,
        sourceSku: true,
        price: true,
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { src: true },
        },
      },
    });
    if (existingProducts.length !== requestedIds.length) {
      return NextResponse.json({ error: "One or more products are no longer available." }, { status: 400 });
    }

    const requestedQuantity = new Map<number, number>();
    normalizedItems.forEach((item) => {
      requestedQuantity.set(
        item.dbId,
        Math.min(9999, (requestedQuantity.get(item.dbId) || 0) + item.quantity),
      );
    });
    const authoritativeItems = existingProducts.map((product) => ({
      productId: product.id,
      productName: product.name,
      sku: product.sourceSku || `MX-${product.id}`,
      image: product.images[0]?.src || "",
      quantity: requestedQuantity.get(product.id) || 1,
      price: Math.max(0, Number(product.price || 0)),
    }));
    const subtotal = authoritativeItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const notes = [
      company ? `Company: ${company}` : "",
      country ? `Country/market: ${country}` : "",
      `Phone/WhatsApp: ${phone}`,
      message ? `Requirements: ${message}` : "",
    ].filter(Boolean).join("\n");

    const inquiryNumber = `INQ-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;

    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { email },
        update: { name, phone, status: "Inquiry", notes },
        create: { name, email, phone, status: "Inquiry", notes },
      });

      await tx.order.create({
        data: {
          orderNumber: inquiryNumber,
          customerId: customer.id,
          customerName: name,
          customerEmail: email,
          status: "New inquiry",
          paymentStatus: "Not required",
          fulfillmentStatus: "Awaiting quote",
          currency: "USD",
          subtotal,
          shipping: 0,
          total: subtotal,
          notes,
          items: { create: authoritativeItems },
        },
      });
      await tx.customer.update({
        where: { id: customer.id },
        data: { totalOrders: { increment: 1 } },
      });
    });

    return NextResponse.json({ ok: true, inquiryNumber });
  } catch (error) {
    console.error("Failed to create product inquiry", error);
    return NextResponse.json({ error: "Unable to save the inquiry. Please try again." }, { status: 500 });
  }
}
