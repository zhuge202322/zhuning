import { headers } from "next/headers";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import { SiteChrome } from "@/components/SiteChrome";
import "./globals.css";
import "./storefront.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata = {
  title: "Muxcor | Crimson Drop Luxury Jewelry",
  description: "English B2C luxury jewelry storefront and admin panel.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const h = await headers();
  const path = h.get("x-pathname") || "";
  const isAdmin = path.startsWith("/admin");

  if (isAdmin) return children;

  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${montserrat.variable}`}>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
