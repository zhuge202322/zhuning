import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test, { after, before } from "node:test";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const seedScript = path.join(root, "scripts", "seed-cms.mjs");
const tmpRoot = path.join(root, "tests", "api", ".tmp");
mkdirSync(tmpRoot, { recursive: true });
const tmp = mkdtempSync(path.join(tmpRoot, "customers-orders-"));
const databasePath = path.join(tmp, "orders.db");
const databaseUrl = `file:${databasePath.replaceAll("\\", "/")}`;
let server;
let baseUrl;
let prisma;
let adminCookie;
let customerCookie;
let product;
let inquiryId;
let orderVersion;

async function currentOrderVersion(id) {
  const order = await prisma.order.findUnique({ where: { id }, select: { updatedAt: true } });
  return order.updatedAt.toISOString();
}

async function port() {
  return new Promise((resolve, reject) => {
    const socket = createServer();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const address = socket.address();
      socket.close(() => resolve(address.port));
    });
  });
}

async function waitForServer() {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Next server exited with ${server.exitCode}`);
    try { if ((await fetch(`${baseUrl}/admin/login`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Timed out waiting for Next server");
}

async function json(pathname, method, body, cookie = adminCookie) {
  return fetch(`${baseUrl}${pathname}`, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

before(async () => {
  new DatabaseSync(databasePath).close();
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    ADMIN_USERNAME: "orders-admin",
    ADMIN_PASSWORD: "orders-admin-password-123",
    ADMIN_JWT_SECRET: "orders-admin-secret-2026",
    CUSTOMER_JWT_SECRET: "orders-customer-secret-2026",
  };
  execFileSync(process.execPath, [prismaCli, "db", "push", "--skip-generate", "--schema", path.join(root, "prisma", "schema.prisma")], { cwd: root, env, stdio: "pipe" });
  execFileSync(process.execPath, [seedScript], { cwd: root, env, stdio: "pipe" });
  baseUrl = `http://127.0.0.1:${await port()}`;
  server = spawn(process.execPath, [nextCli, "dev", "-p", baseUrl.split(":").at(-1)], { cwd: root, env, stdio: "pipe", windowsHide: true });
  await waitForServer();
  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  const adminLogin = await json("/api/admin/login", "POST", { username: "orders-admin", password: "orders-admin-password-123" }, "");
  adminCookie = adminLogin.headers.get("set-cookie")?.split(";", 1)[0];
  const registration = await json("/api/account/register", "POST", {
    name: "Registered Name", email: "buyer@example.com", password: "buyer-password-123", phone: "+1 555 0100",
  }, "");
  customerCookie = registration.headers.get("set-cookie")?.split(";", 1)[0];
  product = await prisma.product.create({
    data: {
      name: "Database Ring", slug: "database-ring", sourceSku: "RING-ROOT", price: 125.5,
      images: { create: [{ src: "/company/database-ring.webp", alt: "Database ring", sortOrder: 0 }] },
      skus: { create: [{ name: "Rose Gold / 7", price: "149.75", image: "/company/ring-rose.webp", size: "7" }] },
    },
    include: { skus: true },
  });
});

after(async () => {
  await prisma?.$disconnect();
  if (server && server.exitCode === null) {
    server.kill();
    await new Promise((resolve) => server.once("exit", resolve));
  }
  rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

test("creates an inquiry from authoritative product and SKU snapshots", async () => {
  const beforeCustomer = await prisma.customer.findUnique({ where: { email: "buyer@example.com" } });
  const response = await json("/api/inquiries", "POST", {
    name: "Inquiry Display Name",
    email: "BUYER@example.com",
    phone: "+1 555 0199",
    company: "Buyer Co",
    country: "US",
    message: "Quote 3 pieces",
    subtotal: 0.01,
    total: 0.01,
    items: [{ dbId: product.id, skuId: product.skus[0].id, quantity: 3, name: "Tampered", sku: "BAD", image: "javascript:x", price: 0.01 }],
  }, customerCookie);
  const body = await response.json();
  assert.equal(response.status, 201, JSON.stringify(body));
  const order = await prisma.order.findUnique({ where: { orderNumber: body.inquiryNumber }, include: { items: true, customer: true } });
  inquiryId = order.id;
  assert.equal(order.orderType, "INQUIRY");
  assert.equal(order.status, "PENDING_INQUIRY");
  assert.equal(Number(order.subtotal), 449.25);
  assert.equal(Number(order.total), 449.25);
  assert.deepEqual(order.items.map((item) => ({ name: item.productName, sku: item.sku, image: item.image, quantity: item.quantity, price: Number(item.price) })), [
    { name: "Database Ring", sku: "Rose Gold / 7", image: "/company/ring-rose.webp", quantity: 3, price: 149.75 },
  ]);
  assert.equal(order.customer.passwordHash, beforeCustomer.passwordHash);
  assert.equal(order.customer.status, "ACTIVE");
  assert.equal(order.customer.name, beforeCustomer.name);
  assert.equal(order.customer.phone, beforeCustomer.phone);
  assert.equal(order.customer.notes, beforeCustomer.notes);
  assert.equal(order.customer.totalOrders, 1);
  assert.equal(Number(order.customer.totalSpend), 449.25);
  orderVersion = await currentOrderVersion(inquiryId);
});

test("rejects anonymous inquiry for a registered customer and preserves customer fields", async () => {
  const before = await prisma.customer.findUnique({ where: { email: "buyer@example.com" } });
  const response = await json("/api/inquiries", "POST", {
    name: "Tampered Name", email: "buyer@example.com", phone: "+1 000 0000", company: "Bad Co", message: "Overwrite me",
    items: [{ dbId: product.id, quantity: 1 }],
  }, "");
  const body = await response.json();
  assert.equal(response.status, 403, JSON.stringify(body));
  const after = await prisma.customer.findUnique({ where: { id: before.id } });
  assert.equal(after.name, before.name);
  assert.equal(after.phone, before.phone);
  assert.equal(after.notes, before.notes);
  assert.equal(after.status, before.status);
});

test("rejects malformed and nonexistent inquiry items", async () => {
  assert.equal((await json("/api/inquiries", "POST", { name: "A", email: "a@example.com", phone: "1", items: "bad" }, "")).status, 400);
  assert.equal((await json("/api/inquiries", "POST", { name: "A", email: "a@example.com", phone: "1", items: [{ dbId: 999999, quantity: 1 }] }, "")).status, 400);
  const wrongSku = await prisma.productSku.create({ data: { productId: product.id, name: "Other" } });
  const otherProduct = await prisma.product.create({ data: { name: "Other", slug: "other", sourceSku: "OTHER", skus: { create: { name: "Other SKU" } } }, include: { skus: true } });
  assert.equal((await json("/api/inquiries", "POST", { name: "A", email: "a@example.com", phone: "1", items: [{ dbId: otherProduct.id, skuId: wrongSku.id, quantity: 1 }] }, "")).status, 400);
});

test("admin customer APIs paginate, search, edit, disable, and never expose hashes", async () => {
  assert.equal((await fetch(`${baseUrl}/api/admin/customers`, { headers: { cookie: customerCookie } })).status, 401);
  const listResponse = await fetch(`${baseUrl}/api/admin/customers?q=buyer&status=ACTIVE&limit=10`, { headers: { cookie: adminCookie } });
  const list = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(list.items.length, 1);
  assert.equal(JSON.stringify(list).includes("passwordHash"), false);
  await prisma.customer.create({ data: { name: "Second Buyer", email: "second@example.com", status: "ACTIVE" } });
  const firstPage = await (await fetch(`${baseUrl}/api/admin/customers?limit=1&page=1`, { headers: { cookie: adminCookie } })).json();
  const secondPage = await (await fetch(`${baseUrl}/api/admin/customers?limit=1&page=2`, { headers: { cookie: adminCookie } })).json();
  assert.equal(firstPage.items.length, 1);
  assert.equal(secondPage.items.length, 1);
  assert.notEqual(firstPage.items[0].id, secondPage.items[0].id);
  const id = list.items[0].id;
  const detail = await (await fetch(`${baseUrl}/api/admin/customers/${id}`, { headers: { cookie: adminCookie } })).json();
  assert.equal(detail.customer.orders[0].id, inquiryId);
  assert.equal("passwordHash" in detail.customer, false);

  const updated = await json(`/api/admin/customers/${id}`, "PATCH", { name: "Edited Buyer", email: "edited@example.com", phone: "+44 20", notes: "Priority", status: "DISABLED" });
  assert.equal(updated.status, 200);
  const stored = await prisma.customer.findUnique({ where: { id } });
  assert.equal(stored.name, "Edited Buyer");
  assert.ok(stored.disabledAt);
  assert.ok(stored.passwordHash);
  assert.equal((await fetch(`${baseUrl}/api/account/session`, { headers: { cookie: customerCookie } })).status, 401);

  assert.equal((await json(`/api/admin/customers/${id}`, "PATCH", { status: "ACTIVE" })).status, 200);
  assert.equal((await prisma.customer.findUnique({ where: { id } })).disabledAt, null);
});

test("admin order APIs filter, detail, validate transitions, convert, and save formal fields", async () => {
  assert.equal((await fetch(`${baseUrl}/api/admin/orders`)).status, 401);
  const filteredResponse = await fetch(`${baseUrl}/api/admin/orders?type=INQUIRY&status=PENDING_INQUIRY&customer=edited@example.com&limit=10`, { headers: { cookie: adminCookie } });
  const filtered = await filteredResponse.json();
  assert.equal(filteredResponse.status, 200, JSON.stringify(filtered));
  assert.equal(filtered.items.length, 1);
  assert.equal(filtered.items[0].id, inquiryId);

  const detail = await (await fetch(`${baseUrl}/api/admin/orders/${inquiryId}`, { headers: { cookie: adminCookie } })).json();
  assert.equal(detail.order.items[0].productName, "Database Ring");
  assert.equal((await json(`/api/admin/orders/${inquiryId}`, "PATCH", { status: "SHIPPED", expectedUpdatedAt: await currentOrderVersion(inquiryId) })).status, 400);
  assert.equal((await json(`/api/admin/orders/${inquiryId}`, "PATCH", { status: "QUOTED", expectedUpdatedAt: await currentOrderVersion(inquiryId) })).status, 400);
  let version = await currentOrderVersion(inquiryId);
  let response = await json(`/api/admin/orders/${inquiryId}`, "PATCH", { status: "CONTACTED", expectedUpdatedAt: version });
  assert.equal(response.status, 200);
  version = await currentOrderVersion(inquiryId);
  response = await json(`/api/admin/orders/${inquiryId}`, "PATCH", { status: "QUOTED", notes: "Quote approved", expectedUpdatedAt: version });
  assert.equal(response.status, 200);

  const convertedResponse = await json(`/api/admin/orders/${inquiryId}`, "PATCH", {
    convertToFormal: true,
    shipping: 25,
    shippingRecipient: "Edited Buyer",
    shippingPhone: "+44 20",
    shippingCountry: "GB",
    shippingAddressLine1: "1 Gold Street",
    shippingAddressLine2: "Suite 7",
    shippingPostalCode: "W1 1AA",
    paymentMethod: "Bank transfer",
    paymentReference: "PAY-001",
    expectedUpdatedAt: await currentOrderVersion(inquiryId),
  });
  const converted = await convertedResponse.json();
  assert.equal(convertedResponse.status, 200, JSON.stringify(converted));
  assert.equal(converted.order.orderType, "FORMAL");
  assert.equal(converted.order.status, "CONFIRMED");
  assert.ok(converted.order.convertedAt);
  assert.equal(Number(converted.order.total), 474.25);
  assert.equal(Number((await prisma.customer.findUnique({ where: { id: converted.order.customerId } })).totalSpend), 474.25);

  assert.equal((await json(`/api/admin/orders/${inquiryId}`, "PATCH", { status: "PROCESSING", expectedUpdatedAt: await currentOrderVersion(inquiryId) })).status, 400);
  assert.equal((await json(`/api/admin/orders/${inquiryId}`, "PATCH", { paymentStatus: "PAID", paidAt: "2000-01-01T00:00:00.000Z", expectedUpdatedAt: await currentOrderVersion(inquiryId) })).status, 400);
  const paid = await json(`/api/admin/orders/${inquiryId}`, "PATCH", { paymentStatus: "PAID", expectedUpdatedAt: await currentOrderVersion(inquiryId) });
  const paidBody = await paid.json();
  assert.equal(paid.status, 200, JSON.stringify(paidBody));
  assert.ok(paidBody.order.paidAt);
  assert.notEqual(paidBody.order.paidAt, "2000-01-01T00:00:00.000Z");
  assert.equal((await json(`/api/admin/orders/${inquiryId}`, "PATCH", { shipping: 30, expectedUpdatedAt: await currentOrderVersion(inquiryId) })).status, 400);

  assert.equal((await json(`/api/admin/orders/${inquiryId}`, "PATCH", { status: "PROCESSING", fulfillmentStatus: "SHIPPED", expectedUpdatedAt: await currentOrderVersion(inquiryId) })).status, 400);
  const processing = await json(`/api/admin/orders/${inquiryId}`, "PATCH", { status: "PROCESSING", expectedUpdatedAt: await currentOrderVersion(inquiryId) });
  assert.equal(processing.status, 200);
  assert.equal((await processing.json()).order.fulfillmentStatus, "PROCESSING");
  assert.equal((await json(`/api/admin/orders/${inquiryId}`, "PATCH", { status: "SHIPPED", expectedUpdatedAt: await currentOrderVersion(inquiryId) })).status, 400);

  const shipped = await json(`/api/admin/orders/${inquiryId}`, "PATCH", { status: "SHIPPED", shippingCarrier: "DHL", trackingNumber: "TRACK-001", expectedUpdatedAt: await currentOrderVersion(inquiryId) });
  const shippedBody = await shipped.json();
  assert.equal(shipped.status, 200, JSON.stringify(shippedBody));
  assert.equal(shippedBody.order.fulfillmentStatus, "SHIPPED");
  assert.ok(shippedBody.order.shippedAt);
  const completed = await json(`/api/admin/orders/${inquiryId}`, "PATCH", { status: "COMPLETED", expectedUpdatedAt: await currentOrderVersion(inquiryId) });
  const completedBody = await completed.json();
  assert.equal(completed.status, 200, JSON.stringify(completedBody));
  assert.equal(completedBody.order.fulfillmentStatus, "FULFILLED");
  assert.ok(completedBody.order.completedAt);

  const unpaidShipped = await prisma.order.create({ data: { orderNumber: "ORD-UNPAID-SHIPPED", customerName: "Risk", customerEmail: "risk@example.com", orderType: "FORMAL", status: "SHIPPED", paymentStatus: "UNPAID", fulfillmentStatus: "SHIPPED", shippingCarrier: "DHL", trackingNumber: "RISK", shippedAt: new Date() } });
  assert.equal((await json(`/api/admin/orders/${unpaidShipped.id}`, "PATCH", { status: "COMPLETED", expectedUpdatedAt: await currentOrderVersion(unpaidShipped.id) })).status, 400);

  const cancelled = await prisma.order.create({ data: { orderNumber: "ORD-CANCELLED", customerId: inquiryId ? (await prisma.order.findUnique({ where: { id: inquiryId }, select: { customerId: true } })).customerId : null, customerName: "Risk", customerEmail: "risk@example.com", orderType: "FORMAL", status: "CANCELLED", paymentStatus: "UNPAID", fulfillmentStatus: "CANCELLED" } });
  assert.equal((await json(`/api/admin/orders/${cancelled.id}`, "PATCH", { paymentStatus: "PAID", expectedUpdatedAt: await currentOrderVersion(cancelled.id) })).status, 400);

  const combinedCancelled = await prisma.order.create({ data: { orderNumber: "ORD-CANCELLED-COMBINED", customerId: cancelled.customerId, customerName: "Risk", customerEmail: "risk@example.com", orderType: "FORMAL", status: "CONFIRMED", paymentStatus: "UNPAID", fulfillmentStatus: "UNFULFILLED", subtotal: 50, total: 50 } });
  const combinedCancelledResponse = await json(`/api/admin/orders/${combinedCancelled.id}`, "PATCH", { status: "CANCELLED", paymentStatus: "PAID", expectedUpdatedAt: await currentOrderVersion(combinedCancelled.id) });
  assert.equal(combinedCancelledResponse.status, 400);
  const combinedCancelledStored = await prisma.order.findUnique({ where: { id: combinedCancelled.id } });
  assert.equal(combinedCancelledStored.status, "CONFIRMED");
  assert.equal(combinedCancelledStored.paymentStatus, "UNPAID");

  const contradictoryCompleted = await prisma.order.create({ data: { orderNumber: "ORD-COMPLETED-CONTRADICTORY", customerId: cancelled.customerId, customerName: "Risk", customerEmail: "risk@example.com", orderType: "FORMAL", status: "SHIPPED", paymentStatus: "UNPAID", fulfillmentStatus: "SHIPPED", shippingCarrier: "DHL", trackingNumber: "RISK-COMPLETED", shippedAt: new Date() } });
  assert.equal((await json(`/api/admin/orders/${contradictoryCompleted.id}`, "PATCH", { status: "COMPLETED", paymentStatus: "UNPAID", expectedUpdatedAt: await currentOrderVersion(contradictoryCompleted.id) })).status, 400);

  const stale = await currentOrderVersion(inquiryId);
  const firstUpdate = await json(`/api/admin/orders/${inquiryId}`, "PATCH", { notes: "Fresh update", expectedUpdatedAt: stale });
  assert.equal(firstUpdate.status, 200);
  const staleResponse = await json(`/api/admin/orders/${inquiryId}`, "PATCH", { notes: "Stale update", expectedUpdatedAt: stale });
  assert.equal(staleResponse.status, 409);
  await prisma.customer.update({ where: { id: (await prisma.order.findUnique({ where: { id: inquiryId }, select: { customerId: true } })).customerId }, data: { totalSpend: 999999 } });
  const reaggregate = await json(`/api/admin/orders/${inquiryId}`, "PATCH", { notes: "Reaggregate", expectedUpdatedAt: await currentOrderVersion(inquiryId) });
  assert.equal(reaggregate.status, 200);
  const finalOrder = await prisma.order.findUnique({ where: { id: inquiryId }, select: { customerId: true } });
  const aggregate = await prisma.order.aggregate({ where: { customerId: finalOrder.customerId }, _sum: { total: true } });
  assert.equal(Number((await prisma.customer.findUnique({ where: { id: finalOrder.customerId } })).totalSpend), Number(aggregate._sum.total));

  const firstOrderPage = await (await fetch(`${baseUrl}/api/admin/orders?limit=1&page=1`, { headers: { cookie: adminCookie } })).json();
  const secondOrderPage = await (await fetch(`${baseUrl}/api/admin/orders?limit=1&page=2`, { headers: { cookie: adminCookie } })).json();
  assert.notEqual(firstOrderPage.items[0].id, secondOrderPage.items[0].id);
});

test("admin mutations reject malformed JSON and unknown records consistently", async () => {
  const malformed = await fetch(`${baseUrl}/api/admin/orders/${inquiryId}`, { method: "PATCH", headers: { "content-type": "application/json", cookie: adminCookie }, body: "{" });
  assert.equal(malformed.status, 400);
  assert.equal((await json(`/api/admin/orders/${inquiryId}`, "PATCH", { notes: "Missing version" })).status, 400);
  assert.equal((await json("/api/admin/customers/999999", "PATCH", { name: "Nope" })).status, 404);
  assert.equal((await json("/api/admin/orders/999999", "PATCH", { notes: "Nope", expectedUpdatedAt: new Date(0).toISOString() })).status, 404);
});

test("account orders provide bounded page and cursor pagination with stable errors", async () => {
  const login = await json("/api/account/login", "POST", { email: "edited@example.com", password: "buyer-password-123" }, "");
  customerCookie = login.headers.get("set-cookie")?.split(";", 1)[0];
  const first = await fetch(`${baseUrl}/api/account/orders?page=1&limit=1`, { headers: { cookie: customerCookie } });
  const firstBody = await first.json();
  assert.equal(first.status, 200, JSON.stringify(firstBody));
  assert.equal(firstBody.orders.length, 1);
  assert.equal(firstBody.limit, 1);
  assert.ok(firstBody.total >= 1);
  assert.equal((await fetch(`${baseUrl}/api/account/orders?page=0&limit=1`, { headers: { cookie: customerCookie } })).status, 400);
  assert.equal((await fetch(`${baseUrl}/api/account/orders?limit=0`, { headers: { cookie: customerCookie } })).status, 400);
  assert.equal((await fetch(`${baseUrl}/api/account/orders?limit=1`)).status, 401);
  if (firstBody.nextCursor) {
    const next = await fetch(`${baseUrl}/api/account/orders?limit=1&cursor=${encodeURIComponent(firstBody.nextCursor)}`, { headers: { cookie: customerCookie } });
    const nextBody = await next.json();
    assert.equal(next.status, 200, JSON.stringify(nextBody));
    assert.notEqual(nextBody.orders[0]?.id, firstBody.orders[0]?.id);
  }
});
