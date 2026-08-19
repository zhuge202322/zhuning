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
    eyebrow: "Crimson Drop Luxury",
    title: "Jewelry categories, sourced with clarity.",
    body: "Browse the supplied catalogue for necklaces, rings, and coordinated jewelry sets, with original SKU titles and prices.",
    buttonLabel: "Browse products",
    buttonHref: "/products",
    mediaUrl: "/products/ruby-oval-pendant-necklace.png",
    mediaAlt: "Ruby oval pendant necklace on a crimson luxury background",
    dataJson: JSON.stringify({
      imageMode: "cover",
      slides: [
        {
          image: "/products/ruby-oval-pendant-necklace.png",
          alt: "Ruby oval pendant necklace on a crimson luxury background",
          kicker: "Crimson Drop Luxury",
          title: "Jewelry categories, sourced with clarity.",
          copy: "Browse the supplied catalogue for necklaces, rings, and coordinated jewelry sets, with original SKU titles and prices.",
          imageMode: "cover",
        },
        {
          image: "/company/manufacturing-capabilities.webp",
          alt: "Premium jewelry manufacturer promotional poster",
          kicker: "Product development",
          title: "From custom design to stable supply.",
          copy: "Review design direction, craftsmanship, and supply requirements with the Muxcor team before quotation.",
          imageMode: "poster",
        },
        {
          image: "/company/jewelry-studio.webp",
          alt: "Muxcor jewelry workshop in Guangzhou",
          kicker: "Company workshop",
          title: "See the real team behind the catalogue.",
          copy: "Our Guangzhou workspace supports product review, sample discussion, and jewelry production coordination.",
          imageMode: "cover",
        },
      ],
    }),
  }),
  section("home", "proof", 10, { dataJson: JSON.stringify({ stats: [{ value: "2007", label: "Company founded" }, { value: "2,000 m2", label: "Approx. factory area" }, { value: "200", label: "Skilled production workers" }, { value: "800,000", label: "Approx. pieces per month" }] }) }),
  section("home", "categories", 20, { eyebrow: "Product categories", title: "A clear product framework for faster sourcing." }),
  section("home", "catalogue", 30, { eyebrow: "Current catalogue", title: "Featured products from the supplied files", buttonLabel: "View all products", buttonHref: "/products" }),
  section("home", "spotlight", 40, { eyebrow: "Quick view", title: "Selected product detail" }),
  section("home", "company", 50, { eyebrow: "Inside Muxcor", title: "A real Guangzhou team behind every product discussion.", body: "Founded in 2007, Muxcor supports catalogue sourcing, samples, OEM and ODM development, production coordination, packing, and export delivery through one team.", mediaUrl: "/company/showroom-display.webp", mediaAlt: "Muxcor jewelry showroom display", dataJson: JSON.stringify({ gallery: ["/company/showroom-display.webp", "/company/production-machines.webp", "/company/jewelry-studio.webp"] }) }),
  section("home", "customization", 60, { eyebrow: "Custom jewelry", title: "See how a design moves toward production.", buttonLabel: "Explore the full process", buttonHref: "/customization", mediaUrl: "/company/custom-made.webp", mediaAlt: "Custom jewelry development from sketch and CAD to crafting and polish", dataJson: JSON.stringify({ video: "/company/craft-process-1.mp4", steps: ["01 Brief", "02 CAD", "03 Sample", "04 Production"] }) }),
  section("home", "certifications", 70, { eyebrow: "Documented capabilities", title: "Authentic certificates and representative test reports.", buttonLabel: "Open document library", buttonHref: "/certifications" }),
  section("home", "inquiry", 80, { title: "Build a product inquiry", buttonLabel: "Choose products", buttonHref: "/products" }),

  section("about", "hero", 0, { eyebrow: "Our company", title: "Guangzhou Muxcor International Co., Ltd.", body: "A Guangzhou fashion jewelry manufacturer supporting catalogue supply, mixed wholesale, OEM and ODM development, sample review, production coordination, and delivery follow-up.", mediaUrl: "/company/jewelry-studio.webp", mediaAlt: "Muxcor jewelry studio in Guangzhou" }),
  section("about", "stats", 10, { dataJson: JSON.stringify({ stats: [{ value: "2007", label: "Company founded" }, { value: "2,000 m2", label: "Approx. factory area" }, { value: "200", label: "Skilled production workers" }, { value: "800,000", label: "Approx. pieces per month" }] }) }),
  section("about", "story", 20, { eyebrow: "Built in Guangzhou", title: "From product idea to repeatable supply." }),
  section("about", "history", 30, { eyebrow: "Company history", title: "A long-term production partner, built step by step.", dataJson: JSON.stringify({ timeline: [{ year: "2007", title: "Muxcor established" }, { year: "2015", title: "Factory production began" }, { year: "Today", title: "Integrated sourcing and customization" }] }) }),
  section("about", "capabilities", 40, { eyebrow: "Working scope", title: "Capabilities around the product, not just the item." }),
  section("about", "presentation", 50, { eyebrow: "Company presentation", title: "Factory scale, working teams, and production flow.", dataJson: JSON.stringify({ panels: ["/company/detail-panels/09-company-profile-hd.webp", "/company/detail-panels/10-about-muxcor-hd.webp", "/company/detail-panels/11-factory-overview-hd.webp", "/company/detail-panels/12-process-flow-hd.webp", "/company/detail-panels/13-certificate-collection-hd.webp", "/company/detail-panels/14-service-commitments-hd.webp", "/company/detail-panels/15-packaging-shipping-hd.webp"] }) }),
  section("about", "gallery", 60, { eyebrow: "Inside Muxcor", title: "Showroom, product displays, and working areas.", dataJson: JSON.stringify({ gallery: ["/company/showroom-interior.webp", "/company/showroom-display.webp", "/company/production-machines.webp", "/company/production-floor.webp", "/company/product-display.webp", "/company/jewelry-studio.webp"] }) }),
  section("about", "contact", 70, { eyebrow: "Contact Muxcor", title: "Discuss your market, products, and sourcing plan." }),

  section("customization", "hero", 0, { eyebrow: "OEM and ODM jewelry", title: "Turn a product direction into a production-ready piece.", mediaUrl: "/company/customization-process.webp", mediaAlt: "Muxcor customization process from design to finished jewelry" }),
  section("customization", "brief", 10, { eyebrow: "Start with a clear brief", title: "What helps the team quote and develop your design." }),
  section("customization", "process", 20, { eyebrow: "Development workflow", title: "Five stages from requirement to delivery." }),
  section("customization", "reference", 30, { eyebrow: "Customization reference", title: "Options, materials, and development support at a glance." }),
  section("customization", "process-media", 40, { eyebrow: "Inside the process", title: "See the jewelry work in motion.", dataJson: JSON.stringify({ videos: [{ src: "/company/craft-process-1.mp4", poster: "/company/custom-made.webp", title: "Craft and assembly" }, { src: "/company/craft-process-2.mp4", poster: "/company/manufacturing-capabilities.webp", title: "Finishing and production" }] }) }),
  section("customization", "assurance", 50, { eyebrow: "Before production", title: "Approve the details that matter.", mediaUrl: "/company/custom-made.webp", mediaAlt: "Custom jewelry development from sketch and CAD to crafting and polish" }),
  section("customization", "contact", 60, { title: "Bring a sketch, reference, or product direction." }),

  section("certifications", "hero", 0, { eyebrow: "Documents and compliance", title: "Evidence for company review and product discussions.", mediaUrl: "/company/detail-panels/13-certificate-collection-hd.webp" }),
  section("certifications", "summary", 10, { dataJson: JSON.stringify({ areas: ["Quality management", "Supplier assessment", "Product testing", "Market support"] }) }),
  section("certifications", "evidence", 20, { eyebrow: "Company and production evidence", title: "Documents supported by a visible production operation." }),
  section("certifications", "library", 30, { eyebrow: "Document library", title: "Certificates and representative reports." }),
  section("certifications", "contact", 40, { title: "Confirm documentation for the product and market." }),

  section("after-sales", "hero", 0, { eyebrow: "After-sales service", title: "A clear review path after product delivery.", body: "After-sales decisions are based on the confirmed SKU, quotation, product specification, and shipping records." }),
  section("after-sales", "commitment", 10, { title: "Commitment summary", body: "Muxcor keeps inquiry, after-sales, and privacy language clear from product selection through delivery follow-up." }),
  section("after-sales", "product-review", 20, { title: "Product issue review", body: "Send the inquiry or order reference, SKU, quantity, and clear photos or video. The team will review the issue against the confirmed product specification." }),
  section("after-sales", "production", 30, { title: "Production and quantity differences", body: "Report verified shortages, defects, or specification differences promptly after receipt so the team can review the production and packing records." }),
  section("after-sales", "shipping", 40, { title: "Packing and shipment support", body: "Packing method, carton information, freight, and destination requirements are confirmed with the quotation. No gift-box specification is assumed unless it is written into the order confirmation." }),
  section("after-sales", "resolution", 50, { title: "Resolution process", body: "After evidence and order information are reviewed, the team will confirm the appropriate solution, which may include replacement, replenishment, credit, or another agreed action." }),
  section("after-sales", "evidence", 60, { eyebrow: "Customer feedback", title: "Recent review highlights from verified purchases." }),

  section("privacy", "hero", 0, { eyebrow: "Privacy policy", title: "Private client information deserves careful handling.", body: "This policy explains how Muxcor handles account, order, and client-care information with a careful, transparent approach." }),
  section("privacy", "commitment", 10, { title: "Commitment summary", body: "Muxcor keeps inquiry, after-sales, and privacy language clear from product selection through delivery follow-up." }),
  section("privacy", "information", 20, { title: "Information we collect", body: "We collect account details, contact information, delivery preferences, order history, and communication choices needed to support each client order." }),
  section("privacy", "usage", 30, { title: "How data is used", body: "Information is used to process orders, support customer service, improve shopping flows, manage saved items, and send updates only where customers have opted in." }),
  section("privacy", "protection", 40, { title: "Data protection", body: "Customer information is handled with access controls and secure operational practices. Payment data should be processed through trusted payment providers." }),
  section("privacy", "choices", 50, { title: "Customer choices", body: "Customers may request updates to account details, unsubscribe from marketing communications, or contact support about privacy questions at any time." }),

  section("returns", "hero", 0, { eyebrow: "Returns and exchanges", title: "Clear commitments for jewelry care after purchase.", body: "After-sales review is based on the confirmed product, quotation, and delivery records. This page outlines the return and exchange path." }),
  section("returns", "commitment", 10, { title: "Commitment summary", body: "Muxcor keeps inquiry, after-sales, and privacy language clear from product selection through delivery follow-up." }),
  section("returns", "window", 20, { title: "Return window", body: "Eligible jewelry can be returned within 14 days of delivery when it is unused, unworn, and kept with its original presentation packaging." }),
  section("returns", "exchanges", 30, { title: "Exchange support", body: "If a ring or necklace arrives with a production issue, contact client care with order details and clear photos so the team can arrange an exchange review." }),
  section("returns", "exclusions", 40, { title: "Non-returnable pieces", body: "Customized, engraved, final-sale, or hygiene-sensitive items may be excluded unless a verified production fault is confirmed by the support team." }),
  section("returns", "refunds", 50, { title: "Refund processing", body: "Approved refunds are issued to the original payment method after inspection. Shipping timelines depend on the payment provider and destination region." }),

  section("product-detail", "summary", 0, { sectionType: "product-summary" }),
  section("product-detail", "care", 10, { title: "Care and assurance" }),
  section("product-detail", "editorial", 20, { eyebrow: "Product and production reference", title: "Review the details behind the piece.", dataJson: JSON.stringify({ groups: ["product", "customization", "company"] }) }),
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
