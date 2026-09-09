import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("content editors mount the reusable reviewed SEO editor", async () => {
  const files = [
    "src/components/admin/ProductForm.tsx",
    "src/components/admin/CategoriesManager.tsx",
    "src/components/admin/PostForm.tsx",
    "src/components/admin/PageSectionsEditor.tsx",
  ];
  const sources = await Promise.all(files.map((file) => readFile(file, "utf8")));
  for (const source of sources) assert.match(source, /SeoEditor/);
  assert.match(sources[0], /targetType=.PRODUCT./);
  assert.match(sources[1], /targetType=.CATEGORY./);
  assert.match(sources[2], /targetType=.POST./);
  assert.match(sources[3], /targetType=.PAGE./);
});

test("SEO editor keeps reviewed content independent from domain form submission", async () => {
  const source = await readFile("src/components/admin/SeoEditor.tsx", "utf8");
  assert.match(source, /\/api\/admin\/seo/);
  assert.match(source, /targetType/);
  assert.match(source, /targetKey/);
  assert.match(source, /保存 SEO/);
  assert.match(source, /robots/);
  assert.match(source, /canonicalUrl/);
});
