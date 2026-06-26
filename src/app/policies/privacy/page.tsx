import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Muxcor",
  description: "Muxcor privacy policy for account, order, and communication data.",
};

const sections = [
  {
    title: "Information we collect",
    body: "We collect account details, contact information, delivery preferences, order history, and communication choices needed to support each client order.",
  },
  {
    title: "How data is used",
    body: "Information is used to process orders, support customer service, improve shopping flows, manage saved items, and send updates only where customers have opted in.",
  },
  {
    title: "Data protection",
    body: "Customer information is handled with access controls and secure operational practices. Payment data should be processed through trusted payment providers.",
  },
  {
    title: "Customer choices",
    body: "Customers may request updates to account details, unsubscribe from marketing communications, or contact support about privacy questions at any time.",
  },
];

export default function PrivacyPage() {
  return (
    <PolicyPage
      eyebrow="Privacy policy"
      title="Private client information deserves careful handling."
      intro="This policy explains how Muxcor handles account, order, and client-care information with a careful, transparent approach."
      sections={sections}
    />
  );
}
