# ParcelFlow

A B2B delivery and logistics management platform. It covers the full parcel lifecycle across four roles: admin, merchant, warehouse, and rider.

## Tech Stack

- **Next.js 16** (App Router) + React + TypeScript
- **Neon** Postgres database
- **Drizzle ORM** for type-safe queries
- **Better Auth** for email + password authentication
- **Tailwind CSS** + shadcn/ui components

## Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create a `.env.local` file with:

   ```bash
   DATABASE_URL=your-neon-connection-string
   BETTER_AUTH_SECRET=run `openssl rand -base64 32`
   BETTER_AUTH_DEV_URL=http://localhost:3000
   ```

3. Set up the database:

   ```bash
   pnpm db:push   # apply the schema
   pnpm db:seed   # load sample data
   ```

4. Start the dev server:

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command          | What it does                       |
| ---------------- | ---------------------------------- |
| `pnpm dev`       | Start the development server       |
| `pnpm build`     | Production build                   |
| `pnpm start`     | Run the production build           |
| `pnpm lint`      | Lint the codebase                  |
| `pnpm typecheck` | Type-check with TypeScript         |
| `pnpm db:push`   | Push the schema to the database    |
| `pnpm db:seed`   | Seed the database with sample data |
| `pnpm db:studio` | Open Drizzle Studio                |

## Roles & Areas

| Role      | Area         | What they do                                      |
| --------- | ------------ | ------------------------------------------------- |
| Admin     | `/dashboard` | Orders, merchants, payouts, team, reconciliation  |
| Merchant  | `/merchant`  | Create orders, track deliveries, request payouts  |
| Warehouse | `/warehouse` | Intake, dispatch, exceptions, cash reconciliation |
| Rider     | `/rider`     | Pickup queue and delivery queue                   |

Public order tracking is available at `/track`.

## Demo Logins

> **Note:** These accounts are created by `pnpm db:seed`. They are sample
> credentials for local development only — never use them in production.

After seeding, sign in at `/login` with any of the following:

| Role            | Name            | Email                      | Password        |
| --------------- | --------------- | -------------------------- | --------------- |
| Super Admin     | Nadia Rahman    | `superadmin@parcelflow.io` | `superadmin123` |
| Admin           | Tanvir Hossain  | `tanvir@parcelflow.io`     | `admin123`      |
| Admin           | Sadia Karim     | `sadia@parcelflow.io`      | `admin123`      |
| Warehouse Admin | Rifat Chowdhury | `rifat@parcelflow.io`      | `warehouse123`  |
| Warehouse Admin | Maliha Akter    | `maliha@parcelflow.io`     | `warehouse123`  |
| Merchant        | Imran Kabir     | `imran@threadline.com`     | `merchant123`   |
| Merchant        | Farzana Yasmin  | `farzana@greenleaf.com`    | `merchant123`   |
| Rider           | Jahangir Alam   | `jahangir@parcelflow.io`   | `rider123`      |
| Rider           | Shahin Mia      | `shahin@parcelflow.io`     | `rider123`      |
| Rider           | Rasel Khan      | `rasel@parcelflow.io`      | `rider123`      |
| Rider           | Kamrul Islam    | `kamrul@parcelflow.io`     | `rider123`      |

> Maliha Akter is seeded as an inactive account, useful for testing
> disabled-user handling.

## Project Structure

```
app/          Routes for each role + auth and tracking
components/    Shared UI, including the reusable DataTable
lib/
  auth.ts     Better Auth server config
  db/         Drizzle client, schema, and seed script
```
