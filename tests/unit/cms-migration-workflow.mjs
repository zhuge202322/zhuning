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
  database.close();
  for (const table of ["Product", "Category", "Customer", "Order", "SiteSetting", "PageSection", "MediaAsset"]) {
    assert.ok(tables.includes(table), `missing ${table}`);
  }
});

test("legacy database can be baselined then upgraded without catalog loss", () => {
  assert.ok(readFileSync(baselineSqlPath, "utf8").includes('CREATE TABLE "Product"'));
  const sourcePath = path.join(temporaryDirectory, "legacy-source.db");
  const databasePath = path.join(temporaryDirectory, "legacy-copy.db");
  createEmptyDatabase(sourcePath);
  const source = new DatabaseSync(sourcePath);
  source.exec(readFileSync(baselineSqlPath, "utf8"));
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
  database.close();

  assert.equal(productCount, 1);
  assert.equal(categoryCount, 1);
  assert.equal(relationCount, 1);
  assert.deepEqual({ ...orderTypeColumn }, { name: "orderType", notnull: 1, dflt_value: "'INQUIRY'" });
  assert.equal(foreignKeyErrors, 0);
  assert.ok(pageSection);
});
