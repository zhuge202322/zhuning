import { pathToFileURL } from "node:url";

export const siteSettingFallbacks = [
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
  { key: "seo.siteTitle", value: "Muxcor | Jewelry Catalogue & Product Inquiry", type: "text", group: "seo" },
  { key: "seo.defaultDescription", value: "Explore Muxcor jewelry, bags and fashion accessories for wholesale, private-label and custom sourcing inquiries.", type: "textarea", group: "seo" },
  { key: "seo.defaultKeywords", value: "Muxcor, wholesale jewelry, custom jewelry, fashion accessories, jewelry manufacturer", type: "textarea", group: "seo" },
  { key: "seo.siteUrl", value: "", type: "url", group: "seo" },
  { key: "seo.defaultOgImage", value: "/company/showroom-display.webp", type: "image", group: "seo" },
  { key: "seo.twitterHandle", value: "", type: "text", group: "seo" },
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
      secondaryAction: { label: "About the company", href: "/about" },
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
  section("home", "categories", 20, { eyebrow: "Product categories", title: "A clear product framework for faster sourcing.", dataJson: JSON.stringify({ cards: [{ label: "Necklaces", title: "Liquid Pearl Lines", body: "Layered pearl chains, gold finishes, and crystal light for formal wardrobes.", linkLabel: "Explore necklaces", href: "/products?category=necklaces" }, { label: "Rings", title: "Obsidian Statement", body: "Sculpted bands, oversized gemstones, and red-black accents for confident styling.", linkLabel: "Explore rings", href: "/products?category=rings" }, { label: "Jewelry sets", title: "Coordinated Sets", body: "Matching necklace, earring, ring, and bracelet combinations from the supplied catalogue.", linkLabel: "Explore jewelry sets", href: "/products?category=jewelry-sets" }] }) }),
  section("home", "catalogue", 30, { eyebrow: "Current catalogue", title: "Featured products from the supplied files", buttonLabel: "View all products", buttonHref: "/products", dataJson: JSON.stringify({ limit: 8 }) }),
  section("home", "spotlight", 40, { eyebrow: "Quick view", title: "Selected product detail", dataJson: JSON.stringify({ actionLabel: "Add to inquiry cart", addedLabel: "Added to inquiry cart", skuPrefix: "SKU" }) }),
  section("home", "company", 50, { eyebrow: "Inside Muxcor", title: "A real Guangzhou team behind every product discussion.", body: "Founded in 2007, Muxcor supports catalogue sourcing, samples, OEM and ODM development, production coordination, packing, and export delivery through one team.", mediaUrl: "/company/showroom-display.webp", mediaAlt: "Muxcor jewelry showroom display", buttonLabel: "Meet the company", buttonHref: "/about", dataJson: JSON.stringify({ gallery: [{ src: "/company/showroom-display.webp", alt: "Muxcor jewelry showroom display", role: "primary" }, { src: "/company/production-machines.webp", alt: "Muxcor production equipment" }, { src: "/company/jewelry-studio.webp", alt: "Muxcor jewelry development studio" }], facts: [{ label: "Product scope", value: "Jewelry and fashion accessories" }, { label: "Materials", value: "Steel, alloy, copper, pearl, plated finishes" }, { label: "Project support", value: "Mixed wholesale, OEM, ODM, and samples" }], secondaryAction: { label: "Customization process", href: "/customization" } }) }),
  section("home", "customization", 60, { eyebrow: "Custom jewelry", title: "See how a design moves toward production.", body: "Review the brief, develop the design, approve the sample, then coordinate crafting, finishing, packing, and delivery.", buttonLabel: "Explore the full process", buttonHref: "/customization", mediaUrl: "/company/custom-made.webp", mediaAlt: "Custom jewelry development from sketch and CAD to crafting and polish", dataJson: JSON.stringify({ video: { src: "/company/craft-process-1.mp4", poster: "/company/custom-made.webp" }, steps: ["01 Brief", "02 CAD", "03 Sample", "04 Production"] }) }),
  section("home", "certifications", 70, { eyebrow: "Documented capabilities", title: "Authentic certificates and representative test reports.", buttonLabel: "Open document library", buttonHref: "/certifications", dataJson: JSON.stringify({ certificates: [{ title: "ISO 9001 Quality Management", category: "Company certification", image: "/company/certificates/iso-9001.webp" }, { title: "SGS Gold Plus Supplier Assessment", category: "Supplier verification", image: "/company/certificates/sgs-gold-supplier.webp" }, { title: "Verified Supplier Assessment Report", category: "Factory assessment", image: "/company/certificates/verified-supplier-report.webp" }] }) }),
  section("home", "inquiry", 80, { title: "Build a product inquiry", body: "Add the SKUs you need, enter your contact details, and send the list to the team for follow-up.", buttonLabel: "Choose products", buttonHref: "/products", dataJson: JSON.stringify({ secondaryAction: { label: "Open inquiry cart", href: "/inquiry-cart" } }) }),

  section("about", "hero", 0, { eyebrow: "Our company", title: "Guangzhou Muxcor International Co., Ltd.", body: "A Guangzhou fashion jewelry manufacturer supporting catalogue supply, mixed wholesale, OEM and ODM development, sample review, production coordination, and delivery follow-up.", buttonLabel: "Explore customization", buttonHref: "/customization", mediaUrl: "/company/jewelry-studio.webp", mediaAlt: "Muxcor jewelry studio in Guangzhou", dataJson: JSON.stringify({ secondaryAction: { label: "View certifications", href: "/certifications" } }) }),
  section("about", "stats", 10, { dataJson: JSON.stringify({ stats: [{ value: "2007", label: "Company founded" }, { value: "2,000 m2", label: "Approx. factory area" }, { value: "200", label: "Skilled production workers" }, { value: "800,000", label: "Approx. pieces per month" }] }) }),
  section("about", "story", 20, { eyebrow: "Built in Guangzhou", title: "From product idea to repeatable supply.", body: "Muxcor has worked in fashion jewelry since 2007, with factory production beginning in 2015. The team combines product development, manufacturing follow-up, catalogue sourcing, and export coordination for buyers serving different markets.\n\nSamples can be prepared for evaluation before production. Confirmed specifications, materials, finish, and quality expectations are then used to coordinate the order through packing and delivery.", buttonLabel: "Browse the current catalogue", buttonHref: "/products", mediaUrl: "/company/production-machines.webp", mediaAlt: "Muxcor jewelry production area" }),
  section("about", "history", 30, { eyebrow: "Company history", title: "A long-term production partner, built step by step.", dataJson: JSON.stringify({ timeline: [{ year: "2007", title: "Muxcor established", copy: "The company began serving fashion jewelry customers from Guangzhou, China." }, { year: "2015", title: "Factory production began", copy: "Dedicated production operations expanded support for sampling, manufacturing, and quality follow-up." }, { year: "Today", title: "Integrated sourcing and customization", copy: "The team supports catalogue supply, OEM and ODM projects, mixed wholesale, packaging coordination, and global delivery." }] }) }),
  section("about", "capabilities", 40, { eyebrow: "Working scope", title: "Capabilities around the product, not just the item.", dataJson: JSON.stringify({ capabilities: [{ title: "Broad jewelry range", copy: "Earrings, rings, necklaces, sets, bracelets, bangles, anklets, brooches, and related fashion accessories." }, { title: "Material and finish options", copy: "Stainless steel, alloy, copper, imitation pearl, gold-plated, silver-plated, and other project-specific materials." }, { title: "OEM and ODM support", copy: "Design discussion, CAD and sample development, production coordination, and order follow-up through one team." }, { title: "Order delivery support", copy: "Packing, documentation, and delivery details are confirmed around the approved sample and quotation." }] }) }),
  section("about", "presentation", 50, { eyebrow: "Company presentation", title: "Factory scale, working teams, and production flow.", dataJson: JSON.stringify({ panels: [{ src: "/company/detail-panels/10-about-muxcor-hd.webp", alt: "About Muxcor company overview", width: 1076, height: 986 }, { src: "/company/detail-panels/11-factory-overview-hd.webp", alt: "Muxcor factory production overview", width: 1070, height: 950 }, { src: "/company/detail-panels/12-process-flow-hd.webp", alt: "Muxcor jewelry production process flow", width: 1076, height: 886 }] }) }),
  section("about", "gallery", 60, { eyebrow: "Inside Muxcor", title: "Showroom, product displays, and working areas.", dataJson: JSON.stringify({ gallery: [{ src: "/company/showroom-interior.webp", alt: "Muxcor jewelry showroom interior", wide: true }, { src: "/company/showroom-display.webp", alt: "Jewelry displayed in the Muxcor showroom", wide: false }, { src: "/company/production-machines.webp", alt: "Jewelry production equipment behind a glass partition", wide: false }, { src: "/company/production-floor.webp", alt: "Muxcor production floor", wide: false }, { src: "/company/product-display.webp", alt: "Jewelry product display area", wide: false }, { src: "/company/jewelry-studio.webp", alt: "Muxcor jewelry development studio", wide: true }] }) }),
  section("about", "contact", 70, { eyebrow: "Contact Muxcor", title: "Discuss your market, products, and sourcing plan.", dataJson: JSON.stringify({ contacts: [{ type: "address", label: "No. 179 Yingbin Road, Guangzhou City, Guangdong Province, China." }, { type: "email", label: "Crescent@muxcor.com", href: "mailto:Crescent@muxcor.com" }, { type: "whatsapp", label: "WhatsApp +86 134 1613 4933", href: "https://wa.me/8613416134933" }, { type: "instagram", label: "Instagram", href: "https://www.instagram.com/muxcoraccs?igsh=OXR3eHdwbDg1aGNw" }, { type: "facebook", label: "Facebook", href: "https://www.facebook.com/share/1SfdmkP2Q2/" }] }) }),

  section("customization", "hero", 0, { eyebrow: "OEM and ODM jewelry", title: "Turn a product direction into a production-ready piece.", body: "Muxcor supports custom jewelry development from the first brief through design review, sampling, production, finishing, packing, and delivery coordination.", buttonLabel: "Discuss a custom project", buttonHref: "mailto:Crescent@muxcor.com?subject=Custom%20jewelry%20project", mediaUrl: "/company/customization-process.webp", mediaAlt: "Muxcor customization process from design to finished jewelry" }),
  section("customization", "brief", 10, { eyebrow: "Start with a clear brief", title: "What helps the team quote and develop your design.", dataJson: JSON.stringify({ items: [{ title: "Reference and brief", copy: "Sketches, reference images, dimensions, target price, market, and expected quantity." }, { title: "Materials and stones", copy: "Base metal, plating color, stones, pearls, finish, and wear requirements." }, { title: "Brand direction", copy: "Logo use, color direction, collection language, and packaging preferences." }, { title: "Sample approval", copy: "Review the physical sample and confirm details before production begins." }] }) }),
  section("customization", "process", 20, { eyebrow: "Development workflow", title: "Five stages from requirement to delivery.", dataJson: JSON.stringify({ steps: [{ number: "01", title: "Requirement review", copy: "Share references, target market, quantity, material, finish, budget, and delivery expectations." }, { number: "02", title: "Design and 3D development", copy: "The team translates the direction into sketches, CAD or 3D files, and construction details for review." }, { number: "03", title: "Sampling", copy: "A sample is prepared so proportions, color, finish, stones, and wearability can be checked before production." }, { number: "04", title: "Production and quality review", copy: "Crafting, setting, plating, polishing, assembly, and product checks follow the confirmed sample and specification." }, { number: "05", title: "Packing and delivery", copy: "Packing details and shipment requirements are confirmed with the quotation before delivery coordination." }] }) }),
  section("customization", "reference", 30, { eyebrow: "Customization reference", title: "Options, materials, and development support at a glance.", dataJson: JSON.stringify({ panels: [{ src: "/company/detail-panels/01-oem-odm-overview-hd.webp", alt: "Muxcor OEM and ODM jewelry overview", width: 1078, height: 1506 }, { src: "/company/detail-panels/02-customization-options-hd.webp", alt: "Jewelry customization materials and workflow options", width: 1080, height: 1734 }] }) }),
  section("customization", "process-media", 40, { eyebrow: "Inside the process", title: "See the jewelry work in motion.", dataJson: JSON.stringify({ videos: [{ src: "/company/craft-process-1.mp4", poster: "/company/custom-made.webp", title: "Craft and assembly", copy: "Workshop footage supplied by Muxcor." }, { src: "/company/craft-process-2.mp4", poster: "/company/manufacturing-capabilities.webp", title: "Finishing and production", copy: "Real process footage from the supplied company materials." }] }) }),
  section("customization", "assurance", 50, { eyebrow: "Before production", title: "Approve the details that matter.", buttonLabel: "Request a sample discussion", buttonHref: "mailto:Crescent@muxcor.com?subject=Custom%20jewelry%20sample%20request", mediaUrl: "/company/custom-made.webp", mediaAlt: "Custom jewelry development from sketch and CAD to crafting and polish", dataJson: JSON.stringify({ checklist: ["Shape, proportions, dimensions, and construction", "Material, plating color, stones, and surface finish", "Sample appearance and agreed quality requirements", "Quantity, packing, delivery terms, and documentation"], secondaryAction: { label: "Review certifications", href: "/certifications" } }) }),
  section("customization", "contact", 60, { title: "Bring a sketch, reference, or product direction.", body: "The team will review feasibility, sampling needs, quantity, timing, and quotation details.", buttonLabel: "Email the brief", buttonHref: "mailto:Crescent@muxcor.com?subject=Custom%20jewelry%20inquiry" }),

  section("certifications", "hero", 0, { eyebrow: "Documents and compliance", title: "Evidence for company review and product discussions.", body: "Browse authentic certificate covers and representative reports supplied by Muxcor. Product-specific validity and applicability are confirmed against the SKU and destination market.", mediaUrl: "/company/detail-panels/13-certificate-collection-hd.webp", mediaAlt: "" }),
  section("certifications", "summary", 10, { body: "Browse authentic certificate covers and representative reports supplied by Muxcor. Product-specific validity and applicability are confirmed against the SKU and destination market.", dataJson: JSON.stringify({ areas: [{ title: "Quality management", copy: "ISO 9001 company quality management documentation." }, { title: "Supplier assessment", copy: "SGS and verified supplier assessment materials." }, { title: "Product testing", copy: "Representative REACH nickel release, lead, and cadmium reports." }, { title: "Market support", copy: "EU representative and German packaging registration documentation." }] }) }),
  section("certifications", "evidence", 20, { eyebrow: "Company and production evidence", title: "Documents supported by a visible production operation.", dataJson: JSON.stringify({ panels: [{ src: "/company/detail-panels/09-company-profile-hd.webp", alt: "Muxcor company profile", width: 1076, height: 810 }, { src: "/company/detail-panels/11-factory-overview-hd.webp", alt: "Muxcor factory production overview", width: 1070, height: 950 }, { src: "/company/detail-panels/12-process-flow-hd.webp", alt: "Jewelry production process flow", width: 1076, height: 886 }] }) }),
  section("certifications", "library", 30, { eyebrow: "Document library", title: "Certificates and representative reports.", dataJson: JSON.stringify({ certificates: [{ title: "ISO 9001 Quality Management", category: "Company certification", detail: "Quality management system certification for the import and export of jewelry and metal products.", image: "/company/certificates/iso-9001.webp", href: "/company/certificates/iso-9001.pdf" }, { title: "SGS Gold Plus Supplier Assessment", category: "Supplier verification", detail: "On-site supplier assessment presented to Guangzhou Muxcor International Co., Ltd.", image: "/company/certificates/sgs-gold-supplier.webp", href: "/company/certificates/sgs-gold-supplier.pdf" }, { title: "Verified Supplier Assessment Report", category: "Factory assessment", detail: "Third-party production and trading assessment of the cooperating factory, reviewed by SGS.", image: "/company/certificates/verified-supplier-report.webp" }, { title: "REACH - Pearl Necklace", category: "Product test report", detail: "Representative nickel release, lead, and cadmium test report for pearl necklace samples.", image: "/company/certificates/reach-pearl-necklace.webp", href: "/company/certificates/reach-pearl-necklace.pdf" }, { title: "REACH - Zircon Bracelet", category: "Product test report", detail: "Representative test report for zircon bracelet samples; full product-specific documents are available for review.", image: "/company/certificates/reach-zircon-bracelet.webp" }, { title: "REACH - Stainless Steel Bracelet", category: "Product test report", detail: "Representative test report for stainless steel bracelet samples.", image: "/company/certificates/reach-stainless-bracelet.webp" }, { title: "REACH - Earrings", category: "Product test report", detail: "Representative test report for earring samples.", image: "/company/certificates/reach-earrings.webp" }, { title: "EU Representative Certificate", category: "GPSR support", detail: "European representative appointment documentation for products placed on the European Union market.", image: "/company/certificates/eu-representative.webp", href: "/company/certificates/eu-representative.pdf" }, { title: "Declaration of Conformity", category: "Compliance documentation", detail: "Company declaration referencing applicable product and market requirements.", image: "/company/certificates/declaration-of-conformity.webp" }, { title: "German Packaging Register", category: "Packaging compliance", detail: "Registration update documentation issued by Stiftung Zentrale Stelle Verpackungsregister.", image: "/company/certificates/german-packaging.webp", href: "/company/certificates/german-packaging.pdf" }] }) }),
  section("certifications", "contact", 40, { title: "Confirm documentation for the product and market.", body: "Test reports apply to the identified samples and test scope. Share your destination market and selected SKU so the team can confirm the relevant report, labeling, representative, and packaging requirements.", buttonLabel: "Request document review", buttonHref: "mailto:Crescent@muxcor.com?subject=Compliance%20document%20request" }),

  section("after-sales", "hero", 0, { eyebrow: "After-sales service", title: "A clear review path after product delivery.", body: "After-sales decisions are based on the confirmed SKU, quotation, product specification, and shipping records." }),
  section("after-sales", "commitment", 10, { title: "Commitment summary", body: "Muxcor keeps inquiry, after-sales, and privacy language clear from product selection through delivery follow-up.", buttonLabel: "Continue browsing", buttonHref: "/products" }),
  section("after-sales", "product-review", 20, { title: "Product issue review", body: "Send the inquiry or order reference, SKU, quantity, and clear photos or video. The team will review the issue against the confirmed product specification." }),
  section("after-sales", "production", 30, { title: "Production and quantity differences", body: "Report verified shortages, defects, or specification differences promptly after receipt so the team can review the production and packing records." }),
  section("after-sales", "shipping", 40, { title: "Packing and shipment support", body: "Packing method, carton information, freight, and destination requirements are confirmed with the quotation. No gift-box specification is assumed unless it is written into the order confirmation." }),
  section("after-sales", "resolution", 50, { title: "Resolution process", body: "After evidence and order information are reviewed, the team will confirm the appropriate solution, which may include replacement, replenishment, credit, or another agreed action." }),
  section("after-sales", "evidence", 60, { eyebrow: "Customer feedback", title: "Recent review highlights from verified purchases.", dataJson: JSON.stringify({ media: [{ src: "/company/detail-panels/08-customer-reviews-hd.webp", alt: "Customer review highlights for Muxcor jewelry orders", width: 1074, height: 1308, caption: "Feedback examples supplied by Muxcor from completed marketplace orders." }, { src: "/company/detail-panels/15-packaging-shipping-hd.webp", alt: "Muxcor jewelry packaging, warehouse, and shipping references", width: 1072, height: 980, caption: "Packaging and shipment references from the supplied company materials." }] }) }),

  section("privacy", "hero", 0, { eyebrow: "Privacy policy", title: "Private client information deserves careful handling.", body: "This policy explains how Muxcor handles account, order, and client-care information with a careful, transparent approach." }),
  section("privacy", "commitment", 10, { title: "Commitment summary", body: "Muxcor keeps inquiry, after-sales, and privacy language clear from product selection through delivery follow-up.", buttonLabel: "Continue browsing", buttonHref: "/products" }),
  section("privacy", "information", 20, { title: "Information we collect", body: "We collect account details, contact information, delivery preferences, order history, and communication choices needed to support each client order." }),
  section("privacy", "usage", 30, { title: "How data is used", body: "Information is used to process orders, support customer service, improve shopping flows, manage saved items, and send updates only where customers have opted in." }),
  section("privacy", "protection", 40, { title: "Data protection", body: "Customer information is handled with access controls and secure operational practices. Payment data should be processed through trusted payment providers." }),
  section("privacy", "choices", 50, { title: "Customer choices", body: "Customers may request updates to account details, unsubscribe from marketing communications, or contact support about privacy questions at any time." }),

  section("returns", "hero", 0, { eyebrow: "Returns and exchanges", title: "Clear commitments for jewelry care after purchase.", body: "After-sales review is based on the confirmed product, quotation, and delivery records. This page outlines the return and exchange path." }),
  section("returns", "commitment", 10, { title: "Commitment summary", body: "Muxcor keeps inquiry, after-sales, and privacy language clear from product selection through delivery follow-up.", buttonLabel: "Continue browsing", buttonHref: "/products" }),
  section("returns", "window", 20, { title: "Return window", body: "Eligible jewelry can be returned within 14 days of delivery when it is unused, unworn, and kept with its original presentation packaging." }),
  section("returns", "exchanges", 30, { title: "Exchange support", body: "If a ring or necklace arrives with a production issue, contact client care with order details and clear photos so the team can arrange an exchange review." }),
  section("returns", "exclusions", 40, { title: "Non-returnable pieces", body: "Customized, engraved, final-sale, or hygiene-sensitive items may be excluded unless a verified production fault is confirmed by the support team." }),
  section("returns", "refunds", 50, { title: "Refund processing", body: "Approved refunds are issued to the original payment method after inspection. Shipping timelines depend on the payment provider and destination region." }),

  section("product-detail", "summary", 0, { sectionType: "product-summary", dataJson: JSON.stringify({ backLabel: "Back to collection", backHref: "/products", addLabel: "Add to inquiry cart", addedLabel: "Added to inquiry cart", saveLabel: "Save piece", savedLabel: "Saved", specificationLabels: ["Material", "Stones", "Packing reference", "SKU"] }) }),
  section("product-detail", "care", 10, { title: "Care and assurance", body: "Keep the piece dry, avoid direct perfume contact, and clean it gently with a soft cloth. Final packing and shipment details are confirmed with the quotation for each SKU." }),
  section("product-detail", "editorial", 20, { eyebrow: "Product and production reference", title: "Review the details behind the piece.", dataJson: JSON.stringify({ groups: [{ id: "product", label: "Product details", title: "Pearl necklace details and styling", copy: "Material, construction, wearing, and styling references for the pearl necklace collection.", necklacesOnly: true, panels: [{ src: "/company/detail-panels/03-necklace-hero-hd.webp", alt: "Pearl necklace collection overview", width: 1072, height: 1448 }, { src: "/company/detail-panels/04-necklace-details-hd.webp", alt: "Pearl necklace construction and material details", width: 1078, height: 1036 }, { src: "/company/detail-panels/05-quality-assurance-hd.webp", alt: "Pearl necklace quality assurance", width: 1072, height: 1018 }, { src: "/company/detail-panels/06-product-advantages-hd.webp", alt: "Pearl jewelry product advantages", width: 1068, height: 1296 }, { src: "/company/detail-panels/07-styling-and-more-products-hd.webp", alt: "Pearl jewelry styling and related product references", width: 1072, height: 1398 }] }, { id: "customization", label: "Customization", title: "OEM and ODM options", copy: "A visual reference for the design, sampling, materials, craftsmanship, production, and delivery workflow.", panels: [{ src: "/company/detail-panels/01-oem-odm-overview-hd.webp", alt: "Muxcor OEM and ODM jewelry overview", width: 1078, height: 1506 }, { src: "/company/detail-panels/02-customization-options-hd.webp", alt: "Muxcor jewelry customization options", width: 1080, height: 1734 }] }, { id: "company", label: "Factory and trust", title: "Company, production, and delivery evidence", copy: "Customer feedback, company information, factory production, process flow, certificates, service commitments, and shipment references.", panels: [{ src: "/company/detail-panels/08-customer-reviews-hd.webp", alt: "Customer review highlights", width: 1074, height: 1308 }, { src: "/company/detail-panels/09-company-profile-hd.webp", alt: "Muxcor company profile", width: 1076, height: 810 }, { src: "/company/detail-panels/10-about-muxcor-hd.webp", alt: "About Guangzhou Muxcor International", width: 1076, height: 986 }, { src: "/company/detail-panels/11-factory-overview-hd.webp", alt: "Muxcor factory and jewelry production teams", width: 1070, height: 950 }, { src: "/company/detail-panels/12-process-flow-hd.webp", alt: "Jewelry manufacturing process flow", width: 1076, height: 886 }, { src: "/company/detail-panels/13-certificate-collection-hd.webp", alt: "Muxcor certificate collection", width: 1070, height: 636 }, { src: "/company/detail-panels/14-service-commitments-hd.webp", alt: "Muxcor product and service commitments", width: 1072, height: 800 }, { src: "/company/detail-panels/15-packaging-shipping-hd.webp", alt: "Jewelry packaging and shipping", width: 1072, height: 980 }] }] }) }),
  section("product-detail", "related", 30, { eyebrow: "You may also like", title: "Pieces in the same mood" }),
];

const certificationLibrarySection = sections.find(
  (item) => item.pageKey === "certifications" && item.sectionKey === "library",
);
if (certificationLibrarySection) {
  const library = JSON.parse(certificationLibrarySection.dataJson);
  library.certificates = library.certificates.map((certificate) => ({
    ...certificate,
    actionLabel: certificate.href ? "View PDF" : "Request document",
    actionHref: certificate.href || `mailto:Crescent@muxcor.com?subject=${encodeURIComponent(`${certificate.title} document request`)}`,
  }));
  certificationLibrarySection.dataJson = JSON.stringify(library);
}

function section(pageKey, sectionKey, sortOrder, values = {}) {
  return { pageKey, sectionKey, sortOrder, ...values };
}

export const pageSectionFallbacks = sections.map((item) => ({
  sectionType: "text-media",
  eyebrow: "",
  title: "",
  body: "",
  buttonLabel: "",
  buttonHref: "",
  mediaUrl: "",
  mediaAlt: "",
  dataJson: "{}",
  enabled: true,
  ...item,
}));

async function seedAdmin(prisma, bcrypt) {
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
  process.env.DATABASE_URL ||= "file:./dev.db";
  const [{ PrismaClient }, { default: bcrypt }] = await Promise.all([
    import("@prisma/client"),
    import("bcryptjs"),
  ]);
  const prisma = new PrismaClient();
  try {
    await seedAdmin(prisma, bcrypt);
    await prisma.$transaction([
      ...siteSettingFallbacks.map((setting) => prisma.siteSetting.upsert({ where: { key: setting.key }, update: {}, create: setting })),
      ...pageSectionFallbacks.map((item) => prisma.pageSection.upsert({
        where: { pageKey_sectionKey: { pageKey: item.pageKey, sectionKey: item.sectionKey } },
        update: {},
        create: item,
      })),
    ]);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
