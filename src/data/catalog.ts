export type Product = {
  id: string;
  category: "Necklaces" | "Rings";
  name: string;
  sku: string;
  material: string;
  price: number;
  image: string;
  weight: string;
  packaging: string;
  note: string;
  finish: string;
  stones: string;
  collection: string;
};

export const products: Product[] = [
  {
    id: "ruby-oval-pendant",
    category: "Necklaces",
    name: "Glod Plated Jewelry Oval Diamond-encrusted Copper Alloy Temperament Women with Cuban Chain Gold Pendant Necklace",
    sku: "HN013",
    material: "Copper alloy, gold finish",
    price: 1.77,
    image: "/uploads/imported-products/6-16-1-id_a783e85a8db746eaa57da3a58dacec16.webp",
    weight: "25g",
    packaging: "20cm*16cm*5cm",
    note: "Oval stone pendant with a polished Cuban chain silhouette.",
    finish: "Gold plated",
    stones: "Oval cabochon, crystal halo",
    collection: "Liquid Pearl Lines",
  },
  {
    id: "layered-pearl-collarbone",
    category: "Necklaces",
    name: "Wholesale Women Elegant Long Necklaces Imitation Pearl Iron Beaded Multilayer Stacked Necklaces for Bridal Wedding Gift Jewelry",
    sku: "BHN7871SGP-2",
    material: "Copper, imitation pearl",
    price: 2.93,
    image: "/uploads/imported-products/6-16-1-id_b9cd4071e5b149aa80a75b0371b244b2.webp",
    weight: "25g",
    packaging: "20cm*16cm*5cm",
    note: "A soft multi-strand pearl profile for bridal and evening styling.",
    finish: "Polished silver tone",
    stones: "Imitation pearl",
    collection: "Liquid Pearl Lines",
  },
  {
    id: "crystal-pearl-flower",
    category: "Necklaces",
    name: "Luxury Fancy Jewellery for Ladies Pearl Bead Chain Necklace Bling Crystal Tennis Chain Drop Oil Flower Charm Necklace",
    sku: "HN021",
    material: "Pearl, crystal accents",
    price: 2.01,
    image: "/uploads/imported-products/6-16-1-id_0d5cd9b614b946c682332e86f18ff734.webp",
    weight: "25g",
    packaging: "20cm*16cm*5cm",
    note: "Pearl chain with a luminous floral charm and crystal detailing.",
    finish: "Gold plated",
    stones: "Pearl and crystal",
    collection: "Liquid Pearl Lines",
  },
  {
    id: "three-row-rhinestone",
    category: "Necklaces",
    name: "Luxury Rhinestone Choker Necklace for Women 3 Row Pave Collar Tone Wedding Bridal Prom Party Statement Jewelry Joias De Luxo",
    sku: "BHN3273ST-3",
    material: "Alloy, rhinestone pave",
    price: 2.43,
    image: "/uploads/imported-products/6-16-1-id_fa372a877b3d4c30b29dfc87881db267.webp",
    weight: "25g",
    packaging: "20cm*16cm*5cm",
    note: "A sculpted collar necklace built for formal evening light.",
    finish: "High-shine pave",
    stones: "Rhinestone",
    collection: "Liquid Pearl Lines",
  },
  {
    id: "silver-script-band",
    category: "Rings",
    name: "Muxcor Copper Rings for Girls Boys Fine Jewelry Punk Rings Fancy Jewellery for Ladies Vintage Rings",
    sku: "HGJ0093C",
    material: "Copper",
    price: 2.66,
    image: "/uploads/imported-products/6-16-1-id_6579ce8bc2c14e419ffa2235f71adc4e.webp",
    weight: "15g",
    packaging: "20cm*16cm*5cm",
    note: "A bold polished band with engraved scriptwork and vintage attitude.",
    finish: "Polished silver tone",
    stones: "Engraved relief",
    collection: "Obsidian Statement",
  },
  {
    id: "crimson-gemstone-statement",
    category: "Rings",
    name: "Luxury Brass Jewelry Vintage Emerald Extra-large Gemstone Ring Classic Retro Turkish Islamic Rings for Men",
    sku: "CR001",
    material: "Brass",
    price: 1.35,
    image: "/uploads/imported-products/6-16-1-id_df3cbb9a3bf44c80a10cdce8955a9818.webp",
    weight: "15g",
    packaging: "20cm*16cm*5cm",
    note: "Oversized red stone setting with intricate filigree side detailing.",
    finish: "Antique brass",
    stones: "Crimson gemstone",
    collection: "Obsidian Statement",
  },
  {
    id: "boxed-obsidian-duo",
    category: "Rings",
    name: "Wholesale Custom Designer Luxury Obsidian Hip Hop Gemstone Rings Vintage Jewelry Islamic Turkish Black Punk Rings for Men Gift",
    sku: "AR014",
    material: "Alloy",
    price: 1.11,
    image: "/uploads/imported-products/6-16-1-id_9beb79b94b8946f491b1f408fa0fe5fc.webp",
    weight: "15g",
    packaging: "20cm*16cm*5cm",
    note: "A dramatic paired ring presentation with deep black enamel contrast.",
    finish: "Gold and obsidian tone",
    stones: "Black enamel",
    collection: "Obsidian Statement",
  },
  {
    id: "full-zircon-wedding",
    category: "Rings",
    name: "Custom Vintage Luxury Full Diamond Zircon Wedding Rings Gold Plated Alloy Rings Women Men Designer Exquisite Jewelry",
    sku: "C.R.0331",
    material: "Alloy, zircon",
    price: 2.62,
    image: "/uploads/imported-products/6-16-1-id_40ca62ccf1f04c29af7e8bb2d6842c3f.webp",
    weight: "15g",
    packaging: "20cm*16cm*5cm",
    note: "Stacked zircon rows with warm gold plating and sculpted sparkle.",
    finish: "Gold plated",
    stones: "Zircon",
    collection: "Obsidian Statement",
  },
];

export const credentials = [
  "SGS tested",
  "ISO 9001 factory certification",
  "REACH nickel release, lead and cadmium reports",
  "GPSR EU responsible person support",
  "German Packaging Act documentation",
];

export function getProductById(id: string) {
  return products.find((product) => product.id === id);
}

export function getRelatedProducts(product: Product) {
  return products
    .filter((candidate) => candidate.category === product.category && candidate.id !== product.id)
    .slice(0, 3);
}
