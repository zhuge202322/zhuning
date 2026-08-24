const PRODUCT_TEXT_FIELDS = [
  "name", "slug", "shortDescription", "description", "material", "sourceSku", "sourceCategory", "weight", "packaging", "stones", "collection",
  "nameFr", "nameEs", "nameAr", "shortDescriptionFr", "shortDescriptionEs", "shortDescriptionAr", "descriptionFr", "descriptionEs", "descriptionAr",
  "specs", "specsFr", "specsEs", "specsAr", "formula", "formulaFr", "formulaEs", "formulaAr",
] as const;
const CATEGORY_TEXT_FIELDS = ["name", "slug", "nameFr", "nameEs", "nameAr"] as const;
const POST_TEXT_FIELDS = ["title", "slug", "excerpt", "content", "authorName", "titleFr", "titleEs", "titleAr", "excerptFr", "excerptEs", "excerptAr", "contentFr", "contentEs", "contentAr"] as const;

function copyPresent(input: Record<string, any>, fields: readonly string[]) {
  return Object.fromEntries(fields.filter((field) => input[field] !== undefined).map((field) => [field, input[field]]));
}

export function categoryScalarData(input: Record<string, any>) {
  return {
    ...copyPresent(input, CATEGORY_TEXT_FIELDS),
    ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
    ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl || null } : {}),
    ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
  };
}

export function postScalarData(input: Record<string, any>) {
  return {
    ...copyPresent(input, POST_TEXT_FIELDS),
    ...(input.featuredImage !== undefined ? { featuredImage: input.featuredImage || null } : {}),
    ...(input.date !== undefined ? { date: new Date(input.date) } : {}),
  };
}

export function productScalarData(input: Record<string, any>) {
  return {
    ...copyPresent(input, PRODUCT_TEXT_FIELDS),
    ...(input.price !== undefined ? { price: input.price } : {}),
    ...(input.featured !== undefined ? { featured: input.featured } : {}),
    ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    ...(input.specsPdf !== undefined ? { specsPdf: input.specsPdf || null } : {}),
    ...(input.formulaPdf !== undefined ? { formulaPdf: input.formulaPdf || null } : {}),
  };
}

export function productImageCreates(images: Array<{ src: string; alt?: string }>) {
  return images.map((image, index) => ({ src: image.src, alt: image.alt || "", sortOrder: index }));
}

export function productSkuCreates(skus: Array<Record<string, any>>) {
  return skus.map((sku) => ({
    name: sku.name,
    nameFr: sku.nameFr || "",
    nameEs: sku.nameEs || "",
    nameAr: sku.nameAr || "",
    image: sku.images?.length ? (typeof sku.images[0] === "string" ? sku.images[0] : sku.images[0].src) : (sku.image || ""),
    price: sku.price || "",
    size: sku.size || "",
    images: sku.images?.length ? {
      create: sku.images.map((image: string | { src: string }, index: number) => ({ src: typeof image === "string" ? image : image.src, sortOrder: index })),
    } : undefined,
  }));
}
