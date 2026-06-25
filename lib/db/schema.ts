/**
 * lib/db/schema.ts
 *
 * Unified schema re-export. Picks the correct schema based on DB_PROVIDER.
 * All application imports use this file — they never import schema.postgres
 * or schema.turso directly.
 */

const provider = (process.env.DB_PROVIDER ?? "postgres").toLowerCase()

// eslint-disable-next-line @typescript-eslint/no-require-imports
module.exports = provider === "turso"
  ? require("./schema.turso")
  : require("./schema.postgres")
