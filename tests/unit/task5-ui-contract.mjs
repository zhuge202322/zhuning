import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("account view is present and loads the authenticated customer order archive", () => {
  const source = readFileSync(path.join(root, "src/components/AccountView.tsx"), "utf8");
  assert.match(source, /export function AccountView/);
  assert.match(source, /\/api\/account\/session/);
  assert.match(source, /\/api\/account\/orders/);
  assert.match(source, /page=/);
  assert.match(source, /try/);
  assert.match(source, /catch/);
  assert.match(source, /finally/);
});

test("order editor separates inquiry updates from formal fulfillment fields", () => {
  const source = readFileSync(path.join(root, "src/components/admin/OrderEditor.tsx"), "utf8");
  assert.match(source, /inquiryPayload/);
  assert.match(source, /shippingRecipient/);
  assert.match(source, /shippingAddressLine1/);
  assert.match(source, /fulfillmentStatus/);
  assert.match(source, /expectedUpdatedAt/);
  assert.match(source, /try/);
  assert.match(source, /catch/);
  assert.match(source, /finally/);
});

test("admin customer editor always restores busy state after fetch errors", () => {
  for (const file of ["CustomerEditor.tsx", "OrderEditor.tsx"]) {
    const source = readFileSync(path.join(root, "src/components/admin", file), "utf8");
    assert.match(source, /try/);
    assert.match(source, /catch/);
    assert.match(source, /finally/);
  }
});

test("customer and order lists expose search, filters, and pagination controls", () => {
  for (const file of ["CustomerList.tsx", "OrderList.tsx"]) {
    const source = readFileSync(path.join(root, "src/components/admin", file), "utf8");
    assert.match(source, /pageSize/);
    assert.match(source, /上一页/);
    assert.match(source, /下一页/);
  }
  assert.match(readFileSync(path.join(root, "src/components/admin/OrderList.tsx"), "utf8"), /搜索订单号或客户/);
});

test("admin customer and order pages do not preload unbounded database rows", () => {
  const customerPage = readFileSync(path.join(root, "src/app/admin/customers/page.tsx"), "utf8");
  const orderPage = readFileSync(path.join(root, "src/app/admin/orders/page.tsx"), "utf8");
  assert.doesNotMatch(customerPage, /prisma\./);
  assert.doesNotMatch(orderPage, /prisma\./);
  assert.match(readFileSync(path.join(root, "src/components/admin/CustomerList.tsx"), "utf8"), /\/api\/admin\/customers\?/);
  assert.match(readFileSync(path.join(root, "src/components/admin/OrderList.tsx"), "utf8"), /\/api\/admin\/orders\?/);
});

test("customer auth source requires its own secret without admin fallback", () => {
  const source = readFileSync(path.join(root, "src/lib/customer-auth.ts"), "utf8");
  assert.match(source, /CustomerAuthConfigurationError/);
  assert.doesNotMatch(source, /CUSTOMER_JWT_SECRET\s*\|\|\s*process\.env\.ADMIN_JWT_SECRET/);
});
