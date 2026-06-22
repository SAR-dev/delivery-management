# ParcelFlow Setup Notes

Quick-load reference so the project can be bootstrapped fast in future chats.

## What this is

- **App:** ParcelFlow — B2B delivery / parcel management app.
- **Repo:** https://github.com/SAR-dev/delivery-management.git
- **Stack:** Next.js 16 (App Router) · Drizzle ORM · Better Auth · Postgres (Neon) · Tailwind v4 · shadcn · SWR · zod.
- **Package manager:** `pnpm`.

## Required environment variables

Live in `.env.development.local` (Neon integration provides `DATABASE_URL`).

- `DATABASE_URL` — provided by the connected **Neon** integration.
- `BETTER_AUTH_SECRET` — NOT provided by Neon. Must be generated and added manually:
  ```bash
  printf "BETTER_AUTH_SECRET='%s'\n" "$(openssl rand -base64 32)" >> .env.development.local
  ```
  The seed script creates users via Better Auth, so this is required before `db:seed`.

> Note: db/seed scripts use `dotenv/config` which loads `.env`, NOT `.env.development.local`.
> So when running CLI commands, source the env file first (see below).

## Bootstrap steps (in order)

```bash
# 1. install deps
pnpm install

# 2. make env vars available to the CLI (scripts don't auto-read .env.development.local)
set -a && . ./.env.development.local && set +a

# 3. push schema  (plain `pnpm db:push` needs a TTY confirmation, so use --force)
pnpm exec drizzle-kit push --force

# 4. seed data
pnpm db:seed
```

## Key files

- `lib/db/index.ts` — Drizzle client (uses `pg`, reads `DATABASE_URL`).
- `lib/db/schema*` — table definitions.
- `lib/db/seed.ts` — seed script (~1200 lines), creates users via Better Auth.
- `lib/auth.ts` — Better Auth config (needs `BETTER_AUTH_SECRET`).
- `drizzle.config.ts` — drizzle-kit config.

## Database schema (tables created by db:push)

`user`, `account`, `session`, `verification` (Better Auth), plus app tables:
`profile`, `warehouse`, `rider`, `merchant`, `pickup_location`, `security_config`,
`order`, `payout_request`.

## Seeded data (from db:seed)

Warehouses, riders, merchants, pickup locations, security config, users + profiles
(super admin, admins, warehouse admins, merchants, riders), 18 orders, 2 payout requests.

## Gotchas

- `pnpm db:push` is interactive — use `pnpm exec drizzle-kit push --force` for non-interactive runs.
- Always `set -a && . ./.env.development.local && set +a` before running `db:*` scripts.
- Recursive `rm -rf` is blocked in this environment; use the Delete tool for file removal.
