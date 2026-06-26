import { PrismaClient } from '@prisma/client';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function resolveDatabaseUrl() {
  const configuredUrl = process.env.DATABASE_URL;
  if (process.env.VERCEL && configuredUrl?.startsWith('file:')) {
    const tmpDir = '/tmp/zhuning-prisma';
    const tmpDb = path.join(tmpDir, 'dev.db');
    const sourceDb = path.join(process.cwd(), 'prisma', 'dev.db');

    mkdirSync(tmpDir, { recursive: true });
    if (!existsSync(tmpDb) && existsSync(sourceDb)) {
      copyFileSync(sourceDb, tmpDb);
    }

    return `file:${tmpDb}`;
  }

  return configuredUrl;
}

const databaseUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: databaseUrl
      ? {
          db: {
            url: databaseUrl,
          },
        }
      : undefined,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
