import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, Factory, Gem, Mail, MapPin, MessageCircle, PackageCheck, Share2, Users } from "lucide-react";
import { PageMotion } from "@/components/PageMotion";
import { companyProfile, companyStats, companyTimeline } from "@/data/company";
import { buildPublicMetadata } from "@/lib/public-seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicMetadata({ type: "PAGE", key: "about", pathname: "/about", fallbackTitle: "About Muxcor | Jewelry Manufacturer in Guangzhou", fallbackDescription: "Meet Guangzhou Muxcor International Co., Ltd., explore the workshop and showroom, and learn about its jewelry production and customization capabilities.", fallbackImage: "/company/showroom-interior.webp" });
}

const gallery = [
  { src: "/company/showroom-interior.webp", alt: "Muxcor jewelry showroom interior" },
  { src: "/company/showroom-display.webp", alt: "Jewelry displayed in the Muxcor showroom" },
  { src: "/company/production-machines.webp", alt: "Jewelry production equipment behind a glass partition" },
  { src: "/company/production-floor.webp", alt: "Muxcor production floor" },
  { src: "/company/product-display.webp", alt: "Jewelry product display area" },
  { src: "/company/jewelry-studio.webp", alt: "Muxcor jewelry development studio" },
];

const suppliedCompanyPanels = [
  { src: "/company/detail-panels/10-about-muxcor-hd.webp", alt: "About Muxcor company overview", width: 1076, height: 986 },
  { src: "/company/detail-panels/11-factory-overview-hd.webp", alt: "Muxcor factory production overview", width: 1070, height: 950 },
  { src: "/company/detail-panels/12-process-flow-hd.webp", alt: "Muxcor jewelry production process flow", width: 1076, height: 886 },
];

const capabilities = [
  {
    icon: Gem,
    title: "Broad jewelry range",
    copy: "Earrings, rings, necklaces, sets, bracelets, bangles, anklets, brooches, and related fashion accessories.",
  },
  {
    icon: Factory,
    title: "Material and finish options",
    copy: "Stainless steel, alloy, copper, imitation pearl, gold-plated, silver-plated, and other project-specific materials.",
  },
  {
    icon: Users,
    title: "OEM and ODM support",
    copy: "Design discussion, CAD and sample development, production coordination, and order follow-up through one team.",
  },
  {
    icon: PackageCheck,
    title: "Order delivery support",
    copy: "Packing, documentation, and delivery details are confirmed around the approved sample and quotation.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageMotion />
      <section className="company-hero company-hero-rich page-reveal">
        <Image src="/company/jewelry-studio.webp" alt="Muxcor jewelry studio in Guangzhou" fill priority sizes="100vw" />
        <div className="company-hero-scrim" />
        <div>
          <p className="section-kicker">Our company</p>
          <h1>{companyProfile.name}</h1>
          <p>{companyProfile.overview}</p>
          <div className="company-actions">
            <Link className="primary-link" href="/customization">
              Explore customization <ArrowRight size={18} />
            </Link>
            <Link className="secondary-link light" href="/certifications">View certifications</Link>
          </div>
        </div>
      </section>

      <section className="company-stat-band page-reveal" aria-label="Company facts">
        {companyStats.map((stat) => (
          <div key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="company-story page-reveal">
        <div className="company-story-copy">
          <p className="section-kicker">Built in Guangzhou</p>
          <h2>From product idea to repeatable supply.</h2>
          <p>
            Muxcor has worked in fashion jewelry since 2007, with factory production beginning in 2015.
            The team combines product development, manufacturing follow-up, catalogue sourcing, and export
            coordination for buyers serving different markets.
          </p>
          <p>
            Samples can be prepared for evaluation before production. Confirmed specifications, materials,
            finish, and quality expectations are then used to coordinate the order through packing and delivery.
          </p>
          <Link className="secondary-link" href="/products">Browse the current catalogue</Link>
        </div>
        <div className="company-story-image">
          <Image src="/company/production-machines.webp" alt="Muxcor jewelry production area" fill sizes="(max-width: 860px) 100vw, 48vw" />
        </div>
      </section>

      <section className="company-timeline page-reveal">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Company history</p>
            <h2>A long-term production partner, built step by step.</h2>
          </div>
        </div>
        <div className="timeline-list">
          {companyTimeline.map((item) => (
            <article key={item.year}>
              <span>{item.year}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="company-capabilities page-reveal">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Working scope</p>
            <h2>Capabilities around the product, not just the item.</h2>
          </div>
        </div>
        <div className="capability-list">
          {capabilities.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title}>
                <Icon size={24} />
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="company-editorial page-reveal">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Company presentation</p>
            <h2>Factory scale, working teams, and production flow.</h2>
          </div>
        </div>
        <div className="company-editorial-grid">
          {suppliedCompanyPanels.map((panel) => (
            <Image
              src={panel.src}
              alt={panel.alt}
              width={panel.width}
              height={panel.height}
              unoptimized
              sizes="(max-width: 860px) 100vw, 33vw"
              key={panel.src}
            />
          ))}
        </div>
      </section>

      <section className="company-photo-section page-reveal">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Inside Muxcor</p>
            <h2>Showroom, product displays, and working areas.</h2>
          </div>
        </div>
        <div className="company-photo-grid">
          {gallery.map((image, index) => (
            <figure className={index === 0 || index === 5 ? "wide" : ""} key={image.src}>
              <Image src={image.src} alt={image.alt} fill sizes="(max-width: 560px) 100vw, (max-width: 1000px) 50vw, 33vw" />
            </figure>
          ))}
        </div>
      </section>

      <section className="company-contact page-reveal">
        <div>
          <p className="section-kicker">Contact Muxcor</p>
          <h2>Discuss your market, products, and sourcing plan.</h2>
        </div>
        <div className="company-contact-details">
          <p><MapPin size={20} /> {companyProfile.address}</p>
          <a href={`mailto:${companyProfile.email}`}><Mail size={20} /> {companyProfile.email}</a>
          <a href={companyProfile.whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={20} /> WhatsApp {companyProfile.whatsapp}</a>
          <a href={companyProfile.instagram} target="_blank" rel="noreferrer"><Camera size={20} /> Instagram</a>
          <a href={companyProfile.facebook} target="_blank" rel="noreferrer"><Share2 size={20} /> Facebook</a>
        </div>
      </section>
    </>
  );
}
