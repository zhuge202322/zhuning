import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const root = process.cwd();
const imageRoot = path.join(root, "public", "uploads", "imported-products");
const publicPrefix = "/uploads/imported-products/";

function toPublicPath(fileName) {
  return `${publicPrefix}${fileName}`;
}

function toFilePath(publicPath) {
  return path.join(root, "public", publicPath.replace(/^\//, ""));
}

function toWebpPath(publicPath) {
  return publicPath.replace(/\.[^.]+$/i, ".webp");
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectImageRefs() {
  const productImages = await prisma.productImage.findMany({ select: { id: true, src: true } });
  const skuImages = await prisma.productSkuImage.findMany({ select: { id: true, src: true } });
  const skus = await prisma.productSku.findMany({ select: { id: true, image: true } });

  const refs = new Set();
  for (const row of productImages) if (row.src?.startsWith(publicPrefix)) refs.add(row.src);
  for (const row of skuImages) if (row.src?.startsWith(publicPrefix)) refs.add(row.src);
  for (const row of skus) if (row.image?.startsWith(publicPrefix)) refs.add(row.image);

  return { refs, productImages, skuImages, skus };
}

async function optimizeReferencedImages(refs) {
  const updates = new Map();
  let converted = 0;
  let skipped = 0;

  for (const src of refs) {
    const currentFile = toFilePath(src);
    if (!(await pathExists(currentFile))) {
      console.warn(`Missing image skipped: ${src}`);
      skipped += 1;
      continue;
    }

    const webpSrc = toWebpPath(src);
    const webpFile = toFilePath(webpSrc);

    if (!src.endsWith(".webp")) {
      await sharp(currentFile).rotate().webp({ quality: 82, effort: 5 }).toFile(webpFile);
      updates.set(src, webpSrc);
      converted += 1;
    } else {
      skipped += 1;
    }
  }

  return { updates, converted, skipped };
}

async function updateDatabasePaths({ updates, productImages, skuImages, skus }) {
  let changedRows = 0;
  for (const row of productImages) {
    const next = updates.get(row.src);
    if (next) {
      await prisma.productImage.update({ where: { id: row.id }, data: { src: next } });
      changedRows += 1;
    }
  }
  for (const row of skuImages) {
    const next = updates.get(row.src);
    if (next) {
      await prisma.productSkuImage.update({ where: { id: row.id }, data: { src: next } });
      changedRows += 1;
    }
  }
  for (const row of skus) {
    const next = updates.get(row.image);
    if (next) {
      await prisma.productSku.update({ where: { id: row.id }, data: { image: next } });
      changedRows += 1;
    }
  }
  return changedRows;
}

async function removeUnreferencedFiles(activeRefs) {
  const files = await fs.readdir(imageRoot);
  let removed = 0;

  for (const fileName of files) {
    const filePath = path.join(imageRoot, fileName);
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) continue;

    const publicPath = toPublicPath(fileName);
    if (!activeRefs.has(publicPath)) {
      await fs.unlink(filePath);
      removed += 1;
    }
  }

  return removed;
}

async function directorySize() {
  const files = await fs.readdir(imageRoot);
  let bytes = 0;
  let count = 0;
  for (const fileName of files) {
    const stat = await fs.stat(path.join(imageRoot, fileName));
    if (!stat.isFile()) continue;
    bytes += stat.size;
    count += 1;
  }
  return { count, mb: Math.round((bytes / 1024 / 1024) * 10) / 10 };
}

async function main() {
  const before = await directorySize();
  const refsData = await collectImageRefs();
  const optimized = await optimizeReferencedImages(refsData.refs);
  const changedRows = await updateDatabasePaths({ ...refsData, updates: optimized.updates });

  const activeRefs = new Set([...refsData.refs].map((src) => optimized.updates.get(src) || src));
  const removed = await removeUnreferencedFiles(activeRefs);
  const after = await directorySize();

  console.log(
    JSON.stringify(
      {
        before,
        after,
        converted: optimized.converted,
        skipped: optimized.skipped,
        databaseRowsUpdated: changedRows,
        removedFiles: removed,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
