import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Factory, FileCheck2, Gem, MessagesSquare } from "lucide-react";
import { PageMotion } from "@/components/PageMotion";

export const metadata: Metadata = {
  title: "About Muxcor | Company & Workshop",
  description: "Learn about Muxcor's Guangzhou jewelry workshop, showroom, product review, and sourcing process.",
};

export default function AboutPage() {
  return (
    <>
      <PageMotion />
      <section className="company-hero page-reveal">
        <Image src="/media/company-workshop.png" alt="Muxcor jewelry workshop in Guangzhou" fill priority sizes="100vw" />
        <div className="company-hero-scrim" />
        <div>
          <h1>Guangzhou Muxcor International Co., Ltd.</h1>
          <p>A real workshop and showroom supporting jewelry product review, customization discussion, and production coordination.</p>
          <Link className="primary-link" href="/inquiry-cart">Start an inquiry <ArrowRight size={18} /></Link>
        </div>
      </section>

      <section className="company-capabilities page-reveal">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Company scope</p>
            <h2>What the team handles</h2>
          </div>
        </div>
        <div className="capability-list">
          <article><Gem size={24} /><h3>Product catalogue</h3><p>Rings, necklaces, and coordinated jewelry sets from the supplied product files.</p></article>
          <article><MessagesSquare size={24} /><h3>Requirement review</h3><p>SKU selection, target quantities, market requirements, and customization notes.</p></article>
          <article><Factory size={24} /><h3>Production coordination</h3><p>Sample discussion and production follow-up through the Guangzhou team.</p></article>
          <article><FileCheck2 size={24} /><h3>Document review</h3><p>Available company and product compliance documents can be reviewed for relevant orders.</p></article>
        </div>
      </section>

      <section className="company-gallery page-reveal">
        <Image src="/media/company-showroom.png" alt="Muxcor jewelry showroom and product display" width={900} height={900} />
        <div>
          <p className="section-kicker">Showroom</p>
          <h2>View products, then send one clear request.</h2>
          <p>The public catalogue is organized by product category. Add the SKUs you need to the inquiry cart and the request will appear in the back-office order list.</p>
          <div className="company-actions">
            <Link className="primary-link" href="/products">Browse jewelry</Link>
            <Link className="secondary-link" href="/inquiry-cart">Open inquiry cart</Link>
          </div>
        </div>
      </section>
    </>
  );
}
