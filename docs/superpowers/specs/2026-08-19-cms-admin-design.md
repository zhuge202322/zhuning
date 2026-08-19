# Muxcor VPS CMS Admin Design

**Status:** Approved by the project owner on 2026-08-19

## Goal

Turn the existing Next.js storefront and admin foundation into a VPS-ready CMS for the Muxcor B2C jewelry site. A single Super Admin must be able to manage the catalog, storefront settings, fixed page sections, uploaded media, customers, inquiry orders, and formal-order fields using SQLite and local VPS storage.

## Scope

### In scope

- Product category create, edit, delete, ordering, and image assignment.
- Product create, edit, delete, ordering, category assignment, SKU data, product gallery, and product media.
- Storefront settings: site name, logo, customer-service contact details, company address, and social links.
- Fixed page-section editing for the existing pages: homepage, About, Customization, Certifications, After-sales, Privacy, Returns, and product-detail editorial sections.
- Local media library with upload, metadata, replacement, reuse, reference protection, and deletion checks.
- Single Super Admin login and password change.
- Storefront customer management: profile, status, notes, order history, and account-related data.
- Inquiry orders plus formal-order fields reserved for payment and fulfillment integrations.
- SQLite schema and VPS deployment documentation, including upload and database backup guidance.

### Out of scope for this phase

- Multiple admin users or role-based permissions.
- Payment gateway integration.
- Automatic carrier or logistics API synchronization.
- Cloud object storage.
- A free-form page builder. Page sections remain predefined and typed.

## Architecture

The existing Next.js App Router application remains the single application for storefront and admin routes. Prisma remains the data access layer and SQLite remains the database. Server-rendered storefront pages read content through shared server helpers; empty or incomplete CMS records fall back to the current hard-coded defaults so a fresh deployment remains usable.

Uploaded files are stored below a configurable VPS upload root, defaulting to `public/uploads` for the current deployment shape. SQLite stores relative public URLs and metadata, not binary file contents. The upload service generates collision-resistant names, validates MIME type and size, and never accepts a client-provided path. Media deletion is refused while a product, page section, or site setting references the asset.

The existing cookie-based admin session remains HttpOnly and server-validated. The system contains one `AdminUser` row with the Super Admin account. Admin pages and admin APIs use the same session guard. Customer accounts remain separate from admin authentication and cannot access `/admin`.

## Data Model

### Existing models to preserve and complete

- `AdminUser`
- `Category`
- `Product`, `ProductImage`, `ProductSku`, `ProductSkuImage`
- `Customer`
- `Order`, `OrderItem`
- `SiteMedia`

### New or expanded models

#### `SiteSetting`

Key/value settings with a unique key and typed metadata where needed. Initial keys include `site.name`, `site.logo`, `support.email`, `support.phone`, `support.whatsapp`, `company.address`, `social.instagram`, `social.facebook`, `social.tiktok`, and `social.youtube`.

#### `PageSection`

`pageKey`, `sectionKey`, `sectionType`, `title`, `eyebrow`, `body`, `buttonLabel`, `buttonHref`, `mediaUrl`, `mediaAlt`, `sortOrder`, and `enabled`. The `(pageKey, sectionKey)` pair is unique. A section may contain one primary media URL and structured JSON for section-specific fields where the existing design requires more than one image.

#### `MediaAsset`

Original name, generated file name, relative URL, MIME type, byte size, width, height, duration where applicable, alt text, and timestamps. References are represented through explicit product/page/settings relationships or a safe reference scan before deletion.

#### Formal-order fields

Extend `Order` with optional shipping recipient, phone, country, address lines, postal code, payment method, payment reference, shipping carrier, tracking number, shipped/completed timestamps, and an order type distinguishing inquiry from formal order. Existing inquiry records remain valid with defaults.

## Admin Modules

- **Dashboard:** counts and recent inquiry/order activity.
- **Products:** full catalog CRUD, images, SKUs, category assignment, ordering, publish/featured state.
- **Categories:** full CRUD, image, ordering, product count.
- **Orders:** inquiry and formal order list/detail, customer details, item lines, status transitions, payment and fulfillment fields, notes.
- **Customers:** customer profile, status, notes, order history, and account activity summary.
- **Pages:** page selector and predefined section editor for all current storefront pages.
- **Site Settings:** grouped brand, support, company, and social settings.
- **Media Library:** upload, browse, search, replace, copy URL, and reference-aware delete.
- **Admin Account:** change Super Admin password and show account status.

## Order Lifecycle

New inquiry-cart submissions create an order with `orderType = INQUIRY` and `status = PENDING_INQUIRY`. The admin can move it through `CONTACTED`, `QUOTED`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `COMPLETED`, or `CANCELLED`. Payment and fulfillment fields remain optional until a formal order is created or an inquiry is converted. Status updates are validated server-side and recorded with timestamps where appropriate.

## Content Fallback Rules

The current default content in `src/data/company.ts`, page components, and media maps becomes the fallback layer. CMS data overrides only fields that are present and enabled. This prevents blank pages during migration and allows the administrator to gradually replace hard-coded content. Once all sections are seeded, the admin can manage the site without source-code edits.

## Security and Operations

- Hash passwords with the existing bcrypt implementation.
- Use HttpOnly, SameSite cookies and Secure cookies in production.
- Validate all admin API input with explicit schemas and enforce admin auth in every mutating route.
- Restrict uploads by MIME allowlist, extension normalization, size limits, and generated names.
- Prevent path traversal and disallow arbitrary filesystem paths from requests.
- Refuse deletion of referenced media and return the referencing records.
- Add SQLite and uploads backup/restore instructions for the VPS.
- Keep secrets and `DATABASE_URL` in environment variables; do not commit production credentials.

## Verification

- Prisma schema push and client generation succeed on a clean environment.
- TypeScript build succeeds.
- Admin auth blocks anonymous access and allows the single Super Admin to log in and change the password.
- CRUD tests cover categories, products, settings, sections, media references, customers, and order updates.
- Storefront smoke tests confirm database content overrides defaults and fallback content remains available.
- Upload tests confirm valid files are stored, invalid files are rejected, and referenced files cannot be deleted.
- VPS deployment notes cover persistent `uploads/`, SQLite backup, process manager, reverse proxy, and environment variables.
