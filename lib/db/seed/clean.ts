/**
 * lib/db/seed/clean.ts
 *
 * Truncates all tables in FK-safe order.
 */

import { db } from "@/lib/db"
import { sql } from "drizzle-orm"
import { log } from "./helpers"

export async function cleanDatabase() {
  log("Cleaning existing data…")

  await db.execute(
    sql`TRUNCATE TABLE "order", "payout_request", "profile", "verification", "session", "account", "user", "security_config", "pickup_location", "merchant", "rider", "warehouse", "division", "audit_log", "email_log" CASCADE`,
  )

  log("Clean complete.\n")
}
