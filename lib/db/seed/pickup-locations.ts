/**
 * lib/db/seed/pickup-locations.ts
 *
 * Seeds 3 pickup locations linked to merchants.
 */

import { db } from "@/lib/db"
import { pickupLocation } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { DIVISION_IDS, log } from "./helpers"

export async function seedPickupLocations() {
  log("Seeding pickup locations…")

  const rows = [
    {
      id: "hu22eapfey4srbcrn87uu8dy",
      merchantId: "ucteju8w92cww2x029etxv67",
      label: "Main Store — Dhanmondi",
      address: "House 14, Road 7, Dhanmondi, Dhaka",
      divisionId: DIVISION_IDS.Dhaka,
    },
    {
      id: "zf18qsus6o4l4cgt98s0d5ng",
      merchantId: "ucteju8w92cww2x029etxv67",
      label: "Warehouse — Tejgaon",
      address: "Plot 5, Tejgaon Industrial Area, Dhaka",
      divisionId: DIVISION_IDS.Dhaka,
    },
    {
      id: "i8407hm6he3upn30fse0qj4w",
      merchantId: "uuz3r7ln1o2ipbr12rnowx2q",
      label: "GreenLeaf Outlet — Gulshan",
      address: "Shop 3, Gulshan Avenue, Dhaka",
      divisionId: DIVISION_IDS.Dhaka,
    },
  ]

  for (const row of rows) {
    const exists = await db
      .select()
      .from(pickupLocation)
      .where(eq(pickupLocation.id, row.id))
    if (exists.length > 0) {
      log(`  skip pickup location ${row.label}`)
      continue
    }
    await db.insert(pickupLocation).values(row)
    log(`  created pickup location ${row.label}`)
  }
}
