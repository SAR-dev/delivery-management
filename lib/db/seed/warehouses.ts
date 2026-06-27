/**
 * lib/db/seed/warehouses.ts
 *
 * Seeds 3 warehouses (Dhaka, Chattogram, Sylhet).
 */

import { db } from "@/lib/db"
import { warehouse } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { DIVISION_IDS, log } from "./helpers"

export async function seedWarehouses() {
  log("Seeding warehouses…")

  const rows = [
    {
      id: "b5mujkfyyq6qqw5t1unbm8b7",
      name: "Dhaka Central Hub",
      address: "Plot 22, Tejgaon Industrial Area",
      city: "Dhaka",
      divisionId: DIVISION_IDS.Dhaka,
      managedBy: null as string | null,
      isActive: true,
    },
    {
      id: "op3s6e6t0q4oaerl6boqng1r",
      name: "Chattogram Port Hub",
      address: "Agrabad Commercial Area, Block C",
      city: "Chattogram",
      divisionId: DIVISION_IDS.Chattogram,
      managedBy: null,
      isActive: true,
    },
    {
      id: "u9kbfapo43wkoj65972psioh",
      name: "Sylhet Regional Depot",
      address: "Zindabazar Main Road",
      city: "Sylhet",
      divisionId: DIVISION_IDS.Sylhet,
      managedBy: null,
      isActive: false,
    },
  ]

  for (const row of rows) {
    const exists = await db
      .select()
      .from(warehouse)
      .where(eq(warehouse.id, row.id))
    if (exists.length > 0) {
      log(`  skip warehouse ${row.name}`)
      continue
    }
    await db.insert(warehouse).values(row)
    log(`  created warehouse ${row.name}`)
  }
}
