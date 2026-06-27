/**
 * lib/db/index.ts
 *
 * Unified database entry point. Switches between PostgreSQL and Turso (SQLite)
 * based on the DB_PROVIDER environment variable:
 *
 *   DB_PROVIDER=postgres  (default) → pg + drizzle-orm/node-postgres
 *   DB_PROVIDER=turso               → @libsql/client + drizzle-orm/libsql
 *
 * `db` is typed as `NodePgDatabase<typeof pgSchema>` — the postgres instance's
 * real type — rather than `any`. Application code only ever imports table
 * refs/types from `./schema.ts`, which is a static re-export of
 * `schema.postgres` (see that file's header comment), so this is the type
 * every real call site actually needs.
 *
 * The Turso branch is genuinely a `LibSQLDatabase<typeof sqliteSchema>` at
 * runtime, not a `NodePgDatabase`. Since `schema.turso` is documented as the
 * same logical shape as `schema.postgres` (same table/column names, same
 * inferred row shapes), a single intentional cast at its assignment site
 * substitutes it as the postgres type. This keeps the `any` confined to one
 * documented line instead of leaking through every query in the codebase.
 *
 * `pool` is only set when using postgres; it is null for Turso.
 * Better Auth uses `pool` directly on postgres, and the drizzle adapter on Turso.
 */

import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import type * as pgSchema from "./schema.postgres"

let db: NodePgDatabase<typeof pgSchema>
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
  db = drizzle(client, { schema }) as unknown as NodePgDatabase<typeof pgSchema>
}

export { db, pool }
