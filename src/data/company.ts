export const companyProfile = {
  name: "Guangzhou Muxcor International Co., Ltd.",
  address: "No. 179 Yingbin Road, Guangzhou City, Guangdong Province, China",
  email: "gary@muxcor.com",
  overview:
    "A Guangzhou fashion jewelry manufacturer supporting catalogue supply, mixed wholesale, OEM and ODM development, sample review, production coordination, and delivery follow-up.",
};

export const companyStats = [
  { value: "2007", label: "Company founded" },
  { value: "2,000 m2", label: "Approx. factory area" },
  { value: "200", label: "Skilled production workers" },
  { value: "800,000", label: "Approx. pieces per month" },
];

export const companyTimeline = [
  {
    year: "2007",
    title: "Muxcor established",
    copy: "The company began serving fashion jewelry customers from Guangzhou, China.",
  },
  {
    year: "2015",
    title: "Factory production began",
    copy: "Dedicated production operations expanded support for sampling, manufacturing, and quality follow-up.",
  },
  {
    year: "Today",
    title: "Integrated sourcing and customization",
    copy: "The team supports catalogue supply, OEM and ODM projects, mixed wholesale, packaging coordination, and global delivery.",
  },
];

export const customizationSteps = [
  {
    number: "01",
    title: "Requirement review",
    copy: "Share references, target market, quantity, material, finish, budget, and delivery expectations.",
  },
  {
    number: "02",
    title: "Design and 3D development",
    copy: "The team translates the direction into sketches, CAD or 3D files, and construction details for review.",
  },
  {
    number: "03",
    title: "Sampling",
    copy: "A sample is prepared so proportions, color, finish, stones, and wearability can be checked before production.",
  },
  {
    number: "04",
    title: "Production and quality review",
    copy: "Crafting, setting, plating, polishing, assembly, and product checks follow the confirmed sample and specification.",
  },
  {
    number: "05",
    title: "Packing and delivery",
    copy: "Packing details and shipment requirements are confirmed with the quotation before delivery coordination.",
  },
];

export type CertificateItem = {
  title: string;
  category: string;
  detail: string;
  image: string;
  href?: string;
};

export const certificates: CertificateItem[] = [
  {
    title: "ISO 9001 Quality Management",
    category: "Company certification",
    detail: "Quality management system certification for the import and export of jewelry and metal products.",
    image: "/company/certificates/iso-9001.webp",
    href: "/company/certificates/iso-9001.pdf",
  },
  {
    title: "SGS Gold Plus Supplier Assessment",
    category: "Supplier verification",
    detail: "On-site supplier assessment presented to Guangzhou Muxcor International Co., Ltd.",
    image: "/company/certificates/sgs-gold-supplier.webp",
    href: "/company/certificates/sgs-gold-supplier.pdf",
  },
  {
    title: "Verified Supplier Assessment Report",
    category: "Factory assessment",
    detail: "Third-party production and trading assessment of the cooperating factory, reviewed by SGS.",
    image: "/company/certificates/verified-supplier-report.webp",
  },
  {
    title: "REACH - Pearl Necklace",
    category: "Product test report",
    detail: "Representative nickel release, lead, and cadmium test report for pearl necklace samples.",
    image: "/company/certificates/reach-pearl-necklace.webp",
    href: "/company/certificates/reach-pearl-necklace.pdf",
  },
  {
    title: "REACH - Zircon Bracelet",
    category: "Product test report",
    detail: "Representative test report for zircon bracelet samples; full product-specific documents are available for review.",
    image: "/company/certificates/reach-zircon-bracelet.webp",
  },
  {
    title: "REACH - Stainless Steel Bracelet",
    category: "Product test report",
    detail: "Representative test report for stainless steel bracelet samples.",
    image: "/company/certificates/reach-stainless-bracelet.webp",
  },
  {
    title: "REACH - Earrings",
    category: "Product test report",
    detail: "Representative test report for earring samples.",
    image: "/company/certificates/reach-earrings.webp",
  },
  {
    title: "EU Representative Certificate",
    category: "GPSR support",
    detail: "European representative appointment documentation for products placed on the European Union market.",
    image: "/company/certificates/eu-representative.webp",
    href: "/company/certificates/eu-representative.pdf",
  },
  {
    title: "Declaration of Conformity",
    category: "Compliance documentation",
    detail: "Company declaration referencing applicable product and market requirements.",
    image: "/company/certificates/declaration-of-conformity.webp",
  },
  {
    title: "German Packaging Register",
    category: "Packaging compliance",
    detail: "Registration update documentation issued by Stiftung Zentrale Stelle Verpackungsregister.",
    image: "/company/certificates/german-packaging.webp",
    href: "/company/certificates/german-packaging.pdf",
  },
];
