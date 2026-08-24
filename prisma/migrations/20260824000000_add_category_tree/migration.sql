PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" INTEGER,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "nameFr" TEXT NOT NULL DEFAULT '',
    "nameEs" TEXT NOT NULL DEFAULT '',
    "nameAr" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TRIGGER "category_tree_legacy_conflict_guard"
BEFORE INSERT ON "new_Category"
WHEN EXISTS (
    SELECT 1
    FROM "_ProductCategories"
    GROUP BY "B"
    HAVING COUNT(DISTINCT "A") > 1
)
BEGIN
    SELECT RAISE(ABORT, 'legacy product has categories from multiple top-level roots; repair assignments before migration');
END;

INSERT INTO "new_Category" ("id", "name", "slug", "imageUrl", "sortOrder", "nameFr", "nameEs", "nameAr", "createdAt", "updatedAt")
SELECT "id", "name", "slug", "imageUrl", "sortOrder", "nameFr", "nameEs", "nameAr", "createdAt", "updatedAt" FROM "Category";

DROP TRIGGER "category_tree_legacy_conflict_guard";

DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";

CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
