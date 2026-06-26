import type { Metadata } from "next";
import { AccountView } from "@/components/AccountView";

export const metadata: Metadata = {
  title: "My Account | Muxcor",
  description: "Muxcor customer center for orders, wishlist, and client care.",
};

export default async function AccountPage() {
  return <AccountView />;
}
