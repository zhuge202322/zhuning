import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { PageMotion } from "@/components/PageMotion";

type PolicySection = {
  title: string;
  body: string;
};

export function PolicyPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: PolicySection[];
}) {
  return (
    <>
      <PageMotion />
      <section className="policy-hero page-reveal">
        <p className="section-kicker">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
      </section>

      <section className="policy-layout page-reveal">
        <aside className="policy-aside">
          <BadgeCheck size={24} />
          <h2>Commitment summary</h2>
          <p>
            Muxcor keeps care, returns, and privacy language clear so every
            jewelry order feels considered from selection to aftercare.
          </p>
          <Link href="/products">
            Continue shopping <ArrowRight size={17} />
          </Link>
        </aside>
        <div className="policy-content">
          {sections.map((section) => (
            <article className="policy-card stagger-card" key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
