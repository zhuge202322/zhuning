import type { Metadata } from "next";
import { AuthView } from "@/components/AuthView";

export const metadata: Metadata = {
  title: "Sign In / Register | Muxcor",
  description: "Sign in or register for a Muxcor Crimson Drop Luxury account.",
};

export default function LoginPage() {
  return <AuthView />;
}
