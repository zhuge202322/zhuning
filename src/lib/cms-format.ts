/**
 * Shape local Prisma records into the same JSON structure the frontend
 * already consumes from the WP/WC REST API. This means frontend pages
 * only need to swap the fetch URL, not their rendering logic.
 */

export type Locale = 'en' | 'fr' | 'es' | 'ar';

/** Pick the localized value for a given locale, falling back to English if missing. */
function pick(en: string, fr: string, es: string, ar: string, locale: Locale): string {
  if (locale === 'fr') return fr || en;
  if (locale === 'es') return es || en;
  if (locale === 'ar') return ar || en;
  return en;
}

export function formatCategory(c: any, locale: Locale = 'en'): any {
  return {
    id: c.id,
    name: pick(c.name, c.nameFr || '', c.nameEs || '', c.nameAr || '', locale),
    slug: c.slug,
    count: c._count?.products ?? 0,
    image: c.imageUrl ? { src: c.imageUrl } : undefined,
  };
}

export function formatProduct(p: any, locale: Locale = 'en'): any {
  return {
    id: p.id,
    name: pick(p.name, p.nameFr || '', p.nameEs || '', p.nameAr || '', locale),
    slug: p.slug,
    permalink: `/product/${p.slug}`,
    short_description: pick(
      p.shortDescription || '',
      p.shortDescriptionFr || '',
      p.shortDescriptionEs || '',
      p.shortDescriptionAr || '',
      locale,
    ),
    description: pick(
      p.description || '',
      p.descriptionFr || '',
      p.descriptionEs || '',
      p.descriptionAr || '',
      locale,
    ),
    specs: pick(
      p.specs || '',
      p.specsFr || '',
      p.specsEs || '',
      p.specsAr || '',
      locale,
    ),
    formula: pick(
      p.formula || '',
      p.formulaFr || '',
      p.formulaEs || '',
      p.formulaAr || '',
      locale,
    ),
    specsPdf: p.specsPdf || null,
    formulaPdf: p.formulaPdf || null,
    images: (p.images || []).map((img: any) => ({
      id: img.id,
      src: img.src,
      alt: img.alt || '',
    })),
    categories: (p.categories || []).map((c: any) => ({
      id: c.id,
      name: pick(c.name, c.nameFr || '', c.nameEs || '', c.nameAr || '', locale),
      slug: c.slug,
    })),
    skus: (p.skus || []).map((s: any) => {
      const skuImages = s.images?.length
        ? s.images.map((img: any) => ({ id: img.id, src: img.src, alt: s.name }))
        : s.image
        ? [{ id: -1, src: s.image, alt: s.name }]
        : [];
      return {
        id: s.id,
        name: pick(s.name, s.nameFr || '', s.nameEs || '', s.nameAr || '', locale),
        image: s.image,
        images: skuImages,
        price: s.price || '',
        size: s.size || '',
      };
    }),
  };
}

export function formatPost(p: any, locale: Locale = 'en'): any {
  return {
    id: p.id,
    slug: p.slug,
    link: `/news/${p.slug}`,
    date: p.date instanceof Date ? p.date.toISOString() : p.date,
    title:   { rendered: pick(p.title, p.titleFr || '', p.titleEs || '', p.titleAr || '', locale) },
    excerpt: { rendered: pick(p.excerpt || '', p.excerptFr || '', p.excerptEs || '', p.excerptAr || '', locale) },
    content: { rendered: pick(p.content || '', p.contentFr || '', p.contentEs || '', p.contentAr || '', locale) },
    _embedded: {
      'wp:featuredmedia': p.featuredImage ? [{ source_url: p.featuredImage }] : [],
      author: [{ name: p.authorName || 'Myklens Team' }],
    },
  };
}
