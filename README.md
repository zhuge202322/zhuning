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
