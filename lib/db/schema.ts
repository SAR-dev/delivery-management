/**
 * lib/db/schema.ts
 *
 * Static re-export of the postgres schema for TypeScript's type checker.
 * Both schema.postgres and schema.turso export the same names with the same
 * logical shape, so postgres types are valid for both providers.
 *
 * Runtime provider dispatch (which driver/schema is actually instantiated)
 * lives in lib/db/index.ts — not here. Application code imports types and
 * table references from this file; it never imports schema.postgres or
 * schema.turso directly.
 */

export * from "./schema.postgres"
