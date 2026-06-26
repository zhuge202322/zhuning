import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SiteMedia" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "key" TEXT NOT NULL UNIQUE,
      "url" TEXT NOT NULL DEFAULT '',
      "label" TEXT NOT NULL DEFAULT '',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PageView" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "visitorId" TEXT NOT NULL DEFAULT '',
      "path" TEXT NOT NULL,
      "source" TEXT NOT NULL DEFAULT 'direct',
      "referrer" TEXT NOT NULL DEFAULT '',
      "device" TEXT NOT NULL DEFAULT '',
      "utmSource" TEXT NOT NULL DEFAULT '',
      "utmMedium" TEXT NOT NULL DEFAULT '',
      "utmCampaign" TEXT NOT NULL DEFAULT '',
      "isBot" BOOLEAN NOT NULL DEFAULT false,
      "ipHash" TEXT NOT NULL DEFAULT '',
      "userAgent" TEXT NOT NULL DEFAULT '',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const rows = await prisma.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('SiteMedia', 'PageView') ORDER BY name;`,
  );
  console.log(rows);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
