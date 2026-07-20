import fs from "fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function stripHtml(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function categoryOf(product) {
  const assigned = product.categories?.[0]?.name;
  if (["Necklaces", "Rings", "Jewelry Sets", "Women's Bags"].includes(assigned)) return assigned;
  const value = [product.sourceCategory, product.name].filter(Boolean).join(" ");
  if (/handbag|women'?s bag|\bbag\b/i.test(value)) return "Women's Bags";
  if (/jewel(?:ry|lery) sets?|necklaces? for women set|\bsets?\b/i.test(value)) return "Jewelry Sets";
  if (/ring/i.test(value)) return "Rings";
  return "Necklaces";
}

async function main() {
  const products = await prisma.product.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      categories: true,
      skus: true,
    },
  });

  const output = products.map((product) => {
    const category = categoryOf(product);
    const images = product.images.length
      ? product.images.map((image) => image.src)
      : [category === "Rings" ? "/products/zircon-anniversary-ring.png" : "/products/ruby-oval-pendant-necklace.png"];
    const price = Number(product.price || 0);

    const sku = product.sourceSku || product.skus?.[0]?.name || `MX-${product.id}`;
    const sourceNote = stripHtml(product.shortDescription || product.description);
    const note = /piece with .*cm/i.test(sourceNote)
      ? `${product.material || "Product"} item listed under source SKU ${sku}.`
      : sourceNote || `${product.material || "Product"} item listed under source SKU ${sku}.`;

    return {
      id: product.slug,
      dbId: product.id,
      category,
      name: product.name,
      sku,
      material: product.material || "Jewelry alloy",
      price: price > 0 ? Math.round(price * 100) / 100 : 0,
      image: images[0],
      images,
      weight: product.weight ? `${product.weight}g`.replace(/gg$/i, "g") : "",
      packaging: product.packaging || "Confirmed with quotation",
      note,
      finish: product.material || "Finish confirmed by SKU",
      stones: product.stones || "Confirmed by SKU",
      collection: product.collection || category,
    };
  });

  await fs.writeFile("src/data/storefront-products.json", `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Exported ${output.length} storefront fallback products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
