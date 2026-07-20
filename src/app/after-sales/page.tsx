import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "After-sales Service | Muxcor",
  description: "Muxcor after-sales support for product inquiries, production issues, and shipment documentation.",
};

const sections = [
  {
    title: "Product issue review",
    body: "Send the inquiry or order reference, SKU, quantity, and clear photos or video. The team will review the issue against the confirmed product specification.",
  },
  {
    title: "Production and quantity differences",
    body: "Report verified shortages, defects, or specification differences promptly after receipt so the team can review the production and packing records.",
  },
  {
    title: "Packing and shipment support",
    body: "Packing method, carton information, freight, and destination requirements are confirmed with the quotation. No gift-box specification is assumed unless it is written into the order confirmation.",
  },
  {
    title: "Resolution process",
    body: "After evidence and order information are reviewed, the team will confirm the appropriate solution, which may include replacement, replenishment, credit, or another agreed action.",
  },
];

export default function AfterSalesPage() {
  return (
    <PolicyPage
      eyebrow="After-sales service"
      title="A clear review path after product delivery."
      intro="After-sales decisions are based on the confirmed SKU, quotation, product specification, and shipping records."
      sections={sections}
    />
  );
}
