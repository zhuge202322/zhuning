import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("all products label is an editable storefront setting", async () => {
  const registry = await readFile("src/lib/cms-registry-core.mjs", "utf8");
  const fallback = await readFile("scripts/seed-cms.mjs", "utf8");
  const settingsEditor = await readFile("src/components/admin/SettingsEditor.tsx", "utf8");
  const productPage = await readFile("src/app/products/page.tsx", "utf8");

  assert.match(registry, /storefront\.allProductsLabel/);
  assert.match(fallback, /storefront\.allProductsLabel/);
  assert.match(settingsEditor, /storefront\.allProductsLabel/);
  assert.match(productPage, /allProductsLabel/);
});

test("storefront navigation uses Products and removes Women's Bags", async () => {
  const source = await readFile("src/components/SiteChrome.tsx", "utf8");
  assert.match(source, /href: "\/products", label: "Products"/);
  assert.doesNotMatch(source, /href: "\/collections\/womens-bags"/);
});

test("product sidebar renders a collapsed category tree", async () => {
  const source = await readFile("src/components/ProductListView.tsx", "utf8");
  assert.match(source, /<details/);
  assert.match(source, /summary/);
  assert.doesNotMatch(source, /flatCategories\.map/);
});

test("page media replacement is wired into the public homepage", async () => {
  const page = await readFile("src/app/page.tsx", "utf8");
  const storefront = await readFile("src/components/LuxuryStorefront.tsx", "utf8");
  const editor = await readFile("src/components/admin/PageSectionsEditor.tsx", "utf8");

  assert.match(page, /getPageSection/);
  assert.match(storefront, /heroSlides.*prop|heroSlides\?/s);
  assert.match(editor, /页面板块已保存/);
});

test("AI SEO manager explains the workflow in Chinese", async () => {
  const source = await readFile("src/components/admin/AiSeoManager.tsx", "utf8");
  assert.match(source, /使用说明/);
  assert.match(source, /选择内容/);
  assert.match(source, /审核/);
});
