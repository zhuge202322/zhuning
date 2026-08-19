import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ORDER_STATUS,
  ORDER_TYPE,
  ORDER_STATUSES,
  fulfillmentForOrderStatus,
  normalizeLegacyOrderStatus,
  validateOrderTransition,
} from "../../src/lib/order-status-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("exports only the approved strict order statuses", () => {
  assert.deepEqual(ORDER_STATUSES, [
    "PENDING_INQUIRY", "CONTACTED", "QUOTED", "CONFIRMED",
    "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED",
  ]);
  assert.deepEqual(Object.values(ORDER_STATUS), ORDER_STATUSES);
});

test("allows only sequential inquiry and formal transitions", () => {
  assert.equal(validateOrderTransition(ORDER_TYPE.INQUIRY, ORDER_STATUS.PENDING_INQUIRY, ORDER_STATUS.CONTACTED).ok, true);
  assert.equal(validateOrderTransition(ORDER_TYPE.INQUIRY, ORDER_STATUS.CONTACTED, ORDER_STATUS.QUOTED).ok, true);
  assert.equal(validateOrderTransition(ORDER_TYPE.INQUIRY, ORDER_STATUS.PENDING_INQUIRY, ORDER_STATUS.QUOTED).ok, false);
  assert.equal(validateOrderTransition(ORDER_TYPE.FORMAL, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PROCESSING).ok, true);
  assert.equal(validateOrderTransition(ORDER_TYPE.FORMAL, ORDER_STATUS.PROCESSING, ORDER_STATUS.SHIPPED).ok, true);
  assert.equal(validateOrderTransition(ORDER_TYPE.FORMAL, ORDER_STATUS.SHIPPED, ORDER_STATUS.COMPLETED).ok, true);
  assert.equal(validateOrderTransition(ORDER_TYPE.FORMAL, ORDER_STATUS.COMPLETED, ORDER_STATUS.PROCESSING).ok, false);
});

test("normalizes legacy statuses without keeping unsupported values", () => {
  assert.equal(normalizeLegacyOrderStatus(ORDER_TYPE.INQUIRY, "QUOTING"), ORDER_STATUS.CONTACTED);
  assert.equal(normalizeLegacyOrderStatus(ORDER_TYPE.INQUIRY, "CLOSED"), ORDER_STATUS.QUOTED);
  assert.equal(normalizeLegacyOrderStatus(ORDER_TYPE.FORMAL, "CLOSED"), ORDER_STATUS.COMPLETED);
  assert.equal(normalizeLegacyOrderStatus(ORDER_TYPE.FORMAL, "PENDING_PAYMENT"), ORDER_STATUS.CONFIRMED);
  assert.equal(normalizeLegacyOrderStatus(ORDER_TYPE.FORMAL, "PAID"), ORDER_STATUS.PROCESSING);
});

test("derives fulfillment status from formal order status", () => {
  assert.equal(fulfillmentForOrderStatus(ORDER_STATUS.CONFIRMED), "UNFULFILLED");
  assert.equal(fulfillmentForOrderStatus(ORDER_STATUS.PROCESSING), "PROCESSING");
  assert.equal(fulfillmentForOrderStatus(ORDER_STATUS.SHIPPED), "SHIPPED");
  assert.equal(fulfillmentForOrderStatus(ORDER_STATUS.COMPLETED), "FULFILLED");
  assert.equal(fulfillmentForOrderStatus(ORDER_STATUS.CANCELLED), "CANCELLED");
});

test("migration normalizes prior Task 5 and legacy statuses", () => {
  const sql = readFileSync(path.join(root, "prisma/migrations/20260819000300_customer_order_management/migration.sql"), "utf8");
  assert.match(sql, /'CONTACTED'.*'QUOTING'/s);
  assert.match(sql, /'COMPLETED'.*'QUOTED'.*'CLOSED'/s);
  assert.match(sql, /'CONFIRMED'.*'PENDING_PAYMENT'/s);
  assert.match(sql, /'PROCESSING'.*'PAID'/s);
});
