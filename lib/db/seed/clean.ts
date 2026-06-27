/**
 * lib/db/seed/clean.ts
 *
 * Truncates all tables in FK-safe order.
 */

import { db, dbProvider, pool } from "@/lib/db"
import { sql } from "drizzle-orm"
import { log } from "./helpers"

const tables = [
  "order",
  "payout_request",
  "profile",
  "verification",
  "session",
  "account",
  "user",
  "security_config",
  "pickup_location",
  "merchant",
  "rider",
  "warehouse",
  "division",
  "audit_log",
  "email_log",
  "announcement",
]

export async function cleanDatabase() {
  log("Cleaning existing data…")

  if (dbProvider === "postgres") {
    // pool is always set when dbProvider === "postgres"
    await pool!.query(
      `TRUNCATE TABLE "order", "payout_request", "profile", "verification", "session", "account", "user", "security_config", "pickup_location", "merchant", "rider", "warehouse", "division", "audit_log", "email_log", "announcement" CASCADE`,
    )
  } else {
    // drizzle-orm/libsql exposes .run() for raw statements, not .execute().
    // Cast through unknown to escape the NodePgDatabase type overlay on db.
    const libsqlDb = db as unknown as { run: (query: ReturnType<typeof sql>) => Promise<void> }
    await libsqlDb.run(sql`PRAGMA foreign_keys = OFF`)
    for (const table of tables) {
      await libsqlDb.run(sql`DELETE FROM ${sql.identifier(table)}`)
    }
    await libsqlDb.run(sql`PRAGMA foreign_keys = ON`)
  }

  log("Clean complete.\n")
}
