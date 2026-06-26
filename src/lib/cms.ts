import { prisma } from './prisma';
import { formatCategory, formatProduct, formatPost } from './cms-format';
import { getCurrentLocale } from './locale';

export type Locale = 'en' | 'fr' | 'es' | 'ar';

async function resolveLocale(locale?: Locale): Promise<Locale> {
  if (locale) return locale;
  return getCurrentLocale();
}

export async function getCategoriesData(locale?: Locale) {
  const loc = await resolveLocale(locale);
  const cats = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: { _count: { select: { products: true } } },
  });
  return cats.map((c) => formatCategory(c, loc));
}

export async function getProductsData(locale?: Locale) {
  const loc = await resolveLocale(locale);
  const products = await prisma.product.findMany({
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      categories: true,
      skus: { include: { images: { orderBy: { sortOrder: 'asc' } } } },
    },
  });
  return products.map((p) => formatProduct(p, loc));
}

export async function getFeaturedProductsData(locale?: Locale) {
  const loc = await resolveLocale(locale);
  // 先找设为热门的
  let products = await prisma.product.findMany({
    where: { featured: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      categories: true,
      skus: { include: { images: { orderBy: { sortOrder: 'asc' } } } },
    },
  });
  
  // 如果后台一个热门也没设，默认拿前 8 个
  if (products.length === 0) {
    products = await prisma.product.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      take: 8,
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        categories: true,
        skus: { include: { images: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
  }
  return products.map((p) => formatProduct(p, loc));
}

export async function getProductBySlug(slug: string, locale?: Locale) {
  const loc = await resolveLocale(locale);
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      categories: true,
      skus: { include: { images: { orderBy: { sortOrder: 'asc' } } } },
    },
  });
  return product ? formatProduct(product, loc) : null;
}

export async function getPostsData(limit?: number, locale?: Locale) {
  const loc = await resolveLocale(locale);
  const posts = await prisma.post.findMany({
    orderBy: { date: 'desc' },
    take: limit,
  });
  return posts.map((p) => formatPost(p, loc));
}

export async function getPostBySlug(slug: string, locale?: Locale) {
  const loc = await resolveLocale(locale);
  const post = await prisma.post.findUnique({ where: { slug } });
  return post ? formatPost(post, loc) : null;
}
