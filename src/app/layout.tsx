import { headers } from "next/headers";
import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import { SiteChrome } from "@/components/SiteChrome";
import "./globals.css";
import "./storefront.css";
import { buildRootMetadata } from "@/lib/public-seo";
import { getSiteSetting } from "@/lib/cms";

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

export async function generateMetadata(): Promise<Metadata> {
  return buildRootMetadata();
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const h = await headers();
  const path = h.get("x-pathname") || "";
  const isAdmin = path.startsWith("/admin");

  if (isAdmin) return children;

  const allProductsLabel = (await getSiteSetting("storefront.allProductsLabel"))?.value || "All products";

  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${montserrat.variable}`}>
        <SiteChrome allProductsLabel={allProductsLabel}>{children}</SiteChrome>
      </body>
    </html>
  );
}
