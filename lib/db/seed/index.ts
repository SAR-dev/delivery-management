/**
 * lib/db/seed/index.ts
 *
 * Main seed orchestrator. Calls all seed functions in FK-safe order.
 *
 * Usage:
 *   npx tsx lib/db/seed.ts
 *   npx tsx lib/db/seed.ts --min
 */

import "dotenv/config"
import { pool } from "@/lib/db"
import { cleanDatabase } from "./clean"
import { seedDivisions } from "./divisions"
import { seedWarehouses } from "./warehouses"
import { seedRiders } from "./riders"
import { seedMerchants } from "./merchants"
import { seedPickupLocations } from "./pickup-locations"
import { seedSecurityConfig } from "./security-config"
import { seedUsers } from "./users"
import { seedOrders } from "./orders"
import { seedPayoutRequests } from "./payout-requests"
import { seedPayoutLinkedOrders } from "./payout-linked-orders"
import { seedAnnouncements } from "./announcements"
import { seedAuditLogs } from "./audit-logs"
import { seedEmailLogs } from "./email-logs"
import { log, MIN_MODE } from "./helpers"

async function main() {
  console.log(
    `=== ParcelFlow seed starting${MIN_MODE ? " (--min: skipping orders)" : ""} ===\n`,
  )

  try {
    await cleanDatabase()

    await seedDivisions()
    await seedWarehouses()
    await seedRiders()
    await seedMerchants()
    await seedPickupLocations()
    await seedSecurityConfig()
    await seedUsers()
    await seedAnnouncements()
    await seedAuditLogs()
    await seedEmailLogs()

    if (!MIN_MODE) {
      await seedOrders()
      await seedPayoutRequests()
      await seedPayoutLinkedOrders()
    } else {
      log("Skipping orders, payout requests, and payout-linked orders (--min)")
    }

    console.log("\n=== Seed complete ✓ ===")
  } catch (err) {
    console.error("\n[seed] ERROR:", err)
    process.exit(1)
  } finally {
    if (pool) await pool.end()
  }
}

main()
