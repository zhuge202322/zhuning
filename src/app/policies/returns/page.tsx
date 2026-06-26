import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Returns & Exchanges | Muxcor",
  description: "Muxcor return and exchange commitments for jewelry orders.",
};

const sections = [
  {
    title: "Return window",
    body: "Eligible jewelry can be returned within 14 days of delivery when it is unused, unworn, and kept with its original presentation packaging.",
  },
  {
    title: "Exchange support",
    body: "If a ring or necklace arrives with a production issue, contact client care with order details and clear photos so the team can arrange an exchange review.",
  },
  {
    title: "Non-returnable pieces",
    body: "Customized, engraved, final-sale, or hygiene-sensitive items may be excluded unless a verified production fault is confirmed by the support team.",
  },
  {
    title: "Refund processing",
    body: "Approved refunds are issued to the original payment method after inspection. Shipping timelines depend on the payment provider and destination region.",
  },
];

export default function ReturnsPage() {
  return (
    <PolicyPage
      eyebrow="Returns and exchanges"
      title="Clear commitments for jewelry care after purchase."
      intro="A luxury purchase should feel considered after checkout too. This page gives customers a calm, transparent return and exchange path."
      sections={sections}
    />
  );
}
