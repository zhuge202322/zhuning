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
    name: "Ruby Oval Pendant Necklace",
    sku: "HN013",
    material: "Copper alloy, gold finish",
    price: 118,
    image: "/products/ruby-oval-pendant-necklace.png",
    weight: "25g",
    packaging: "20cm x 16cm x 5cm",
    note: "Oval stone pendant with a polished Cuban chain silhouette.",
    finish: "Gold plated",
    stones: "Oval cabochon, crystal halo",
    collection: "Liquid Pearl Lines",
  },
  {
    id: "layered-pearl-collarbone",
    category: "Necklaces",
    name: "Layered Pearl Collarbone Necklace",
    sku: "BHN7871SGP-2",
    material: "Copper, imitation pearl",
    price: 96,
    image: "/products/pearl-layered-necklace.png",
    weight: "25g",
    packaging: "20cm x 16cm x 5cm",
    note: "A soft multi-strand pearl profile for bridal and evening styling.",
    finish: "Polished silver tone",
    stones: "Imitation pearl",
    collection: "Liquid Pearl Lines",
  },
  {
    id: "crystal-pearl-flower",
    category: "Necklaces",
    name: "Crystal Pearl Flower Charm Necklace",
    sku: "HN021",
    material: "Pearl, crystal accents",
    price: 128,
    image: "/products/crystal-pearl-flower-necklace.png",
    weight: "25g",
    packaging: "20cm x 16cm x 5cm",
    note: "Pearl chain with a luminous floral charm and crystal detailing.",
    finish: "Gold plated",
    stones: "Pearl and crystal",
    collection: "Liquid Pearl Lines",
  },
  {
    id: "three-row-rhinestone",
    category: "Necklaces",
    name: "Three-Row Rhinestone Choker",
    sku: "BHN3273ST-3",
    material: "Alloy, rhinestone pave",
    price: 142,
    image: "/products/rhinestone-choker-necklace.png",
    weight: "25g",
    packaging: "20cm x 16cm x 5cm",
    note: "A sculpted collar necklace built for formal evening light.",
    finish: "High-shine pave",
    stones: "Rhinestone",
    collection: "Liquid Pearl Lines",
  },
  {
    id: "silver-script-band",
    category: "Rings",
    name: "Silver Script Band Ring",
    sku: "HGJ0093C",
    material: "Copper",
    price: 88,
    image: "/products/emerald-statement-ring.png",
    weight: "15g",
    packaging: "20cm x 16cm x 5cm",
    note: "A bold polished band with engraved scriptwork and vintage attitude.",
    finish: "Polished silver tone",
    stones: "Engraved relief",
    collection: "Obsidian Statement",
  },
  {
    id: "crimson-gemstone-statement",
    category: "Rings",
    name: "Crimson Gemstone Statement Ring",
    sku: "CR001",
    material: "Brass",
    price: 76,
    image: "/products/zircon-anniversary-ring.png",
    weight: "15g",
    packaging: "20cm x 16cm x 5cm",
    note: "Oversized red stone setting with intricate filigree side detailing.",
    finish: "Antique brass",
    stones: "Crimson gemstone",
    collection: "Obsidian Statement",
  },
  {
    id: "boxed-obsidian-duo",
    category: "Rings",
    name: "Boxed Obsidian Duo Ring",
    sku: "AR014",
    material: "Alloy",
    price: 118,
    image: "/products/full-zircon-wedding-ring.png",
    weight: "15g",
    packaging: "20cm x 16cm x 5cm",
    note: "A dramatic paired ring presentation with deep black enamel contrast.",
    finish: "Gold and obsidian tone",
    stones: "Black enamel",
    collection: "Obsidian Statement",
  },
  {
    id: "full-zircon-wedding",
    category: "Rings",
    name: "Full Zircon Wedding Ring",
    sku: "C.R.0331",
    material: "Alloy, zircon",
    price: 108,
    image: "/products/pink-zircon-ring.png",
    weight: "15g",
    packaging: "20cm x 16cm x 5cm",
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
