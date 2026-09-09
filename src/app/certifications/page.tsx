import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight, BadgeCheck, FileCheck2, FlaskConical, Globe2, ShieldCheck } from "lucide-react";
import { PageMotion } from "@/components/PageMotion";
import { certificates } from "@/data/company";
import { buildPublicMetadata } from "@/lib/public-seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicMetadata({ type: "PAGE", key: "certifications", pathname: "/certifications", fallbackTitle: "Certifications & Test Reports | Muxcor", fallbackDescription: "Review Muxcor company certifications, supplier assessments, representative REACH reports, GPSR support, and German packaging documentation.", fallbackImage: "/company/detail-panels/13-certificate-collection-hd.webp" });
}

const complianceAreas = [
  { icon: ShieldCheck, title: "Quality management", copy: "ISO 9001 company quality management documentation." },
  { icon: BadgeCheck, title: "Supplier assessment", copy: "SGS and verified supplier assessment materials." },
  { icon: FlaskConical, title: "Product testing", copy: "Representative REACH nickel release, lead, and cadmium reports." },
  { icon: Globe2, title: "Market support", copy: "EU representative and German packaging registration documentation." },
];

export default function CertificationsPage() {
  return (
    <>
      <PageMotion />
      <section className="cert-page-hero page-reveal">
        <div>
          <p className="section-kicker">Documents and compliance</p>
          <h1>Evidence for company review and product discussions.</h1>
          <p>
            Browse authentic certificate covers and representative reports supplied by Muxcor.
            Product-specific validity and applicability are confirmed against the SKU and destination market.
          </p>
        </div>
        <div className="cert-hero-document" aria-hidden="true">
          <Image src="/company/detail-panels/13-certificate-collection-hd.webp" alt="" fill priority unoptimized sizes="420px" />
        </div>
      </section>

      <section className="compliance-summary page-reveal">
        {complianceAreas.map((area) => {
          const Icon = area.icon;
          return (
            <article key={area.title}>
              <Icon size={24} />
              <h2>{area.title}</h2>
              <p>{area.copy}</p>
            </article>
          );
        })}
      </section>

      <section className="cert-company-evidence page-reveal">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Company and production evidence</p>
            <h2>Documents supported by a visible production operation.</h2>
          </div>
        </div>
        <div className="cert-evidence-grid">
          <Image src="/company/detail-panels/09-company-profile-hd.webp" alt="Muxcor company profile" width={1076} height={810} unoptimized sizes="(max-width: 860px) 100vw, 33vw" />
          <Image src="/company/detail-panels/11-factory-overview-hd.webp" alt="Muxcor factory production overview" width={1070} height={950} unoptimized sizes="(max-width: 860px) 100vw, 33vw" />
          <Image src="/company/detail-panels/12-process-flow-hd.webp" alt="Jewelry production process flow" width={1076} height={886} unoptimized sizes="(max-width: 860px) 100vw, 33vw" />
        </div>
      </section>

      <section className="certificate-library page-reveal">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Document library</p>
            <h2>Certificates and representative reports.</h2>
          </div>
        </div>
        <div className="certificate-grid">
          {certificates.map((certificate) => (
            <article key={certificate.title}>
              <div className="certificate-image">
                <Image src={certificate.image} alt={`${certificate.title} cover`} fill sizes="(max-width: 560px) 100vw, (max-width: 1000px) 50vw, 25vw" />
              </div>
              <div className="certificate-copy">
                <span>{certificate.category}</span>
                <h3>{certificate.title}</h3>
                <p>{certificate.detail}</p>
                {certificate.href ? (
                  <a href={certificate.href} target="_blank" rel="noreferrer">
                    View PDF <ArrowUpRight size={16} />
                  </a>
                ) : (
                  <a href={`mailto:Crescent@muxcor.com?subject=${encodeURIComponent(certificate.title + " document request")}`}>
                    Request document <FileCheck2 size={16} />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="certificate-note page-reveal">
        <FileCheck2 size={28} />
        <div>
          <h2>Confirm documentation for the product and market.</h2>
          <p>
            Test reports apply to the identified samples and test scope. Share your destination market and selected
            SKU so the team can confirm the relevant report, labeling, representative, and packaging requirements.
          </p>
        </div>
        <a className="primary-link" href="mailto:Crescent@muxcor.com?subject=Compliance%20document%20request">
          Request document review
        </a>
      </section>
    </>
  );
}
