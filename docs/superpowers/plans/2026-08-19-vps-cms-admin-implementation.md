# VPS CMS Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Muxcor Next.js admin and storefront so one Super Admin can manage SQLite-backed catalog, settings, fixed page sections, local VPS media, customers, inquiry orders, and formal-order fields.

**Architecture:** Extend the existing Prisma SQLite schema and preserve current fallback content. Add shared server-side CMS readers and authenticated admin APIs, then replace hard-coded storefront values section by section. Store uploaded media under a configurable VPS `uploads/` directory and persist only safe relative URLs plus metadata in SQLite.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 6, SQLite, bcryptjs, existing cookie/JWT auth, existing Tailwind admin UI, existing Next.js storefront CSS, Node.js VPS process.

---

## File Map

- Modify: `prisma/schema.prisma` for settings, sections, media assets, customer auth fields, and formal-order fields.
- Create: `prisma/migrations/<timestamp>_cms_admin/` through `pnpm prisma migrate dev` or the repository's SQLite migration workflow; never hand-edit generated SQL without checking it.
- Modify: `src/lib/auth.ts`, `src/middleware.ts`, `src/app/api/admin/login/route.ts`, `src/app/api/admin/change-password/route.ts` for single-Super-Admin guarantees and consistent guards.
- Create: `src/lib/admin-guard.ts`, `src/lib/input-validation.ts`, `src/lib/media-storage.ts`, `src/lib/site-settings.ts`, `src/lib/page-sections.ts`.
- Create: `src/app/api/admin/settings/route.ts`, `src/app/api/admin/sections/route.ts`, `src/app/api/admin/sections/[id]/route.ts`, `src/app/api/admin/media/assets/route.ts`, `src/app/api/admin/media/assets/[id]/route.ts`.
- Create: `src/app/admin/settings/page.tsx`, `src/app/admin/pages/page.tsx`, `src/app/admin/media-library/page.tsx` and focused client components under `src/components/admin/`.
- Modify: `src/app/admin/layout.tsx`, `src/components/admin/AdminShell.tsx`, dashboard, customer, and order pages to expose the completed modules.
- Modify: `src/app/api/inquiries/route.ts` and `src/lib/storefront-data.ts` to use validated order types and CMS fallbacks.
- Modify: `src/app/page.tsx`, `src/app/about/page.tsx`, `src/app/customization/page.tsx`, `src/app/certifications/page.tsx`, `src/app/after-sales/page.tsx`, `src/app/policies/privacy/page.tsx`, `src/app/policies/returns/page.tsx`, `src/components/SiteChrome.tsx`, and related storefront helpers to read database overrides.
- Create: `scripts/seed-cms.mjs`, `scripts/backup-vps-data.ps1`, `docs/deployment/vps.md`.
- Create: `tests/unit/`, `tests/api/`, and `tests/smoke/` using focused Node tests. The repository currently has no automated test harness, so use Node's built-in test runner and small JavaScript fixtures without adding a browser dependency for server contracts.

## Task 1: Establish the SQLite schema and seed contract

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `scripts/seed-cms.mjs`
- Create: `src/lib/cms-types.ts`
- Test: `tests/unit/cms-schema-contract.mjs`

- [ ] **Step 1: Write the schema contract test**

Create a Node test that imports Prisma's generated client against a temporary SQLite database and asserts that the following records can be created and read: `SiteSetting`, `PageSection`, `MediaAsset`, an inquiry `Order`, and a formal-order-shaped `Order` with shipping/payment fields. The test must also assert that `(pageKey, sectionKey)` is unique and that the one-admin seed is idempotent.

- [ ] **Step 2: Run the contract test before implementation**

Run:

```powershell
node --test tests/unit/cms-schema-contract.mjs
```

Expected result: FAIL because the new Prisma models and fields do not yet exist.

- [ ] **Step 3: Extend the Prisma schema**

Add:

```prisma
model SiteSetting {
  id        Int      @id @default(autoincrement())
  key       String   @unique
  value     String   @default("")
  type      String   @default("text")
  group     String   @default("general")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model PageSection {
  id          Int      @id @default(autoincrement())
  pageKey     String
  sectionKey  String
  sectionType String   @default("text-media")
  eyebrow     String   @default("")
  title       String   @default("")
  body        String   @default("")
  buttonLabel String   @default("")
  buttonHref  String   @default("")
  mediaUrl    String   @default("")
  mediaAlt    String   @default("")
  dataJson    String   @default("{}")
  sortOrder   Int      @default(0)
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([pageKey, sectionKey])
  @@index([pageKey, sortOrder])
}

model MediaAsset {
  id           Int      @id @default(autoincrement())
  originalName String
  fileName     String   @unique
  url          String   @unique
  mimeType     String
  byteSize     Int
  width        Int?
  height       Int?
  durationMs   Int?
  alt          String   @default("")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

Add `orderType String @default("INQUIRY")`, shipping fields, payment fields, logistics fields, and nullable lifecycle timestamps to `Order`, with defaults preserving current inquiry rows. Extend `Customer` with `passwordHash String?`, `marketingOptIn Boolean @default(false)`, `lastLoginAt DateTime?`, and `disabledAt DateTime?`. Customer passwords and sessions remain completely separate from `AdminUser`.

- [ ] **Step 4: Generate and apply the SQLite migration**

Run:

```powershell
pnpm prisma format
pnpm prisma migrate dev --name cms_admin_foundation
pnpm prisma generate
```

Expected result: migration succeeds and `prisma/dev.db` contains the new tables/columns without deleting existing products, categories, customers, or orders.

- [ ] **Step 5: Implement idempotent CMS seed data**

Seed the approved setting keys and predefined section keys from current defaults. Use `upsert`, never `create`, so repeated deployment runs do not duplicate rows. Do not overwrite non-empty administrator edits. Seed one Super Admin only when no admin exists and read credentials from `ADMIN_USERNAME` and `ADMIN_PASSWORD` during first setup.

- [ ] **Step 6: Run the contract test after implementation**

Run the same Node test and a data-preservation check:

```powershell
node --test tests/unit/cms-schema-contract.mjs
node scripts/seed-cms.mjs
node scripts/seed-cms.mjs
```

Expected result: PASS, identical row counts after the second seed, and existing catalog rows preserved.

- [ ] **Step 7: Commit the foundation**

```powershell
git add prisma src/lib/cms-types.ts scripts/seed-cms.mjs tests/unit/cms-schema-contract.mjs
git commit -m "feat: add sqlite cms foundation"
```

## Task 2: Harden the single Super Admin boundary

**Files:**
- Create: `src/lib/admin-guard.ts`
- Create: `src/lib/input-validation.ts`
- Modify: `src/lib/auth.ts`
- Modify: `src/middleware.ts`
- Modify: `src/app/api/admin/login/route.ts`
- Modify: `src/app/api/admin/change-password/route.ts`
- Modify: `src/app/api/admin/logout/route.ts`
- Modify: `src/app/api/admin/categories/route.ts`
- Modify: `src/app/api/admin/categories/[id]/route.ts`
- Modify: `src/app/api/admin/media/route.ts`
- Modify: `src/app/api/admin/posts/route.ts`
- Modify: `src/app/api/admin/posts/[id]/route.ts`
- Modify: `src/app/api/admin/products/route.ts`
- Modify: `src/app/api/admin/products/[id]/route.ts`
- Modify: `src/app/api/admin/upload/route.ts`
- Test: `tests/unit/admin-guard.mjs`

- [ ] **Step 1: Write failing guard tests**

Cover anonymous requests, malformed cookies, a valid admin cookie, a valid customer cookie, and a database containing a second admin row. Expected behavior is anonymous/customer rejection, valid Super Admin acceptance, and startup/seed failure if more than one admin exists.

- [ ] **Step 2: Implement one shared server guard**

Expose `requireAdmin(request)` and `requireAdminUser()` returning the authenticated admin or throwing/returning a 401 response. Ensure every write API calls the guard before parsing or mutating request data. Use `bcryptjs` for password changes and reject a new password shorter than 12 characters.

- [ ] **Step 3: Normalize validation helpers**

Add explicit validators for IDs, URLs, slugs, enumerated statuses, order fields, and upload metadata. Return consistent `{ error: string }` JSON responses with 400/401/403/404/409 status codes.

- [ ] **Step 4: Run guard tests and build type-checking**

```powershell
node --test tests/unit/admin-guard.mjs
pnpm exec tsc --noEmit
```

Expected result: PASS and no new TypeScript errors.

- [ ] **Step 5: Commit the auth boundary**

```powershell
git add src/lib src/middleware.ts src/app/api/admin tests/unit/admin-guard.mjs
git commit -m "feat: harden single super admin auth"
```

## Task 3: Add site settings and fixed page-section CMS

**Files:**
- Create: `src/lib/site-settings.ts`
- Create: `src/lib/page-sections.ts`
- Create: `src/app/api/admin/settings/route.ts`
- Create: `src/app/api/admin/sections/route.ts`
- Create: `src/app/api/admin/sections/[id]/route.ts`
- Create: `src/app/admin/settings/page.tsx`
- Create: `src/app/admin/pages/page.tsx`
- Create: `src/components/admin/SiteSettingsForm.tsx`
- Create: `src/components/admin/PageSectionManager.tsx`
- Modify: `src/components/admin/AdminShell.tsx`
- Test: `tests/api/cms-settings-sections.mjs`

- [ ] **Step 1: Write API contract tests**

Test that an authenticated Super Admin can read and update grouped settings, update a predefined section, reorder sections, and disable a section. Test that anonymous writes are rejected and unknown page/section keys are rejected.

- [ ] **Step 2: Implement settings readers with fallback defaults**

Expose `getSiteSettings()` and `getSiteSetting(key)` that merge SQLite values over defaults from `src/data/company.ts`. Empty database values must not erase non-empty defaults unless an explicit setting is marked as intentionally blank.

- [ ] **Step 3: Implement section registry and readers**

Create a typed registry for each current page and its allowed section keys. Expose `getPageSections(pageKey)` and `getPageSection(pageKey, sectionKey)`, merging database overrides over current component defaults and rejecting unknown keys in admin APIs.

- [ ] **Step 4: Implement authenticated settings and section APIs**

Use upsert for settings, update only registered sections, validate button URLs and media URLs, and return normalized records. Reordering must update only sections in the selected page.

- [ ] **Step 5: Build the admin screens**

Settings screen groups brand, support, company, and social fields. Pages screen has a page selector, fixed section list, enable toggle, text fields, media picker URL, button fields, and sort controls. Preserve existing admin visual conventions.

- [ ] **Step 6: Run API tests and verify the admin route manually**

```powershell
node --test tests/api/cms-settings-sections.mjs
pnpm exec tsc --noEmit
```

Expected result: authenticated CRUD passes, anonymous writes fail, and `/admin/settings` plus `/admin/pages` render without a framework error.

- [ ] **Step 7: Commit settings and sections**

```powershell
git add src/lib src/app/api/admin/settings src/app/api/admin/sections src/app/admin/settings src/app/admin/pages src/components/admin tests/api/cms-settings-sections.mjs
git commit -m "feat: add site settings and page sections cms"
```

## Task 4: Implement VPS-local media storage and library

**Files:**
- Create: `src/lib/media-storage.ts`
- Create: `src/app/api/admin/media/assets/route.ts`
- Create: `src/app/api/admin/media/assets/[id]/route.ts`
- Create: `src/app/admin/media-library/page.tsx`
- Create: `src/components/admin/MediaLibrary.tsx`
- Modify: `src/app/api/admin/upload/route.ts`
- Modify: existing product/category/media upload components
- Test: `tests/unit/media-storage.mjs`, `tests/api/media-assets.mjs`

- [ ] **Step 1: Write media storage tests**

Cover allowed JPEG/PNG/WebP/SVG/MP4 uploads, rejected executable/HTML uploads, maximum size rejection, generated filenames, path traversal attempts, metadata persistence, and deletion refusal for referenced URLs.

- [ ] **Step 2: Implement safe local storage**

Use `UPLOAD_DIR` with a default under `public/uploads`. Normalize the extension from the validated MIME type, generate a UUID filename, write with exclusive creation, and return a public URL plus metadata. Keep all resolved paths inside `UPLOAD_DIR`.

- [ ] **Step 3: Add MediaAsset APIs**

Implement multipart upload, list/search, metadata update, replacement, and reference-aware delete. The delete response must identify referencing products, sections, or settings instead of silently removing a file.

- [ ] **Step 4: Build the media library UI**

Show search, type filter, upload control, preview, alt text editing, copy URL action, replace action, and delete confirmation. Reuse the media picker from product and page-section editors.

- [ ] **Step 5: Verify storage and build**

```powershell
node --test tests/unit/media-storage.mjs tests/api/media-assets.mjs
pnpm exec tsc --noEmit
```

Expected result: all security/storage tests pass and the media library route renders.

- [ ] **Step 6: Commit media storage**

```powershell
git add src/lib/media-storage.ts src/app/api/admin/media src/app/api/admin/upload src/app/admin/media-library src/components/admin tests
git commit -m "feat: add local media library"
```

## Task 5: Complete customers and dual-track order management

**Files:**
- Modify: `prisma/schema.prisma` to finalize customer authentication indexes and order lifecycle indexes after the Task 1 migration
- Create: `src/lib/order-status.ts`
- Create: `src/lib/customer-auth.ts`
- Create: `src/app/api/account/register/route.ts`
- Create: `src/app/api/account/login/route.ts`
- Create: `src/app/api/account/logout/route.ts`
- Create: `src/app/api/account/session/route.ts`
- Create: `src/app/api/admin/customers/route.ts`
- Create: `src/app/api/admin/customers/[id]/route.ts`
- Create: `src/app/api/admin/orders/route.ts`
- Create: `src/app/api/admin/orders/[id]/route.ts`
- Create: `src/app/admin/orders/[id]/page.tsx`
- Create: `src/components/admin/CustomerEditor.tsx`
- Create: `src/components/admin/OrderEditor.tsx`
- Modify: `src/app/admin/customers/page.tsx`
- Modify: `src/app/admin/orders/page.tsx`
- Modify: `src/app/api/inquiries/route.ts`
- Modify: `src/components/AuthView.tsx`
- Modify: `src/components/AccountView.tsx`
- Test: `tests/api/customers-orders.mjs`
- Test: `tests/api/customer-auth.mjs`

- [ ] **Step 1: Write order lifecycle tests**

Test inquiry creation from the current cart payload, order item snapshots, customer upsert, status transition validation, conversion to formal order, shipping/payment/logistics fields, and rejection of invalid transitions or unauthenticated admin mutations.

- [ ] **Step 2: Implement shared status and order mapping**

Define the order type/status constants in one module. Map existing string statuses without breaking current data. Preserve product name, SKU, image, quantity, and price snapshots in `OrderItem`.

- [ ] **Step 3: Implement customer registration and login**

Register customers by normalized unique email, hash passwords with bcrypt, reject passwords shorter than 10 characters, and issue a customer-only HttpOnly session cookie. Login must reject disabled customers and update `lastLoginAt`. Session responses expose only customer profile fields. Logout clears only the customer cookie, never the admin cookie.

- [ ] **Step 4: Complete inquiry creation**

Validate customer name/email and line items, create or update the customer, create an `INQUIRY` order with `PENDING_INQUIRY`, and update customer aggregate counts in the same Prisma transaction. Never trust client-provided totals; derive totals from submitted line items or store zero when the flow is quote-based.

- [ ] **Step 5: Implement customer CRUD APIs and UI**

Allow the Super Admin to edit name, email, phone, status, notes, disable/enable access, and view order history. Do not expose customer password hashes or admin fields.

- [ ] **Step 6: Implement order list/detail APIs and UI**

Add filtering by type/status/customer, item details, status controls, customer data, notes, shipping fields, payment fields, carrier/tracking fields, and lifecycle timestamps. Validate all updates server-side.

- [ ] **Step 7: Connect the storefront account UI**

Submit the existing sign-in/register forms to the new account APIs, render validation errors and authenticated state, and load the signed-in customer's inquiry/formal order history into `AccountView`. Keep the local wishlist behavior unchanged in this phase.

- [ ] **Step 8: Run customer/order tests and type-check**

```powershell
node --test tests/api/customer-auth.mjs tests/api/customers-orders.mjs
pnpm exec tsc --noEmit
```

Expected result: customer auth, inquiry, and formal-order test cases pass without changing the existing storefront cart behavior.

- [ ] **Step 9: Commit customer/order management**

```powershell
git add prisma src/lib/order-status.ts src/lib/customer-auth.ts src/app/api/account src/app/api/admin/customers src/app/api/admin/orders src/app/api/inquiries src/app/admin/customers src/app/admin/orders src/components/AuthView.tsx src/components/AccountView.tsx src/components/admin tests
git commit -m "feat: complete customers and dual track orders"
```

## Task 6: Connect storefront to CMS overrides

**Files:**
- Modify: `src/components/SiteChrome.tsx`
- Modify: `src/lib/site-media.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/about/page.tsx`
- Modify: `src/app/customization/page.tsx`
- Modify: `src/app/certifications/page.tsx`
- Modify: `src/app/after-sales/page.tsx`
- Modify: `src/app/policies/privacy/page.tsx`
- Modify: `src/app/policies/returns/page.tsx`
- Modify: `src/components/LuxuryStorefront.tsx`
- Modify: `src/components/ProductDetailView.tsx`
- Test: `tests/smoke/storefront-cms-fallback.mjs`

- [ ] **Step 1: Write storefront fallback tests**

Test the server helpers with an empty CMS database and with one overridden setting/section. Assert that empty CMS data returns current defaults and populated data overrides only the matching field.

- [ ] **Step 2: Replace hard-coded global chrome values**

Read site name, logo, support links, company contact details, and social URLs from `getSiteSettings()`. Keep current defaults for every missing setting. Ensure all external links are validated before rendering.

- [ ] **Step 3: Replace page-level fixed sections**

For every page in the registry, use the typed section helper for editable title/body/button/media values while leaving structural markup and icon lists in code. Use `enabled` and `sortOrder` only where the existing page layout supports them without breaking the design.

- [ ] **Step 4: Verify product/detail media compatibility**

Keep direct static image serving enabled for existing WebP media. Ensure CMS-uploaded local URLs work in product cards, detail galleries, hero media, and page panels.

- [ ] **Step 5: Run smoke tests and production build**

```powershell
node --test tests/smoke/storefront-cms-fallback.mjs
pnpm exec next build
```

Expected result: all current public routes build and fallback content remains visible.

- [ ] **Step 6: Commit storefront integration**

```powershell
git add src/app src/components src/lib tests/smoke/storefront-cms-fallback.mjs
git commit -m "feat: connect storefront to cms content"
```

## Task 7: Deployment, backups, and end-to-end verification

**Files:**
- Create: `scripts/backup-vps-data.ps1`
- Create: `docs/deployment/vps.md`
- Modify: `.env.example`
- Modify: `package.json` scripts if backup/seed commands need package aliases
- Test: `tests/smoke/admin-storefront-e2e.mjs`

- [ ] **Step 1: Write the deployment smoke test**

Exercise the running app in this order: anonymous `/admin` redirect, Super Admin login, setting update, page section update, media upload, product image assignment, inquiry submission, order status update, and storefront render. Delete only test fixtures created by the test.

- [ ] **Step 2: Document VPS runtime requirements**

Document Node.js version, `DATABASE_URL=file:./prisma/dev.db`, `UPLOAD_DIR`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` for first bootstrap only, `SESSION_SECRET`, build/start commands, persistent volume requirements, PM2 or systemd, Nginx reverse proxy, SQLite WAL backup procedure, `uploads/` backup procedure, and permission ownership.

- [ ] **Step 3: Add backup script**

The script must create a timestamped backup directory, use SQLite's online backup or a consistent copy procedure, archive uploads, and retain a configurable number of backups. It must fail loudly when the database or upload directory is missing.

- [ ] **Step 4: Run the full verification set**

```powershell
node --test tests/unit/*.mjs tests/api/*.mjs tests/smoke/*.mjs
pnpm exec tsc --noEmit
pnpm run build
git diff --check
git status --short
```

Expected result: all tests pass, the production build exits 0, and only intentionally untracked local brainstorming artifacts remain.

- [ ] **Step 5: Commit deployment documentation and final verification**

```powershell
git add scripts/backup-vps-data.ps1 docs/deployment .env.example package.json tests/smoke/admin-storefront-e2e.mjs
git commit -m "docs: add vps deployment and cms verification"
```

- [ ] **Step 6: Push the completed implementation**

```powershell
git push origin main
```

## Plan Self-Review

- Catalog CRUD: Task 1 schema/seed plus existing product/category pages and Task 4 media picker integration.
- Site name, logo, contacts, social links: Tasks 1, 3, and 6.
- Every current page section: Tasks 1, 3, and 6.
- Local VPS media: Task 4 and Task 7.
- Single Super Admin and password change: Task 2.
- Customers and orders: Task 5.
- Inquiry plus formal-order fields: Tasks 1 and 5.
- SQLite/VPS operations: Tasks 1 and 7.
- Fallback behavior and verification: Tasks 3, 6, and 7.

No unresolved placeholders are required. The plan intentionally keeps payment and logistics integrations out of this phase while making their order fields and status transitions available.
