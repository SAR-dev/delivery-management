/**
 * lib/db/seed/security-config.ts
 *
 * Seeds a single default security-config row.
 */

import { db } from "@/lib/db"
import { securityConfig } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { log } from "./helpers"

export async function seedSecurityConfig() {
  log("Seeding security config…")
  const exists = await db
    .select()
    .from(securityConfig)
    .where(eq(securityConfig.id, "default"))
  if (exists.length > 0) {
    log("  skip security_config (already exists)")
    return
  }

  await db.insert(securityConfig).values({
    id: "default",
    lowValueThreshold: 1000,
    lowValueFlatFee: 10,
    highValuePercentage: 1,
    updatedAt: "2025-01-04T09:05:00Z",
    updatedBy: "Nadia Rahman",
  })
  log("  created security_config")
}
