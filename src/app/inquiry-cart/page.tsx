import type { Metadata } from "next";
import { InquiryCartView } from "@/components/InquiryCartView";

export const metadata: Metadata = {
  title: "Inquiry Cart | Muxcor",
  description: "Review selected products and send a procurement inquiry to Muxcor.",
};

export default function InquiryCartPage() {
  return <InquiryCartView />;
}
