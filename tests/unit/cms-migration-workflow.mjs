import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const prismaCli = path.join(repositoryRoot, "node_modules", "prisma", "build", "index.js");
const schemaPath = path.join(repositoryRoot, "prisma", "schema.prisma");
const baselineId = "20260818000000_legacy_baseline";
const baselineSqlPath = path.join(repositoryRoot, "prisma", "migrations", baselineId, "migration.sql");
const temporaryRoot = path.join(repositoryRoot, "tests", "unit", ".tmp");
mkdirSync(temporaryRoot, { recursive: true });
const temporaryDirectory = mkdtempSync(path.join(temporaryRoot, "cms-migrations-"));

function databaseUrl(databasePath) {
  return `file:${databasePath.replaceAll("\\", "/")}`;
}

function runPrisma(args, databasePath) {
  return execFileSync(process.execPath, [prismaCli, ...args], {
    cwd: repositoryRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl(databasePath) },
    encoding: "utf8",
  });
}

function createEmptyDatabase(databasePath) {
  new DatabaseSync(databasePath).close();
}

after(() => {
  rmSync(temporaryDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

test("migrate deploy builds the complete CMS schema from zero", () => {
  const databasePath = path.join(temporaryDirectory, "fresh.db");
  createEmptyDatabase(databasePath);

  runPrisma(["migrate", "deploy", "--schema", schemaPath], databasePath);

  const database = new DatabaseSync(databasePath);
  const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
  const mediaStatus = database.prepare("SELECT name, \"notnull\", dflt_value FROM pragma_table_info('MediaAsset') WHERE name = ?").get("status");
  const mediaStatusIndex = database.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'MediaAsset_status_idx'").get();
  database.close();
  for (const table of ["Product", "Category", "Customer", "Order", "SiteSetting", "PageSection", "MediaAsset"]) {
    assert.ok(tables.includes(table), `missing ${table}`);
  }
  assert.deepEqual({ ...mediaStatus }, { name: "status", notnull: 1, dflt_value: "'ACTIVE'" });
  assert.ok(mediaStatusIndex);
});

test("legacy database can be baselined then upgraded without catalog loss", () => {
  const baselineSql = readFileSync(baselineSqlPath, "utf8");
  assert.ok(baselineSql.includes('CREATE TABLE "Product"'));
  assert.match(baselineSql, /"key" TEXT NOT NULL UNIQUE/);
  assert.match(baselineSql, /"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP/);
  assert.doesNotMatch(baselineSql, /SiteMedia_key_key/);
  const sourcePath = path.join(temporaryDirectory, "legacy-source.db");
  const databasePath = path.join(temporaryDirectory, "legacy-copy.db");
  createEmptyDatabase(sourcePath);
  const source = new DatabaseSync(sourcePath);
  source.exec(readFileSync(baselineSqlPath, "utf8"));
  const siteMediaTable = source.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'SiteMedia'").get().sql;
  const siteMediaIndexes = source.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'SiteMedia'").all();
  assert.match(siteMediaTable, /"key" TEXT NOT NULL UNIQUE/);
  assert.match(siteMediaTable, /"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP/);
  assert.deepEqual(siteMediaIndexes.map((index) => ({ ...index })), [{ name: "sqlite_autoindex_SiteMedia_1", sql: null }]);
  source.exec(`
    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt")
    VALUES ('Legacy Necklaces', 'legacy-necklaces', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    INSERT INTO "Product" ("name", "slug", "createdAt", "updatedAt")
    VALUES ('Legacy Necklace', 'legacy-necklace', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    INSERT INTO "_ProductCategories" ("A", "B") VALUES (1, 1);
  `);
  source.close();
  copyFileSync(sourcePath, databasePath);

  // Existing pre-migration databases must run this once before `prisma migrate deploy`.
  runPrisma(["migrate", "resolve", "--applied", baselineId, "--schema", schemaPath], databasePath);
  runPrisma(["migrate", "deploy", "--schema", schemaPath], databasePath);

  const database = new DatabaseSync(databasePath);
  const productCount = database.prepare('SELECT COUNT(*) AS count FROM "Product"').get().count;
  const categoryCount = database.prepare('SELECT COUNT(*) AS count FROM "Category"').get().count;
  const relationCount = database.prepare('SELECT COUNT(*) AS count FROM "_ProductCategories"').get().count;
  const orderTypeColumn = database.prepare("SELECT name, \"notnull\", dflt_value FROM pragma_table_info('Order') WHERE name = ?").get("orderType");
  const foreignKeyErrors = database.prepare('SELECT COUNT(*) AS count FROM pragma_foreign_key_check').get().count;
  const pageSection = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'PageSection'").get();
  const mediaStatus = database.prepare("SELECT dflt_value FROM pragma_table_info('MediaAsset') WHERE name = 'status'").get();
  database.close();

  assert.equal(productCount, 1);
  assert.equal(categoryCount, 1);
  assert.equal(relationCount, 1);
  assert.deepEqual({ ...orderTypeColumn }, { name: "orderType", notnull: 1, dflt_value: "'INQUIRY'" });
  assert.equal(foreignKeyErrors, 0);
  assert.ok(pageSection);
  assert.equal(mediaStatus.dflt_value, "'ACTIVE'");
});

test("legacy upgrade stops when a product has multiple top-level categories", () => {
  const databasePath = path.join(temporaryDirectory, "legacy-conflict.db");
  createEmptyDatabase(databasePath);
  const database = new DatabaseSync(databasePath);
  database.exec(readFileSync(baselineSqlPath, "utf8"));
  database.exec(`
    INSERT INTO "Category" ("name", "slug", "createdAt", "updatedAt") VALUES
      ('Rings', 'rings', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Necklaces', 'necklaces', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    INSERT INTO "Product" ("name", "slug", "createdAt", "updatedAt")
      VALUES ('Legacy Product', 'legacy-product', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    INSERT INTO "_ProductCategories" ("A", "B") VALUES (1, 1), (2, 1);
  `);
  database.close();

  runPrisma(["migrate", "resolve", "--applied", baselineId, "--schema", schemaPath], databasePath);
  assert.throws(
    () => runPrisma(["migrate", "deploy", "--schema", schemaPath], databasePath),
    /migration failed|constraint failed|CHECK constraint/i,
  );
});
