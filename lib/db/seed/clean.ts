/**
 * lib/db/seed/clean.ts
 *
 * Truncates all tables in FK-safe order.
 */

import { db, dbProvider } from "@/lib/db"
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
]

export async function cleanDatabase() {
  log("Cleaning existing data…")

  if (dbProvider === "postgres") {
    await db.execute(
      sql`TRUNCATE TABLE "order", "payout_request", "profile", "verification", "session", "account", "user", "security_config", "pickup_location", "merchant", "rider", "warehouse", "division", "audit_log", "email_log" CASCADE`,
    )
  } else {
    await db.run(sql`PRAGMA foreign_keys = OFF`)
    for (const table of tables) {
      await db.run(sql`DELETE FROM ${sql.identifier(table)}`)
    }
    await db.run(sql`PRAGMA foreign_keys = ON`)
  }

  log("Clean complete.\n")
}
