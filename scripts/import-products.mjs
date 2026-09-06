import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";
import sharp from "sharp";
import {
  buildCategoryPlan,
  deduplicateProductRows,
  importProductSlug,
  isCompleteProductRow,
  normalizeProductRow,
  slugifyImportValue,
} from "../src/lib/product-import-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const defaultSourceRoot = path.join(root, "..", "独立站上品");
const sourceRoot = path.resolve(
  process.env.IMPORT_SOURCE_DIR || (fs.existsSync(defaultSourceRoot) ? defaultSourceRoot : path.join(root, "..")),
);
const uploadDir = path.join(root, "public", "uploads", "imported-products");
const prisma = new PrismaClient();
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", removeNSPrefix: true });

const ROOT_NAME_ALIASES = {
  Ring: "Rings",
  Necklace: "Necklaces",
  "Jewelry sets": "Jewelry Sets",
  Bags: "Women's Bags",
  "Women’s Apparel": "Women's Apparel",
};

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function cellText(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("");
    if ("formula" in value) return String(value.formula || value.result || "");
    if ("text" in value) return String(value.text || "");
    if ("result" in value) return String(value.result || "");
  }
  return String(value);
}

function normalizeCell(value) {
  return cellText(value).replace(/\s+/g, " ").trim();
}

function cleanRootName(value) {
  const withoutCount = normalizeCell(value).replace(/[（(]\d+[）)]$/, "");
  return ROOT_NAME_ALIASES[withoutCount] || withoutCount;
}

function sourceRootName(workbookPath) {
  const relative = path.relative(sourceRoot, workbookPath);
  const segments = relative.split(path.sep);
  return cleanRootName(segments.length > 1 ? segments[0] : path.basename(workbookPath, path.extname(workbookPath)));
}

function getWorkbookPaths() {
  const results = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith("~$")) continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (/\.xlsx$/i.test(entry.name)) results.push(fullPath);
    }
  };
  if (!fs.existsSync(sourceRoot)) throw new Error(`导入源目录不存在: ${sourceRoot}`);
  visit(sourceRoot);
  return results.sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

function workbookAssetPrefix(filePath) {
  return slugifyImportValue(path.relative(sourceRoot, filePath).replace(/[\\/]/g, "-")).slice(0, 60) || "workbook";
}

function imageIdFromFormula(value) {
  return cellText(value).match(/DISPIMG\("([^"]+)"/i)?.[1] || "";
}

function headerKey(value) {
  return normalizeCell(value).toLowerCase().replace(/[\s_-]+/g, "");
}

function findHeaderMap(sheet) {
  const aliases = {
    sourceCategory: new Set(["类别", "category", "collection"]),
    name: new Set(["名称", "name", "productname"]),
    sku: new Set(["店铺型号", "sku", "货号", "model"]),
    material: new Set(["材料", "material"]),
    price: new Set(["价格", "price"]),
    packaging: new Set(["包装规格", "packaging", "packagespecification"]),
    moq: new Set(["moq", "起订量"]),
  };
  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, 10); rowNumber += 1) {
    const headers = sheet.getRow(rowNumber).values.map(headerKey);
    if (![...aliases.name].some((key) => headers.includes(key)) || ![...aliases.sku].some((key) => headers.includes(key))) continue;
    const find = (keys) => headers.findIndex((header) => keys.has(header));
    const imageColumns = headers
      .map((header, index) => ({ header, index }))
      .filter(({ header }) => /图|image|photo/.test(header))
      .map(({ index }) => index);
    return {
      rowNumber,
      sourceCategory: find(aliases.sourceCategory),
      name: find(aliases.name),
      sku: find(aliases.sku),
      material: find(aliases.material),
      price: find(aliases.price),
      packaging: find(aliases.packaging),
      moq: find(aliases.moq),
      imageColumns,
    };
  }
  return null;
}

async function buildImageMap(workbookPath) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(fs.readFileSync(workbookPath));
  const cellXml = await zip.file("xl/cellimages.xml")?.async("string");
  const relXml = await zip.file("xl/_rels/cellimages.xml.rels")?.async("string");
  if (!cellXml || !relXml) return new Map();

  const cellData = parser.parse(cellXml);
  const relData = parser.parse(relXml);
  const relationships = new Map(asArray(relData.Relationships?.Relationship).map((rel) => [rel.Id, rel.Target]));
  const imageZipPaths = new Map();

  for (const item of asArray(cellData.cellImages?.cellImage)) {
    const pic = item.pic;
    const imageId = pic?.nvPicPr?.cNvPr?.name;
    const target = relationships.get(pic?.blipFill?.blip?.embed);
    if (!imageId || !target) continue;
    imageZipPaths.set(imageId, (target.startsWith("xl/") ? target : `xl/${target}`).replace(/\\/g, "/"));
  }

  fs.mkdirSync(uploadDir, { recursive: true });
  const prefix = workbookAssetPrefix(workbookPath);
  const publicMap = new Map();
  for (const [imageId, zipPath] of imageZipPaths) {
    const file = zip.file(zipPath);
    if (!file) continue;
    const outName = `${prefix}-${imageId.toLowerCase()}.webp`;
    const outPath = path.join(uploadDir, outName);
    if (!fs.existsSync(outPath)) {
      try {
        const buffer = await sharp(await file.async("nodebuffer")).rotate().webp({ quality: 82, effort: 4 }).toBuffer();
        fs.writeFileSync(outPath, buffer);
      } catch (error) {
        console.warn(`图片转换失败，跳过 ${imageId}: ${error.message}`);
        continue;
      }
    }
    publicMap.set(imageId, `/uploads/imported-products/${outName}`);
  }
  return publicMap;
}

function readProducts(workbook, workbookPath) {
  const products = [];
  const rootCategory = sourceRootName(workbookPath);
  for (const sheet of workbook.worksheets) {
    const headers = findHeaderMap(sheet);
    if (!headers) continue;
    for (let rowNumber = headers.rowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const raw = {
        rootCategory,
        sourceCategory: headers.sourceCategory >= 0 ? row.getCell(headers.sourceCategory).value : rootCategory,
        name: row.getCell(headers.name).value,
        sku: row.getCell(headers.sku).value,
        material: headers.material >= 0 ? row.getCell(headers.material).value : "",
        price: headers.price >= 0 ? row.getCell(headers.price).value : "",
        weight: "",
        packaging: headers.packaging >= 0 ? row.getCell(headers.packaging).value : "",
        moq: headers.moq >= 0 ? row.getCell(headers.moq).value : "",
      };
      if (!isCompleteProductRow(raw)) continue;
      const product = normalizeProductRow(raw);
      product.imageIds = headers.imageColumns.map((index) => imageIdFromFormula(row.getCell(index).value)).filter(Boolean);
      product.moq = normalizeCell(raw.moq);
      product.sourceWorkbook = path.relative(sourceRoot, workbookPath);
      product.sourceRow = rowNumber;
      products.push(product);
    }
  }
  return products;
}

async function ensureCategory(planItem, parentId = null) {
  const existing = await prisma.category.findUnique({ where: { slug: planItem.slug } });
  if (existing) return prisma.category.update({ where: { id: existing.id }, data: { name: planItem.name, parentId, sortOrder: planItem.sortOrder } });
  return prisma.category.create({ data: { name: planItem.name, slug: planItem.slug, parentId, sortOrder: planItem.sortOrder } });
}

function productDescription(item) {
  return [
    `<p>${item.name}</p>`,
    `<ul>`,
    `<li>Material: ${item.material || "Confirmed per quotation"}</li>`,
    `<li>SKU: ${item.sku}</li>`,
    `<li>Source category: ${item.sourceCategory || item.rootCategory}</li>`,
    `<li>Packaging: ${item.packaging || "Confirmed with quotation"}</li>`,
    `<li>MOQ: ${item.moq || "Confirmed with quotation"}</li>`,
    `</ul>`,
  ].join("");
}

function uniqueSlug(item) {
  return importProductSlug(item);
}

async function upsertProduct(item, category, index, imageMap) {
  const images = item.imageIds.map((id) => imageMap.get(id)).filter(Boolean);
  const finalImages = images.length ? images : ["/products/zircon-anniversary-ring.png"];
  const scalarData = {
    name: item.name,
    shortDescription: `${item.material || "Premium product"} piece. Details are confirmed for each SKU.`,
    description: productDescription(item),
    material: item.material,
    sourceSku: item.sku,
    sourceCategory: item.sourceCategory || item.rootCategory,
    price: item.price,
    weight: item.weight,
    packaging: item.packaging,
    collection: category.name,
    featured: false,
    sortOrder: index,
  };
  const imageCreates = finalImages.map((src, sortOrder) => ({ src, alt: item.name, sortOrder }));
  const skuCreate = {
    name: item.sku,
    image: finalImages[0],
    price: item.price ? `$${item.price.toFixed(2)}` : "",
    size: item.weight,
    images: { create: finalImages.map((src, sortOrder) => ({ src, sortOrder })) },
  };
  const slug = uniqueSlug(item);
  const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (existing) {
    return prisma.product.update({
      where: { id: existing.id },
      data: {
        ...scalarData,
        categories: { set: [{ id: category.id }] },
        images: { deleteMany: {}, create: imageCreates },
        skus: { deleteMany: {}, create: skuCreate },
      },
    }).then((product) => ({ status: "updated", id: product.id }));
  }
  const product = await prisma.product.create({
    data: {
      ...scalarData,
      slug,
      categories: { connect: [{ id: category.id }] },
      images: { create: imageCreates },
      skus: { create: skuCreate },
    },
  });
  return { status: "created", id: product.id };
}

async function main() {
  const workbookPaths = getWorkbookPaths();
  if (!workbookPaths.length) throw new Error(`没有找到 Excel 文件: ${sourceRoot}`);
  const allProducts = [];
  const imageMaps = new Map();
  for (const workbookPath of workbookPaths) {
    const imageMap = await buildImageMap(workbookPath);
    imageMaps.set(workbookPath, imageMap);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(workbookPath);
    allProducts.push(...readProducts(workbook, workbookPath).map((product) => ({ ...product, workbookPath })));
  }

  const deduped = deduplicateProductRows(allProducts);
  const categoryPlan = buildCategoryPlan(deduped.rows);
  const categories = new Map();
  for (const item of categoryPlan.filter((entry) => entry.parentName === null)) categories.set(item.name, await ensureCategory(item));
  for (const item of categoryPlan.filter((entry) => entry.parentName !== null)) {
    const parent = categories.get(item.parentName);
    if (!parent) throw new Error(`找不到父分类: ${item.parentName}`);
    categories.set(`${item.parentName}\0${item.name}`, await ensureCategory(item, parent.id));
  }

  const imported = [];
  let createdProducts = 0;
  let skippedExistingProducts = 0;
  for (const [index, item] of deduped.rows.entries()) {
    const categoryKey = item.sourceCategory === item.rootCategory || !item.sourceCategory ? item.rootCategory : `${item.rootCategory}\0${item.sourceCategory}`;
    const category = categories.get(categoryKey) || categories.get(item.rootCategory);
    if (!category) throw new Error(`找不到产品分类: ${categoryKey}`);
    const result = await upsertProduct(item, category, index + 1, imageMaps.get(item.workbookPath));
    if (result.status === "created") createdProducts += 1;
    else if (result.status === "updated") skippedExistingProducts += 1;
    imported.push(item);
  }

  const productsByRoot = imported.reduce((result, item) => ({ ...result, [item.rootCategory]: (result[item.rootCategory] || 0) + 1 }), {});
  console.log(JSON.stringify({ sourceRoot, workbooks: workbookPaths.length, sourceRows: allProducts.length, uniqueProducts: deduped.rows.length, duplicateRowsSkipped: deduped.duplicates, createdProducts, skippedExistingProducts, categories: categoryPlan, productsByRoot, mediaDirectory: uploadDir }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
