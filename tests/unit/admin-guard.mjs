import assert from "node:assert/strict";
import test from "node:test";

import { assertSingleSuperAdmin, isSuperAdminSession } from "../../src/lib/admin-guard-core.mjs";
import {
  parsePositiveId,
  validateOrderFields,
  validateUploadMetadata,
} from "../../src/lib/input-validation-core.mjs";

test("accepts only a session that identifies the single database administrator", () => {
  const admin = { id: 7, username: "owner", sessionVersion: "2026-08-19T01:02:03.004Z" };

  assert.equal(isSuperAdminSession({ id: 7, username: "owner", sessionVersion: admin.sessionVersion }, admin), true);
  assert.equal(isSuperAdminSession({ id: 7, username: "owner", sessionVersion: "2026-08-19T01:02:03.003Z" }, admin), false);
  assert.equal(isSuperAdminSession({ id: 7, username: "other", sessionVersion: admin.sessionVersion }, admin), false);
});

test("rejects anonymous, malformed, and customer sessions", () => {
  const admin = { id: 7, username: "owner" };

  assert.equal(isSuperAdminSession(null, admin), false);
  assert.equal(isSuperAdminSession({ id: Number.NaN, username: "owner" }, admin), false);
  assert.equal(isSuperAdminSession({ id: 7, username: "owner", role: "customer" }, admin), false);
});

test("fails closed when more than one administrator exists", () => {
  assert.doesNotThrow(() => assertSingleSuperAdmin([{ id: 1 }]));
  assert.throws(
    () => assertSingleSuperAdmin([{ id: 1 }, { id: 2 }]),
    /Exactly one Super Admin is required/,
  );
});

test("normalizes ids and rejects malformed identifiers", () => {
  assert.equal(parsePositiveId("42"), 42);
  assert.equal(parsePositiveId("4.2"), null);
  assert.equal(parsePositiveId("../1"), null);
});

test("validates reserved inquiry and formal order fields", () => {
  assert.equal(validateOrderFields({ orderType: "INQUIRY", status: "PENDING_INQUIRY" }).ok, true);
  assert.equal(validateOrderFields({ orderType: "FORMAL", status: "SHIPPED", trackingNumber: "DHL-42" }).ok, true);
  assert.equal(validateOrderFields({ orderType: "SALE", status: "PAID" }).ok, false);
});

test("validates upload metadata by MIME, size, and filename", () => {
  assert.equal(validateUploadMetadata({ originalName: "hero.webp", mimeType: "image/webp", byteSize: 2048 }).ok, true);
  assert.equal(validateUploadMetadata({ originalName: "page.html", mimeType: "text/html", byteSize: 20 }).ok, false);
  assert.equal(validateUploadMetadata({ originalName: "../hero.webp", mimeType: "image/webp", byteSize: 2048 }).ok, false);
  assert.equal(validateUploadMetadata({ originalName: "large.mp4", mimeType: "video/mp4", byteSize: 300 * 1024 * 1024 }).ok, false);
  assert.equal(validateUploadMetadata({ originalName: "vector.svg", mimeType: "image/svg+xml", byteSize: 100 }).ok, false);
});
