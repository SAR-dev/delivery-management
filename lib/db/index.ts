/**
 * lib/db/index.ts
 *
 * Unified database entry point. Switches between PostgreSQL and Turso (SQLite)
 * based on the DB_PROVIDER environment variable:
 *
 *   DB_PROVIDER=postgres  (default) → pg + drizzle-orm/node-postgres
 *   DB_PROVIDER=turso               → @libsql/client + drizzle-orm/libsql
 *
 * The `db` export is typed as `any` at the module boundary because the two
 * Drizzle instances are generic over different schemas/dialects. All query
 * call-sites already infer types from schema imports, so this doesn't
 * affect end-to-end type safety in practice.
 *
 * `pool` is only set when using postgres; it is null for Turso.
 * Better Auth uses `pool` directly on postgres, and the drizzle adapter on Turso.
 */

let db: any
let pool: import("pg").Pool | null = null

export const dbProvider = (
  process.env.DB_PROVIDER ?? "postgres"
).toLowerCase() as "postgres" | "turso"

if (dbProvider !== "postgres" && dbProvider !== "turso") {
  throw new Error(
    `Invalid DB_PROVIDER: "${process.env.DB_PROVIDER}". Must be "postgres" or "turso".`,
  )
}

if (dbProvider === "postgres") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/node-postgres")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const schema = require("./schema.postgres")

  pool = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL,
  }) as import("pg").Pool
  db = drizzle(pool, { schema })
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/libsql")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@libsql/client")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const schema = require("./schema.turso")

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  db = drizzle(client, { schema })
}

export { db, pool }
