/**
 * lib/db/seed/divisions.ts
 *
 * Seeds 8 Bangladesh divisions.
 */

import { db } from "@/lib/db"
import { division } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { DIVISION_IDS, log } from "./helpers"

export async function seedDivisions() {
  log("Seeding divisions…")

  const rows = Object.entries(DIVISION_IDS).map(([name, id]) => ({
    id,
    name,
    isActive: true,
  }))

  for (const row of rows) {
    const exists = await db
      .select()
      .from(division)
      .where(eq(division.id, row.id))
    if (exists.length > 0) {
      log(`  skip division ${row.name}`)
      continue
    }
    await db.insert(division).values(row)
    log(`  created division ${row.name}`)
  }
}
