import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test, { after, before } from "node:test";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const prismaCli = path.join(repositoryRoot, "node_modules", "prisma", "build", "index.js");
const seedScript = path.join(repositoryRoot, "scripts", "seed-cms.mjs");
const temporaryRoot = path.join(repositoryRoot, "tests", "unit", ".tmp");
mkdirSync(temporaryRoot, { recursive: true });
const temporaryDirectory = mkdtempSync(path.join(temporaryRoot, "cms-contract-"));
const temporarySchema = path.join(repositoryRoot, "prisma", "schema.prisma");
const databasePath = path.join(temporaryDirectory, "contract.db");
const databaseUrl = `file:${databasePath.replaceAll("\\", "/")}`;
const childEnvironment = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  ADMIN_USERNAME: "contract-admin",
  ADMIN_PASSWORD: "contract-password-123",
};

let prisma;

before(async () => {
  new DatabaseSync(databasePath).close();
  execFileSync(
    process.execPath,
    [prismaCli, "db", "push", "--schema", temporarySchema, "--skip-generate"],
    { cwd: repositoryRoot, env: childEnvironment, stdio: "pipe" },
  );
  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  await prisma.$transaction([
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.mediaAsset.deleteMany(),
    prisma.pageSection.deleteMany(),
    prisma.siteSetting.deleteMany(),
    prisma.adminUser.deleteMany(),
  ]);
});

after(async () => {
  await prisma?.$disconnect();
  rmSync(temporaryDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

test("CMS models can be created and read", async () => {
  const setting = await prisma.siteSetting.create({
    data: { key: "site.name", value: "Muxcor" },
  });
  const section = await prisma.pageSection.create({
    data: { pageKey: "home", sectionKey: "hero", title: "Jewelry sourcing" },
  });
  const media = await prisma.mediaAsset.create({
    data: {
      originalName: "hero.webp",
      fileName: "cms-hero.webp",
      url: "/uploads/cms-hero.webp",
      mimeType: "image/webp",
      byteSize: 2048,
      width: 1200,
      height: 800,
    },
  });

  assert.equal((await prisma.siteSetting.findUnique({ where: { key: setting.key } })).value, "Muxcor");
  assert.equal((await prisma.pageSection.findUnique({ where: { id: section.id } })).dataJson, "{}");
  assert.equal((await prisma.mediaAsset.findUnique({ where: { id: media.id } })).width, 1200);
});

test("page and section keys are unique as a pair", async () => {
  await prisma.pageSection.create({ data: { pageKey: "about", sectionKey: "hero" } });

  await assert.rejects(
    prisma.pageSection.create({ data: { pageKey: "about", sectionKey: "hero" } }),
    (error) => error?.code === "P2002",
  );
});

test("inquiry and formal order fields preserve their distinct shapes", async () => {
  const inquiry = await prisma.order.create({
    data: {
      orderNumber: "INQ-CONTRACT-1",
      customerName: "Inquiry Buyer",
      customerEmail: "inquiry@example.com",
    },
  });
  const formal = await prisma.order.create({
    data: {
      orderNumber: "ORD-CONTRACT-1",
      customerName: "Formal Buyer",
      customerEmail: "formal@example.com",
      orderType: "FORMAL",
      status: "PROCESSING",
      shippingRecipient: "Receiving Team",
      shippingPhone: "+86 20 5555 1234",
      shippingCountry: "China",
      shippingAddressLine1: "No. 179 Yingbin Road",
      shippingAddressLine2: "Guangzhou",
      shippingPostalCode: "510000",
      paymentMethod: "bank-transfer",
      paymentReference: "PAY-CONTRACT-1",
      shippingCarrier: "DHL",
      trackingNumber: "TRACK-CONTRACT-1",
      shippedAt: new Date("2026-08-18T00:00:00.000Z"),
      completedAt: new Date("2026-08-19T00:00:00.000Z"),
    },
  });

  assert.equal(inquiry.orderType, "INQUIRY");
  assert.equal(inquiry.shippingRecipient, null);
  assert.equal(formal.orderType, "FORMAL");
  assert.equal(formal.paymentReference, "PAY-CONTRACT-1");
  assert.equal(formal.trackingNumber, "TRACK-CONTRACT-1");
  assert.equal(formal.completedAt.toISOString(), "2026-08-19T00:00:00.000Z");
});

test("CMS seed is idempotent and does not overwrite administrator edits", async () => {
  const runSeed = () =>
    execFileSync(process.execPath, [seedScript], {
      cwd: repositoryRoot,
      env: childEnvironment,
      stdio: "pipe",
    });

  runSeed();
  const firstCounts = {
    admins: await prisma.adminUser.count(),
    settings: await prisma.siteSetting.count(),
    sections: await prisma.pageSection.count(),
  };
  await prisma.siteSetting.update({
    where: { key: "support.email" },
    data: { value: "admin-edited@example.com" },
  });

  runSeed();
  const secondCounts = {
    admins: await prisma.adminUser.count(),
    settings: await prisma.siteSetting.count(),
    sections: await prisma.pageSection.count(),
  };

  assert.deepEqual(secondCounts, firstCounts);
  assert.equal(firstCounts.admins, 1);
  assert.equal(firstCounts.settings, 10);
  assert.ok(firstCounts.sections > 0);
  assert.equal(
    (await prisma.siteSetting.findUnique({ where: { key: "support.email" } })).value,
    "admin-edited@example.com",
  );
  const admin = await prisma.adminUser.findUnique({ where: { username: "contract-admin" } });
  assert.equal(await bcrypt.compare(childEnvironment.ADMIN_PASSWORD, admin.passwordHash), true);
});
