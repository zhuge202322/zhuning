import assert from "node:assert/strict";
import test from "node:test";

import { customerJwtSecret } from "../../src/lib/customer-auth-core.mjs";

test("requires an independent customer JWT secret", () => {
  assert.throws(() => customerJwtSecret({ ADMIN_JWT_SECRET: "admin-only" }), /CUSTOMER_JWT_SECRET/);
  assert.throws(() => customerJwtSecret({ CUSTOMER_JWT_SECRET: "" }), /CUSTOMER_JWT_SECRET/);
  assert.equal(customerJwtSecret({ CUSTOMER_JWT_SECRET: "customer-only" }), "customer-only");
});
