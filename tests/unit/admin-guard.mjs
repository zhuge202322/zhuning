import assert from "node:assert/strict";
import test from "node:test";

import { assertSingleSuperAdmin, isSuperAdminSession } from "../../src/lib/admin-guard-core.mjs";

test("accepts only a session that identifies the single database administrator", () => {
  const admin = { id: 7, username: "owner" };

  assert.equal(isSuperAdminSession({ id: 7, username: "owner" }, admin), true);
  assert.equal(isSuperAdminSession({ id: 7, username: "other" }, admin), false);
});

test("rejects anonymous, malformed, and customer sessions", () => {
  const admin = { id: 7, username: "owner" };

  assert.equal(isSuperAdminSession(null, admin), false);
  assert.equal(isSuperAdminSession({ id: Number.NaN, username: "owner" }, admin), false);
  assert.equal(isSuperAdminSession({ id: 7, username: "owner", kind: "customer" }, admin), false);
});

test("fails closed when more than one administrator exists", () => {
  assert.doesNotThrow(() => assertSingleSuperAdmin([{ id: 1 }]));
  assert.throws(
    () => assertSingleSuperAdmin([{ id: 1 }, { id: 2 }]),
    /Exactly one Super Admin is required/,
  );
});
