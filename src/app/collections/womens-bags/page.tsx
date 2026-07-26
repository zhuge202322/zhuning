import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight, BriefcaseBusiness } from "lucide-react";
import { PageMotion } from "@/components/PageMotion";

export const metadata: Metadata = {
  title: "Women's Bags | Muxcor",
  description: "Request the current Muxcor women's bags sourcing catalogue.",
};

export default function WomensBagsPage() {
  return (
    <>
      <PageMotion />
      <section className="bags-hero page-reveal">
        <div>
          <BriefcaseBusiness size={34} />
          <h1>Women&apos;s Bags</h1>
          <p>The online selection is being prepared. Contact the Muxcor team for current styles, materials, colors, and quotation availability.</p>
          <a className="primary-link" href="mailto:Crescent@muxcor.com?subject=Women%27s%20bags%20catalogue%20request">
            Request the current catalogue <ArrowRight size={18} />
          </a>
        </div>
        <Image src="/media/company-showroom.png" alt="Muxcor product showroom" width={760} height={760} />
      </section>

      <section className="bags-note page-reveal">
        <p className="section-kicker">Catalogue service</p>
        <h2>Request a tailored bag selection</h2>
        <p>Share your target market, preferred bag types, materials, colors, and quantity range. The sourcing team will reply with available options and quotation details.</p>
        <a className="secondary-link" href="mailto:Crescent@muxcor.com?subject=Women%27s%20bags%20sourcing%20request">
          Contact the sourcing team
        </a>
      </section>
    </>
  );
}
