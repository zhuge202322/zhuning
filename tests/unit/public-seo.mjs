import test from "node:test";
import assert from "node:assert/strict";
import { buildProductJsonLd, buildSitemapUrls, robotsForProductList } from "../../src/lib/public-seo-core.mjs";

test("builds Product JSON-LD with an Offer", () => {
  const data = buildProductJsonLd({
    name: "Ruby Ring",
    sku: "RG-001",
    note: "A ruby statement ring.",
    images: ["/products/ruby.webp"],
    price: 12.5,
  }, "https://example.com/products/ruby-ring", "https://example.com");
  assert.equal(data["@type"], "Product");
  assert.equal(data.name, "Ruby Ring");
  assert.equal(data.sku, "RG-001");
  assert.deepEqual(data.image, ["https://example.com/products/ruby.webp"]);
  assert.equal(data.offers["@type"], "Offer");
  assert.equal(data.offers.price, "12.50");
  assert.equal(data.offers.url, "https://example.com/products/ruby-ring");
});

test("marks filtered and paginated product lists noindex,follow", () => {
  assert.equal(robotsForProductList({ category: "rings" }), "index,follow");
  assert.equal(robotsForProductList({ category: "rings", min: "10" }), "noindex,follow");
  assert.equal(robotsForProductList({ page: "2" }), "noindex,follow");
  assert.equal(robotsForProductList({ sort: "price-low" }), "noindex,follow");
});

test("builds a canonical-only sitemap and excludes private paths", () => {
  const urls = buildSitemapUrls("https://example.com", [
    "/",
    "/products",
    "/products/ruby-ring",
    "/products?page=2",
    "/admin",
    "/account",
    "/inquiry-cart",
    "/api/admin/seo",
  ]);
  assert.deepEqual(urls, [
    "https://example.com/",
    "https://example.com/products",
    "https://example.com/products/ruby-ring",
  ]);
});
