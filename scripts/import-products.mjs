import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sourceRoot = path.resolve(root, "..");
const uploadDir = path.join(root, "public", "uploads", "imported-products");

const prisma = new PrismaClient();
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
});

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getWorkbookPaths() {
  return fs
    .readdirSync(sourceRoot)
    .filter((name) => /\.xlsx$/i.test(name) && !name.startsWith("~$"))
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
    .map((name) => path.join(sourceRoot, name));
}

function workbookAssetPrefix(filePath) {
  return slugify(path.basename(filePath, path.extname(filePath))) || "workbook";
}

function cellText(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    if ("formula" in value) return String(value.formula || value.result || "");
    if ("text" in value) return String(value.text || "");
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text || "").join("");
    }
    if ("result" in value) return String(value.result || "");
  }
  return String(value);
}

function imageIdFromFormula(value) {
  const match = cellText(value).match(/DISPIMG\("([^"]+)"/);
  return match?.[1] || "";
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeCell(value) {
  return cellText(value).replace(/\s+/g, " ").trim();
}

async function buildImageMap(workbookPath) {
  const JSZip = (await import("jszip")).default;
  const buffer = fs.readFileSync(workbookPath);
  const zip = await JSZip.loadAsync(buffer);
  const cellXml = await zip.file("xl/cellimages.xml")?.async("string");
  const relXml = await zip.file("xl/_rels/cellimages.xml.rels")?.async("string");
  if (!cellXml || !relXml) return new Map();

  const cellData = parser.parse(cellXml);
  const relData = parser.parse(relXml);
  const relationships = new Map();
  for (const rel of asArray(relData.Relationships?.Relationship)) {
    relationships.set(rel.Id, rel.Target);
  }

  const imageZipPaths = new Map();
  for (const item of asArray(cellData.cellImages?.cellImage)) {
    const pic = item.pic;
    const imageId = pic?.nvPicPr?.cNvPr?.name;
    const relId = pic?.blipFill?.blip?.embed;
    const target = relationships.get(relId);
    if (!imageId || !target) continue;
    const zipPath = target.startsWith("xl/") ? target : `xl/${target}`;
    imageZipPaths.set(imageId, zipPath.replace(/\\/g, "/"));
  }

  fs.mkdirSync(uploadDir, { recursive: true });
  const prefix = workbookAssetPrefix(workbookPath);
  const publicMap = new Map();

  for (const [imageId, zipPath] of imageZipPaths) {
    const file = zip.file(zipPath);
    if (!file) continue;
    const ext = path.extname(zipPath) || ".png";
    const outName = `${prefix}-${imageId.toLowerCase()}${ext}`;
    const outPath = path.join(uploadDir, outName);
    if (!fs.existsSync(outPath)) {
      fs.writeFileSync(outPath, await file.async("nodebuffer"));
    }
    publicMap.set(imageId, `/uploads/imported-products/${outName}`);
  }

  return publicMap;
}

function findHeaderRow(sheet) {
  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, 8); rowNumber += 1) {
    const values = sheet.getRow(rowNumber).values.map(normalizeCell);
    if (values.includes("名称") && values.includes("店铺型号")) return rowNumber;
  }
  return 0;
}

function classifyProduct(sheetName, sourceCategory, name) {
  const source = `${sheetName} ${sourceCategory}`.toLowerCase();
  const productName = String(name || "").toLowerCase();

  if (/\bring(s)?\b/.test(source)) return "Rings";
  if (/necklace|pendant|choker|collarbone/.test(source)) return "Necklaces";
  if (/bracelet|bangle|earring|bag|handbag/.test(source)) return "";
  if (/\bring(s)?\b/.test(productName)) return "Rings";
  if (/necklace|pendant|choker|collarbone/.test(productName)) return "Necklaces";

  return "";
}

function readProducts(workbook, workbookPath) {
  const products = [];

  for (const sheet of workbook.worksheets) {
    const headerRow = findHeaderRow(sheet);
    if (!headerRow) continue;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRow) return;

      const sourceCategory = normalizeCell(row.getCell(1).value);
      const name = normalizeCell(row.getCell(2).value);
      const sku = normalizeCell(row.getCell(3).value);
      if (!name || !sku) return;

      const category = classifyProduct(sheet.name, sourceCategory, name);
      if (!category) return;

      const imageIds = [6, 7, 8]
        .map((index) => imageIdFromFormula(row.getCell(index).value))
        .filter(Boolean);

      products.push({
        category,
        sourceCategory: sourceCategory || sheet.name,
        name,
        sku,
        material: normalizeCell(row.getCell(4).value),
        price: Number(cellText(row.getCell(5).value) || 0),
        imageIds,
        weight: normalizeCell(row.getCell(9).value),
        packaging: normalizeCell(row.getCell(10).value),
        sourceWorkbook: path.basename(workbookPath),
      });
    });
  }

  return products;
}

async function ensureCategory(name, sortOrder) {
  return prisma.category.upsert({
    where: { slug: slugify(name) },
    update: { name, sortOrder },
    create: { name, slug: slugify(name), sortOrder },
  });
}

function productDescription(item) {
  return [
    `<p>${item.name}</p>`,
    `<ul>`,
    `<li>Material: ${item.material || "Jewelry alloy"}</li>`,
    `<li>SKU: ${item.sku}</li>`,
    `<li>Source category: ${item.sourceCategory || item.category}</li>`,
    `<li>Weight: ${item.weight || "15g"}</li>`,
    `<li>Packaging: ${item.packaging || "20cm*16cm*5cm"}</li>`,
    `</ul>`,
  ].join("");
}

async function upsertProduct(item, category, index, imageMap) {
  const baseSlug = slugify(`${item.name}-${item.sku}`) || slugify(item.sku);
  const images = item.imageIds.map((id) => imageMap.get(id)).filter(Boolean);

  const fallbackImages = item.category === "Rings"
    ? ["/products/zircon-anniversary-ring.png", "/products/pink-zircon-ring.png"]
    : ["/products/ruby-oval-pendant-necklace.png", "/products/pearl-layered-necklace.png"];

  const finalImages = images.length ? images : fallbackImages;
  const shortDescription = `${item.material || "Luxury jewelry"} piece with ${item.packaging || "gift-ready packaging"}.`;
  const sourceCategory = item.sourceCategory || item.category;

  await prisma.product.upsert({
    where: { slug: baseSlug },
    update: {
      name: item.name,
      shortDescription,
      description: productDescription(item),
      material: item.material,
      sourceSku: item.sku,
      sourceCategory,
      price: item.price,
      weight: item.weight,
      packaging: item.packaging,
      featured: index <= 8,
      sortOrder: index,
      categories: { set: [{ id: category.id }] },
      images: {
        deleteMany: {},
        create: finalImages.map((src, sortOrder) => ({
          src,
          alt: item.name,
          sortOrder,
        })),
      },
      skus: {
        deleteMany: {},
        create: {
          name: item.sku,
          image: finalImages[0],
          price: item.price ? `$${item.price.toFixed(2)}` : "",
          size: item.weight ? `${item.weight}g`.replace(/gg$/i, "g") : "",
          images: {
            create: finalImages.map((src, sortOrder) => ({ src, sortOrder })),
          },
        },
      },
    },
    create: {
      name: item.name,
      slug: baseSlug,
      shortDescription,
      description: productDescription(item),
      material: item.material,
      sourceSku: item.sku,
      sourceCategory,
      price: item.price,
      weight: item.weight,
      packaging: item.packaging,
      collection: category.name === "Rings" ? "Obsidian Statement" : "Liquid Pearl Lines",
      featured: index <= 8,
      sortOrder: index,
      categories: { connect: [{ id: category.id }] },
      images: {
        create: finalImages.map((src, sortOrder) => ({
          src,
          alt: item.name,
          sortOrder,
        })),
      },
      skus: {
        create: {
          name: item.sku,
          image: finalImages[0],
          price: item.price ? `$${item.price.toFixed(2)}` : "",
          size: item.weight ? `${item.weight}g`.replace(/gg$/i, "g") : "",
          images: {
            create: finalImages.map((src, sortOrder) => ({ src, sortOrder })),
          },
        },
      },
    },
  });
}

async function seedAdmin() {
  const passwordHash = await bcrypt.hash("admin123456", 10);
  await prisma.adminUser.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", passwordHash },
  });
}

async function seedCustomersAndOrders() {
  const customer = await prisma.customer.upsert({
    where: { email: "client@example.com" },
    update: {},
    create: {
      name: "Avery Stone",
      email: "client@example.com",
      phone: "+1 212 555 0188",
      notes: "Private client interested in crimson statement rings.",
    },
  });

  const products = await prisma.product.findMany({
    take: 2,
    orderBy: { sortOrder: "asc" },
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
  });
  if (!products.length) return;

  const subtotal = products.reduce((sum, product) => sum + Number(product.price || 0), 0);
  const shipping = 18;
  await prisma.order.upsert({
    where: { orderNumber: "MX-24018" },
    update: {},
    create: {
      orderNumber: "MX-24018",
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      status: "Preparing",
      paymentStatus: "Paid",
      fulfillmentStatus: "Unfulfilled",
      subtotal,
      shipping,
      total: subtotal + shipping,
      notes: "Gift packaging requested.",
      items: {
        create: products.map((product) => ({
          productId: product.id,
          productName: product.name,
          sku: product.sourceSku,
          image: product.images[0]?.src || "",
          quantity: 1,
          price: Number(product.price || 0),
        })),
      },
    },
  });

  await prisma.customer.update({
    where: { id: customer.id },
    data: { totalOrders: 1, totalSpend: subtotal + shipping },
  });
}

async function main() {
  const workbookPaths = getWorkbookPaths();
  if (!workbookPaths.length) throw new Error(`No .xlsx workbooks found in ${sourceRoot}`);

  await seedAdmin();
  const necklaceCategory = await ensureCategory("Necklaces", 1);
  const ringCategory = await ensureCategory("Rings", 2);
  const totals = { Necklaces: 0, Rings: 0 };
  let index = 1;

  for (const workbookPath of workbookPaths) {
    const imageMap = await buildImageMap(workbookPath);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(workbookPath);
    const products = readProducts(workbook, workbookPath);

    for (const item of products) {
      const category = item.category === "Rings" ? ringCategory : necklaceCategory;
      await upsertProduct(item, category, index, imageMap);
      totals[item.category] += 1;
      index += 1;
    }
  }

  await seedCustomersAndOrders();

  console.log(`Imported ${totals.Necklaces} necklaces and ${totals.Rings} rings from ${workbookPaths.length} workbook(s).`);
  console.log("Admin login: admin / admin123456");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
