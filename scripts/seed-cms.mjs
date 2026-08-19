import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

process.env.DATABASE_URL ||= "file:./dev.db";

const prisma = new PrismaClient();

const settings = [
  { key: "site.name", value: "Muxcor", type: "text", group: "brand" },
  { key: "site.logo", value: "/company/muxcor-logo.png", type: "image", group: "brand" },
  { key: "support.email", value: "Crescent@muxcor.com", type: "email", group: "support" },
  { key: "support.phone", value: "", type: "text", group: "support" },
  { key: "support.whatsapp", value: "+86 134 1613 4933", type: "text", group: "support" },
  {
    key: "company.address",
    value: "No. 179 Yingbin Road, Guangzhou City, Guangdong Province, China.",
    type: "textarea",
    group: "company",
  },
  {
    key: "social.instagram",
    value: "https://www.instagram.com/muxcoraccs?igsh=OXR3eHdwbDg1aGNw",
    type: "url",
    group: "social",
  },
  { key: "social.facebook", value: "https://www.facebook.com/share/1SfdmkP2Q2/", type: "url", group: "social" },
  { key: "social.tiktok", value: "", type: "url", group: "social" },
  { key: "social.youtube", value: "", type: "url", group: "social" },
];

const sections = [
  section("home", "hero", 0, {
    eyebrow: "Product development",
    title: "From custom design to stable supply.",
    body: "Review design direction, craftsmanship, and supply requirements with the Muxcor team before quotation.",
    buttonLabel: "Browse products",
    buttonHref: "/products",
    mediaUrl: "/company/manufacturing-capabilities.webp",
    mediaAlt: "Premium jewelry manufacturer promotional poster",
  }),
  section("home", "categories", 10, { eyebrow: "Product categories", title: "A clear product framework for faster sourcing." }),
  section("home", "company", 20, { eyebrow: "Inside Muxcor", title: "A real Guangzhou team behind every product discussion.", mediaUrl: "/company/showroom-display.webp", mediaAlt: "Muxcor jewelry showroom display" }),
  section("home", "customization", 30, { eyebrow: "Custom jewelry", title: "See how a design moves toward production.", buttonLabel: "Explore the full process", buttonHref: "/customization" }),
  section("home", "certifications", 40, { eyebrow: "Documented capabilities", title: "Authentic certificates and representative test reports.", buttonLabel: "Open document library", buttonHref: "/certifications" }),
  section("home", "inquiry", 50, { title: "Build a product inquiry", buttonLabel: "Choose products", buttonHref: "/products" }),

  section("about", "hero", 0, { eyebrow: "Our company", title: "Guangzhou Muxcor International Co., Ltd.", body: "A Guangzhou fashion jewelry manufacturer supporting catalogue supply, mixed wholesale, OEM and ODM development, sample review, production coordination, and delivery follow-up.", mediaUrl: "/company/jewelry-studio.webp", mediaAlt: "Muxcor jewelry studio in Guangzhou" }),
  section("about", "story", 10, { eyebrow: "Built in Guangzhou", title: "From product idea to repeatable supply." }),
  section("about", "history", 20, { eyebrow: "Company history", title: "A long-term production partner, built step by step." }),
  section("about", "capabilities", 30, { eyebrow: "Working scope", title: "Capabilities around the product, not just the item." }),
  section("about", "gallery", 40, { eyebrow: "Inside Muxcor", title: "Showroom, product displays, and working areas." }),
  section("about", "contact", 50, { eyebrow: "Contact Muxcor", title: "Discuss your market, products, and sourcing plan." }),

  section("customization", "hero", 0, { eyebrow: "OEM and ODM jewelry", title: "Turn a product direction into a production-ready piece.", mediaUrl: "/company/customization-process.webp", mediaAlt: "Muxcor customization process from design to finished jewelry" }),
  section("customization", "brief", 10, { eyebrow: "Start with a clear brief", title: "What helps the team quote and develop your design." }),
  section("customization", "process", 20, { eyebrow: "Development workflow", title: "Five stages from requirement to delivery." }),
  section("customization", "reference", 30, { eyebrow: "Customization reference", title: "Options, materials, and development support at a glance." }),
  section("customization", "assurance", 40, { eyebrow: "Before production", title: "Approve the details that matter." }),
  section("customization", "contact", 50, { title: "Bring a sketch, reference, or product direction." }),

  section("certifications", "hero", 0, { eyebrow: "Documents and compliance", title: "Evidence for company review and product discussions.", mediaUrl: "/company/detail-panels/13-certificate-collection-hd.webp" }),
  section("certifications", "evidence", 10, { eyebrow: "Company and production evidence", title: "Documents supported by a visible production operation." }),
  section("certifications", "library", 20, { eyebrow: "Document library", title: "Certificates and representative reports." }),
  section("certifications", "contact", 30, { title: "Confirm documentation for the product and market." }),

  section("after-sales", "hero", 0, { eyebrow: "After-sales service", title: "A clear review path after product delivery.", body: "After-sales decisions are based on the confirmed SKU, quotation, product specification, and shipping records." }),
  section("after-sales", "product-review", 10, { title: "Product issue review" }),
  section("after-sales", "production", 20, { title: "Production and quantity differences" }),
  section("after-sales", "shipping", 30, { title: "Packing and shipment support" }),
  section("after-sales", "resolution", 40, { title: "Resolution process" }),
  section("after-sales", "evidence", 50, { eyebrow: "Customer feedback", title: "Recent review highlights from verified purchases." }),

  section("privacy", "hero", 0, { eyebrow: "Privacy policy", title: "Private client information deserves careful handling." }),
  section("privacy", "information", 10, { title: "Information we collect" }),
  section("privacy", "usage", 20, { title: "How data is used" }),
  section("privacy", "protection", 30, { title: "Data protection" }),
  section("privacy", "choices", 40, { title: "Customer choices" }),

  section("returns", "hero", 0, { eyebrow: "Returns and exchanges", title: "Clear commitments for jewelry care after purchase." }),
  section("returns", "window", 10, { title: "Return window" }),
  section("returns", "exchanges", 20, { title: "Exchange support" }),
  section("returns", "exclusions", 30, { title: "Non-returnable pieces" }),
  section("returns", "refunds", 40, { title: "Refund processing" }),

  section("product-detail", "summary", 0, { sectionType: "product-summary" }),
  section("product-detail", "care", 10, { title: "Care and assurance" }),
  section("product-detail", "editorial", 20, { eyebrow: "Product and production reference", title: "Review the details behind the piece." }),
  section("product-detail", "related", 30, { eyebrow: "You may also like", title: "Pieces in the same mood" }),
];

function section(pageKey, sectionKey, sortOrder, values = {}) {
  return { pageKey, sectionKey, sortOrder, ...values };
}

async function seedAdmin() {
  const adminCount = await prisma.adminUser.count();
  if (adminCount > 1) throw new Error("Expected at most one administrator; refusing to seed.");
  if (adminCount === 1) return;

  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!username) throw new Error("ADMIN_USERNAME is required when creating the first administrator.");
  if (!password || password.length < 12) {
    throw new Error("ADMIN_PASSWORD must contain at least 12 characters when creating the first administrator.");
  }

  await prisma.adminUser.create({
    data: { username, passwordHash: await bcrypt.hash(password, 12) },
  });
}

async function main() {
  await seedAdmin();
  await prisma.$transaction([
    ...settings.map((setting) => prisma.siteSetting.upsert({ where: { key: setting.key }, update: {}, create: setting })),
    ...sections.map((item) => prisma.pageSection.upsert({
      where: { pageKey_sectionKey: { pageKey: item.pageKey, sectionKey: item.sectionKey } },
      update: {},
      create: item,
    })),
  ]);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
