# Crimson Drop Luxury

Next.js B2C luxury jewelry storefront and admin system for rings and necklaces.

## Local Development

```bash
pnpm install
pnpm dev
```

The app runs locally on `http://127.0.0.1:6661`.

## Vercel Deployment

1. Import this GitHub repository in Vercel.
2. Use the default Next.js framework settings.
3. Add these environment variables:

```bash
DATABASE_URL=file:./dev.db
ADMIN_JWT_SECRET=replace-with-a-long-random-secret
ANALYTICS_IP_SECRET=replace-with-a-long-random-secret
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-strong-admin-password
```

The included SQLite database is enough for the storefront to display imported products on first deploy. For production-grade admin edits, orders, and customer data, move the database to a hosted provider such as Vercel Postgres, Neon, Supabase, or another managed database and update the Prisma datasource accordingly.

## Useful Commands

```bash
pnpm build
pnpm db:push
pnpm db:import-products
pnpm images:optimize
```

To import an additional product workbook tree, set `IMPORT_SOURCE_DIR` to the
directory containing the `.xlsx` files before running the importer. The importer
recursively reads workbooks, creates English folder categories and workbook
subcategories, extracts embedded images as WebP files, skips blank rows, and is
safe to run repeatedly. For example:

```powershell
$env:DATABASE_URL = "file:./dev.db"
$env:IMPORT_SOURCE_DIR = "D:/kehu/zhuning/独立站上品"
node scripts/import-products.mjs
```

## VPS Catalog Data Bundle

The imported catalog database and media are deployed separately from GitHub.
This keeps large binary media out of Git history and preserves the SQLite
database as a VPS-local file. Upload the catalog bundle to the VPS, extract it
from the application root, and restart the application:

```bash
unzip -o catalog-data-2026-09-06.zip -d /path/to/houtai
pnpm install --frozen-lockfile
pnpm exec prisma generate
pm2 restart zhuning
```

The bundle contains `prisma/dev.db` and `public/uploads/imported-products/`.
Keep `DATABASE_URL=file:./dev.db` when the application runs from the project
root. Do not run `prisma db push` against the production database unless the
schema change has been reviewed first.
