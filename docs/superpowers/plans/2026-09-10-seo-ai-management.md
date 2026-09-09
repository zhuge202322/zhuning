# SEO 与 AI SEO 管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为英文 B2C 奢侈品商城增加完整 SEO 输出，并在中文后台提供可配置、加密存储、可审核的 OpenAI 兼容 AI SEO 优化功能。

**Architecture:** 使用 Prisma 新增 `AiProviderConfig` 和 `SeoMeta` 两张 SQLite 表。AI 配置服务端保存，API key 使用 `ADMIN_JWT_SECRET` 派生的 AES-256-GCM 加密；AI 生成接口只返回待审核草稿，SEO 内容通过管理员保存接口发布。Next.js App Router 的动态 metadata、JSON-LD、robots 和 sitemap 从统一 SEO reader 读取数据库内容并使用 fallback。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript strict、Prisma 6、SQLite、Node Web Crypto API、现有 `requireAdmin` 鉴权、现有 Tailwind/CSS 后台界面。

**Spec:** `docs/superpowers/specs/2026-09-10-seo-ai-design.md`

## Global Constraints

- API key 不得写入源码、Git 历史、浏览器响应、URL、异常堆栈或普通日志。
- API key 必须使用 `ADMIN_JWT_SECRET` 派生 AES-256-GCM 密钥加密保存；缺少 secret 时拒绝保存和调用。
- 前台和 SEO 内容使用英文，后台界面使用中文。
- AI 草稿不自动覆盖已保存 SEO 内容；批量请求最多处理 20 项。
- AI endpoint 只允许 HTTPS，服务端请求必须设置超时、响应大小限制和固定 JSON 请求格式。
- 所有后台接口必须先调用现有 `requireAdmin` 并复用统一 JSON 错误响应。
- 保留现有未提交的 `src/app/storefront.css` Bags 图片修复和未跟踪 `.superpowers/`，SEO 提交不得包含它们。

---

### Task 1: SQLite Schema And SEO/AI Core Types

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260910000100_add_seo_ai_management/migration.sql`
- Modify: `src/lib/cms-types.ts`
- Create: `src/lib/seo-types.ts`

**Interfaces:**
- Produces `AiProviderConfig` Prisma model with one-row configuration fields `endpoint`, `model`, `encryptedApiKey`, `keyHint`, `enabled`, timestamps.
- Produces `SeoMeta` Prisma model with unique `targetType + targetKey`, fields `title`, `description`, `keywords`, `canonicalUrl`, `ogImage`, `robots`, timestamps.
- Produces `SeoTargetType = "SITE" | "PAGE" | "PRODUCT" | "CATEGORY" | "POST"` and typed SEO payloads used by later tasks.

- [ ] **Step 1: Write the failing schema contract test**

Create `tests/unit/seo-schema.mjs` that reads the Prisma schema as text and asserts the two model names, unique constraint, target type fields, and encrypted key field exist. This test should fail before the schema changes.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("schema contains encrypted AI configuration and SEO metadata models", async () => {
  const schema = await readFile("prisma/schema.prisma", "utf8");
  assert.match(schema, /model AiProviderConfig/);
  assert.match(schema, /encryptedApiKey\s+String/);
  assert.match(schema, /model SeoMeta/);
  assert.match(schema, /@@unique\(\[targetType, targetKey\]\)/);
});
```

- [ ] **Step 2: Run the contract test and verify the expected failure**

Run: `node --test tests/unit/seo-schema.mjs`

Expected: FAIL because the models are not present yet.

- [ ] **Step 3: Add Prisma models and SQL migration**

Add the models with indexes for target type, target key, and update time. Add the migration SQL for SQLite with the same columns, defaults, unique index, and timestamp behavior used by existing migrations. Do not add a real API key or default encrypted value.

- [ ] **Step 4: Add shared SEO types**

Define the target union and the API shapes in `src/lib/seo-types.ts`, including `SeoDraft`, `SeoRecord`, `AiConfigPublic`, `AiGenerateInput`, and `AiGenerateResult`. Keep `encryptedApiKey` and decrypted key out of all public types.

- [ ] **Step 5: Generate Prisma client and run the schema test**

Run: `pnpm exec prisma generate; node --test tests/unit/seo-schema.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260910000100_add_seo_ai_management/migration.sql src/lib/cms-types.ts src/lib/seo-types.ts tests/unit/seo-schema.mjs
git commit -m "feat: add SEO and AI configuration schema"
```

### Task 2: Encryption, Validation And AI Client Core

**Files:**
- Create: `src/lib/ai-seo-core.mjs`
- Create: `src/lib/ai-seo.ts`
- Create: `src/lib/seo-core.mjs`
- Test: `tests/unit/ai-seo.mjs`
- Test: `tests/unit/seo-core.mjs`

**Interfaces:**
- `encryptApiKey(apiKey, secret, randomBytes?) -> string`
- `decryptApiKey(ciphertext, secret) -> string`
- `maskApiKey(apiKey) -> string`
- `validateAiConfig(input) -> { ok: true, value } | { ok: false, error }`
- `parseAiSeoResponse(text) -> { ok: true, draft } | { ok: false, error }`
- `buildSeoFallback(input) -> SeoDraft`
- `buildCanonicalUrl(siteUrl, pathname) -> string`

- [ ] **Step 1: Write failing encryption and parser tests**

Cover round-trip encryption, wrong-secret rejection, masked output without the original value, HTTPS endpoint validation, JSON fenced-block parsing, missing fields, overlong title/description, and unsafe `ogImage` URL rejection. Use deterministic injected random bytes only for the encryption test; do not mock the production parser.

```js
test("encrypts and decrypts an API key without exposing it in the ciphertext", async () => {
  const encrypted = encryptApiKey("sk-test-value", "long-admin-secret");
  assert.notEqual(encrypted, "sk-test-value");
  assert.equal(decryptApiKey(encrypted, "long-admin-secret"), "sk-test-value");
  assert.throws(() => decryptApiKey(encrypted, "wrong-secret"));
});

test("parses a JSON fenced block and validates SEO lengths", () => {
  const result = parseAiSeoResponse("```json\n{\"title\":\"Luxury ring\",\"description\":\"A refined ring for wholesale buyers.\",\"keywords\":[\"ring\",\"luxury jewelry\"]}\n```");
  assert.equal(result.ok, true);
  assert.deepEqual(result.draft.keywords, ["ring", "luxury jewelry"]);
});
```

- [ ] **Step 2: Run the tests and verify they fail for missing functions**

Run: `node --test tests/unit/ai-seo.mjs tests/unit/seo-core.mjs`

Expected: FAIL because the core modules do not exist.

- [ ] **Step 3: Implement encryption and input validation**

Use `node:crypto` `createCipheriv`/`createDecipheriv` with a 32-byte SHA-256 derived key, random 12-byte nonce, auth tag, and a versioned base64url payload. Reject empty secrets and API keys that exceed the configured length. Accept only `https:` endpoints and local absolute media paths or `https:` media URLs.

- [ ] **Step 4: Implement AI response parsing**

Extract the first valid JSON object from plain text or a fenced block. Require string title and description, normalize keyword strings/arrays to a maximum of 12 trimmed keywords, reject unknown output structures, cap title at 70 characters and description at 170 characters, and drop an invalid optional `ogImage` rather than accepting an unsafe URL.

- [ ] **Step 5: Implement SEO fallback and canonical helpers**

Create deterministic fallbacks from the target name, category and description. Normalize site URL without a trailing slash, resolve only absolute paths, and return a stable canonical URL without query strings for public content.

- [ ] **Step 6: Run tests and commit**

Run: `node --test tests/unit/ai-seo.mjs tests/unit/seo-core.mjs`

Expected: all tests PASS.

```bash
git add src/lib/ai-seo-core.mjs src/lib/ai-seo.ts src/lib/seo-core.mjs tests/unit/ai-seo.mjs tests/unit/seo-core.mjs
git commit -m "feat: add encrypted AI SEO core services"
```

### Task 3: Server-Side Configuration, SEO Persistence And AI Generation APIs

**Files:**
- Create: `src/lib/seo.ts`
- Create: `src/lib/ai-seo-service.ts`
- Create: `src/app/api/admin/ai-seo/config/route.ts`
- Create: `src/app/api/admin/ai-seo/generate/route.ts`
- Create: `src/app/api/admin/seo/route.ts`
- Modify: `scripts/seed-cms.mjs`

**Interfaces:**
- `getAiConfigPublic() -> Promise<AiConfigPublic>`
- `saveAiConfig(input) -> Promise<AiConfigPublic>`
- `generateSeoDraft(target) -> Promise<SeoDraft>`
- `getSeoMeta(targetType, targetKey) -> Promise<SeoRecord | null>`
- `saveSeoMeta(input) -> Promise<SeoRecord>`

- [ ] **Step 1: Write failing service contract tests**

Add tests for saving a configuration without returning `encryptedApiKey`, preserving the old key when the replacement field is empty, rejecting a missing `ADMIN_JWT_SECRET`, selecting product/category/post/page source data, and refusing to save AI output before the explicit SEO PUT call.

- [ ] **Step 2: Run service tests and verify failure**

Run: `node --test tests/unit/ai-seo-service.mjs`

Expected: FAIL because service modules and routes are absent.

- [ ] **Step 3: Implement SEO repository functions**

Use Prisma upsert keyed by `targetType_targetKey` (or the generated compound selector name), normalize empty fields, and return fallback data when no record exists. Add `getSeoTargets(type, search)` with a maximum of 100 rows for the admin selector.

- [ ] **Step 4: Implement encrypted AI config service**

Read `AiProviderConfig` as a single row. On first save, accept `AI_API_ENDPOINT`, `AI_MODEL`, and `AI_API_KEY` only as server-side defaults; database values win afterward. Encrypt replacement keys, preserve the existing encrypted key when `apiKey` is empty, and return only public fields. Never log request bodies or the decrypted key.

- [ ] **Step 5: Implement server-side OpenAI-compatible generation**

Load and decrypt config, validate the target, build a bounded English prompt with product data inside a clearly delimited source block, call the configured endpoint with `Authorization: Bearer`, `Content-Type: application/json`, a 45-second `AbortController` timeout, and a response byte limit. Parse and validate the response, returning a draft only. For batch input, cap at 20 targets and process sequentially with per-item error results.

- [ ] **Step 6: Add authenticated route handlers**

Use `requireAdmin` and `parseJsonObject`. `GET/PUT /api/admin/ai-seo/config` reads/saves public config. `POST /api/admin/ai-seo/generate` accepts one target or a batch plus `overwrite`, but never persists drafts. `GET/PUT /api/admin/seo` reads/saves reviewed records and validates target existence, canonical URL, media URL, robots values, and text lengths.

- [ ] **Step 7: Seed global SEO setting defaults**

Extend the existing SEO settings registry and seed fallback with `seo.siteTitle`, `seo.defaultDescription`, `seo.defaultKeywords`, `seo.siteUrl`, `seo.defaultOgImage`, and `seo.twitterHandle`, grouped under `seo`. Keep the existing settings API validation rules and add URL/media validation for the new fields.

- [ ] **Step 8: Run type checking, route tests and commit**

Run: `npx tsc --noEmit; node --test tests/unit/ai-seo.mjs tests/unit/seo-core.mjs tests/unit/ai-seo-service.mjs`

Expected: TypeScript and all unit tests PASS.

```bash
git add src/lib/seo.ts src/lib/ai-seo-service.ts src/app/api/admin/ai-seo src/app/api/admin/seo scripts/seed-cms.mjs tests/unit/ai-seo-service.mjs
git commit -m "feat: add authenticated AI SEO APIs"
```

### Task 4: Public Metadata, JSON-LD, Robots And Sitemap

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/products/page.tsx`
- Modify: `src/app/products/[id]/page.tsx`
- Modify: `src/app/about/page.tsx`
- Modify: `src/app/customization/page.tsx`
- Modify: `src/app/certifications/page.tsx`
- Modify: `src/app/after-sales/page.tsx`
- Modify: `src/app/policies/privacy/page.tsx`
- Modify: `src/app/policies/returns/page.tsx`
- Create: `src/app/robots.ts`
- Create: `src/app/sitemap.ts`
- Create: `src/components/ProductJsonLd.tsx`
- Test: `tests/unit/public-seo.mjs`

**Interfaces:**
- `buildSiteMetadata(settings, pathname, seo) -> Metadata`
- `buildProductJsonLd(product, canonicalUrl) -> object`
- `buildSitemapEntries(siteUrl, products, categories, posts) -> MetadataRoute.Sitemap`

- [ ] **Step 1: Write failing public SEO tests**

Test canonical URL normalization, filtered product list `noindex,follow`, product JSON-LD fields (`@type`, `name`, `image`, `offers`), and sitemap exclusion of `/admin`, `/account`, `/inquiry-cart`, query URLs, and pagination URLs.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test tests/unit/public-seo.mjs`

Expected: FAIL because public SEO helper modules are absent.

- [ ] **Step 3: Implement public SEO helpers**

Use `getSiteSettings` and `getSeoMeta` in dynamic metadata functions. Create `metadataBase`, Open Graph, Twitter Card, canonical, and robots values from validated data. Keep filters and page parameters out of canonical URLs and set filtered/paginated product lists to `noindex,follow`.

- [ ] **Step 4: Implement product structured data**

Render JSON-LD from product name, images, description, SKU, price and currency. Serialize with `JSON.stringify` and escape `<` before rendering. Do not include internal database IDs or admin values.

- [ ] **Step 5: Implement robots and sitemap**

`robots.ts` allows public paths and disallows `/admin`, `/api`, `/account`, `/inquiry-cart` and query-based duplicate URLs. `sitemap.ts` loads public products, categories and posts, adds static pages, and uses only canonical URLs.

- [ ] **Step 6: Update pages and run verification**

Replace static page metadata where needed with `generateMetadata`, preserve existing page rendering, and add product-detail JSON-LD. Run the helper tests, `npx tsc --noEmit`, and a production build.

```bash
git add src/app/layout.tsx src/app/page.tsx src/app/products src/app/about/page.tsx src/app/customization/page.tsx src/app/certifications/page.tsx src/app/after-sales/page.tsx src/app/policies src/app/robots.ts src/app/sitemap.ts src/components/ProductJsonLd.tsx tests/unit/public-seo.mjs
git commit -m "feat: add public metadata and structured SEO"
```

### Task 5: Chinese Admin AI SEO Interface

**Files:**
- Modify: `src/components/admin/AdminShell.tsx`
- Create: `src/app/admin/ai-seo/page.tsx`
- Create: `src/components/admin/AiSeoManager.tsx`
- Modify: `src/components/admin/SettingsEditor.tsx`
- Modify: `src/components/admin/admin-labels.ts`

**Interfaces:**
- `AiSeoManager` calls the three admin APIs and keeps config, selector state, draft state, and save state separate.
- The component exposes no decrypted key in React state after a successful config save or reload.

- [ ] **Step 1: Write the UI behavior checklist as tests**

Add a DOM-level test or focused component test for: Chinese menu label, password input, masked configured-key status, generate-draft button, editable title/description/keywords, explicit save button, batch maximum message, and error rendering. The test must fail before the page/menu exists.

- [ ] **Step 2: Implement navigation and page shell**

Add `AI SEO 优化` to the Chinese admin navigation and create a protected page using the existing admin layout. Use existing button and panel styles, with visible contrast for all controls.

- [ ] **Step 3: Implement provider configuration panel**

Load public config on mount. Use a password input for the API key; never fill it from the GET response. Save endpoint/model/enabled and only send a non-empty key when the admin intends to replace it. Display “已配置（末四位：****）” using the server-provided hint.

- [ ] **Step 4: Implement target selection and draft editor**

Load products, categories, posts and static page options from authenticated server data. Let the admin choose one item, generate a draft, edit all SEO fields, then explicitly save to `/api/admin/seo`. Add an overwrite checkbox for existing records.

- [ ] **Step 5: Implement batch generation results**

Allow selecting up to 20 targets, call the batch generate endpoint, and render success/skip/failure per item. Do not automatically save returned drafts; each result requires explicit review/save.

- [ ] **Step 6: Add SEO settings labels and run UI checks**

Add Chinese labels for the SEO settings group and fields. Verify keyboard focus, disabled/loading states, errors, configured-key masking, and no key string in the rendered DOM or network response.

```bash
git add src/components/admin/AdminShell.tsx src/app/admin/ai-seo/page.tsx src/components/admin/AiSeoManager.tsx src/components/admin/SettingsEditor.tsx src/components/admin/admin-labels.ts
git commit -m "feat: add Chinese AI SEO admin manager"
```

### Task 6: Product/Category/Post SEO Editing Integration

**Files:**
- Modify: `src/components/admin/ProductForm.tsx`
- Modify: `src/app/admin/products/[id]/page.tsx`
- Modify: `src/app/admin/categories/page.tsx`
- Modify: `src/components/admin/CategoriesManager.tsx`
- Modify: `src/components/admin/PostForm.tsx`
- Modify: `src/app/admin/posts/[id]/page.tsx`
- Modify: `src/components/admin/PageSectionsEditor.tsx`

**Interfaces:**
- Existing forms continue saving their domain data; SEO fields save through `/api/admin/seo` using the stable target key.
- Product target key is product slug, category target key is category slug, post target key is post slug, static page target key is the registered page key.

- [ ] **Step 1: Add failing integration assertions**

Test that product/category/post edit surfaces expose SEO title, description, keywords, canonical, OG image and robots values; saving these values does not change the domain record payload.

- [ ] **Step 2: Add reusable SEO editor fields**

Create a small client component inside `src/components/admin` for loading and saving one `SeoMeta` record, with character counts and the same image picker used by existing settings. Keep all labels Chinese.

- [ ] **Step 3: Mount editor in existing forms**

Pass the stable target into the editor from server pages. Preserve existing form submit behavior and show independent SEO save status so a failed SEO save does not discard a successfully saved product/category/post.

- [ ] **Step 4: Run type checks and integration tests**

Run: `npx tsc --noEmit; node --test tests/unit/seo-core.mjs tests/unit/public-seo.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ProductForm.tsx src/app/admin/products src/app/admin/categories src/components/admin/CategoriesManager.tsx src/components/admin/PostForm.tsx src/app/admin/posts src/components/admin/PageSectionsEditor.tsx
git commit -m "feat: add editable SEO fields to admin content"
```

### Task 7: End-To-End Verification And Deployment Notes

**Files:**
- Modify: `.env.example`
- Create: `docs/seo-ai-vps-deployment.md`
- Test: `tests/unit/*.mjs`

- [ ] **Step 1: Add safe deployment configuration documentation**

Document `ADMIN_JWT_SECRET`, `SITE_URL`, optional `AI_API_ENDPOINT`, `AI_MODEL`, and optional `AI_API_KEY` bootstrap variables. Explicitly state that the real key must be entered through the VPS environment or protected admin panel, never committed.

- [ ] **Step 2: Run complete automated verification**

Run:

```powershell
npx tsc --noEmit
node --test tests/unit/seo-schema.mjs tests/unit/ai-seo.mjs tests/unit/seo-core.mjs tests/unit/ai-seo-service.mjs tests/unit/public-seo.mjs
git diff --check
pnpm exec next build
```

Expected: all tests pass, TypeScript passes, diff check passes, and production build completes. Existing middleware/NFT tracing warnings may remain; no new error may appear.

- [ ] **Step 3: Verify live local behavior**

With the dev server running, verify `/`, `/products`, `/products?category=bags`, one product detail, `/robots.txt`, and `/sitemap.xml`. Inspect title, description, canonical, OG tags, robots value, and product JSON-LD. Verify a filtered list is `noindex,follow`.

- [ ] **Step 4: Verify admin behavior without exposing secrets**

Log into `/admin/ai-seo`, save a non-secret configuration, enter a replacement API key, reload, and confirm only the masked hint is visible. Generate one draft, edit and save it, then confirm public metadata changes. Confirm browser DOM, API JSON and server log output contain no API key.

- [ ] **Step 5: Commit deployment notes and final review**

```bash
git add .env.example docs/seo-ai-vps-deployment.md
git commit -m "docs: add SEO AI VPS deployment notes"
```

Review `git status --short --branch` and ensure `.superpowers/` and the prior Bags CSS change remain outside SEO commits unless separately requested.
