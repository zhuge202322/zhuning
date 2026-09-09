CREATE TABLE "AiProviderConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "endpoint" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "encryptedApiKey" TEXT NOT NULL DEFAULT '',
    "keyHint" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "SeoMeta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "targetType" TEXT NOT NULL,
    "targetKey" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "keywords" TEXT NOT NULL DEFAULT '',
    "canonicalUrl" TEXT NOT NULL DEFAULT '',
    "ogImage" TEXT NOT NULL DEFAULT '',
    "robots" TEXT NOT NULL DEFAULT 'index,follow',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "SeoMeta_targetType_targetKey_key" ON "SeoMeta"("targetType", "targetKey");
CREATE INDEX "SeoMeta_targetType_idx" ON "SeoMeta"("targetType");
CREATE INDEX "SeoMeta_targetKey_idx" ON "SeoMeta"("targetKey");
CREATE INDEX "SeoMeta_updatedAt_idx" ON "SeoMeta"("updatedAt");
