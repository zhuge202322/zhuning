import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FilePenLine, Gem, PackageCheck, Palette, ScanSearch } from "lucide-react";
import { PageMotion } from "@/components/PageMotion";
import { customizationSteps } from "@/data/company";
import { buildPublicMetadata } from "@/lib/public-seo";
import { getPageSection } from "@/lib/cms";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicMetadata({ type: "PAGE", key: "customization", pathname: "/customization", fallbackTitle: "Custom Jewelry Process | Muxcor OEM & ODM", fallbackDescription: "Explore Muxcor's custom jewelry workflow from requirement review and CAD development to sampling, production, polishing, packing, and delivery.", fallbackImage: "/company/customization-process.webp" });
}

const projectInputs = [
  { icon: FilePenLine, title: "Reference and brief", copy: "Sketches, reference images, dimensions, target price, market, and expected quantity." },
  { icon: Gem, title: "Materials and stones", copy: "Base metal, plating color, stones, pearls, finish, and wear requirements." },
  { icon: Palette, title: "Brand direction", copy: "Logo use, color direction, collection language, and packaging preferences." },
  { icon: ScanSearch, title: "Sample approval", copy: "Review the physical sample and confirm details before production begins." },
];

export default async function CustomizationPage() {
  const [heroSection, referenceSection, processMediaSection, assuranceSection] = await Promise.all([
    getPageSection("customization", "hero"),
    getPageSection("customization", "reference"),
    getPageSection("customization", "process-media"),
    getPageSection("customization", "assurance"),
  ]);
  const heroImage = heroSection?.mediaUrl || "/company/customization-process.webp";
  const referenceImage = referenceSection?.mediaUrl || "/company/detail-panels/01-oem-odm-overview-hd.webp";
  const assuranceImage = assuranceSection?.mediaUrl || "/company/custom-made.webp";
  const processPoster = processMediaSection?.mediaUrl || "/company/custom-made.webp";

  return (
    <>
      <PageMotion />
      <section className="custom-hero page-reveal">
        <div className="custom-hero-copy">
          <p className="section-kicker">OEM and ODM jewelry</p>
          <h1>Turn a product direction into a production-ready piece.</h1>
          <p>
            Muxcor supports custom jewelry development from the first brief through design review,
            sampling, production, finishing, packing, and delivery coordination.
          </p>
          <a className="primary-link" href="mailto:Crescent@muxcor.com?subject=Custom%20jewelry%20project">
            Discuss a custom project <ArrowRight size={18} />
          </a>
        </div>
        <div className="custom-hero-media">
          <Image src={heroImage} alt="Muxcor customization process from design to finished jewelry" fill priority sizes="(max-width: 860px) 100vw, 52vw" />
        </div>
      </section>

      <section className="custom-inputs page-reveal">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Start with a clear brief</p>
            <h2>What helps the team quote and develop your design.</h2>
          </div>
        </div>
        <div className="custom-input-grid">
          {projectInputs.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title}>
                <Icon size={23} />
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="custom-process page-reveal">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Development workflow</p>
            <h2>Five stages from requirement to delivery.</h2>
          </div>
        </div>
        <div className="custom-step-list">
          {customizationSteps.map((step) => (
            <article key={step.number}>
              <span>{step.number}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="customization-panels page-reveal">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Customization reference</p>
            <h2>Options, materials, and development support at a glance.</h2>
          </div>
        </div>
        <div className="customization-panel-grid">
          <Image
            src={referenceImage}
            alt="Muxcor OEM and ODM jewelry overview"
            width={1078}
            height={1506}
            unoptimized
            sizes="(max-width: 860px) 100vw, 50vw"
          />
          <Image
            src="/company/detail-panels/02-customization-options-hd.webp"
            alt="Jewelry customization materials and workflow options"
            width={1080}
            height={1734}
            unoptimized
            sizes="(max-width: 860px) 100vw, 50vw"
          />
        </div>
      </section>

      <section className="craft-video-section page-reveal">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Inside the process</p>
            <h2>See the jewelry work in motion.</h2>
          </div>
        </div>
        <div className="craft-video-grid">
          <figure>
            <video controls playsInline preload="metadata" poster={processPoster}>
              <source src="/company/craft-process-1.mp4" type="video/mp4" />
            </video>
            <figcaption>
              <strong>Craft and assembly</strong>
              <span>Workshop footage supplied by Muxcor.</span>
            </figcaption>
          </figure>
          <figure>
            <video controls playsInline preload="metadata" poster="/company/manufacturing-capabilities.webp">
              <source src="/company/craft-process-2.mp4" type="video/mp4" />
            </video>
            <figcaption>
              <strong>Finishing and production</strong>
              <span>Real process footage from the supplied company materials.</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="custom-assurance page-reveal">
        <div className="custom-assurance-image">
          <Image src={assuranceImage} alt="Custom jewelry development from sketch and CAD to crafting and polish" fill sizes="(max-width: 860px) 100vw, 48vw" />
        </div>
        <div>
          <p className="section-kicker">Before production</p>
          <h2>Approve the details that matter.</h2>
          <ul>
            <li><CheckCircle2 size={19} /> Shape, proportions, dimensions, and construction</li>
            <li><CheckCircle2 size={19} /> Material, plating color, stones, and surface finish</li>
            <li><CheckCircle2 size={19} /> Sample appearance and agreed quality requirements</li>
            <li><CheckCircle2 size={19} /> Quantity, packing, delivery terms, and documentation</li>
          </ul>
          <div className="company-actions">
            <a className="primary-link" href="mailto:Crescent@muxcor.com?subject=Custom%20jewelry%20sample%20request">
              Request a sample discussion
            </a>
            <Link className="secondary-link" href="/certifications">
              Review certifications
            </Link>
          </div>
        </div>
      </section>

      <section className="custom-cta page-reveal">
        <PackageCheck size={30} />
        <div>
          <h2>Bring a sketch, reference, or product direction.</h2>
          <p>The team will review feasibility, sampling needs, quantity, timing, and quotation details.</p>
        </div>
        <a className="primary-link" href="mailto:Crescent@muxcor.com?subject=Custom%20jewelry%20inquiry">
          Email the brief <ArrowRight size={18} />
        </a>
      </section>
    </>
  );
}
