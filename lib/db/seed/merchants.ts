/**
 * lib/db/seed/merchants.ts
 *
 * Seeds 5 merchants (various statuses: ACTIVE, PENDING, SUSPENDED).
 */

import { db } from "@/lib/db"
import { merchant } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { DIVISION_IDS, log } from "./helpers"

export async function seedMerchants() {
  log("Seeding merchants…")

  const rows = [
    {
      id: "ucteju8w92cww2x029etxv67",
      businessName: "Threadline Apparel",
      ownerName: "Imran Kabir",
      email: "imran@threadline.com",
      phone: "+8801712345601",
      address: "House 14, Road 7, Dhanmondi, Dhaka",
      divisionId: DIVISION_IDS.Dhaka,
      status: "ACTIVE" as const,
      baseRate: 60,
      extraRatePerKg: 15,
      maxWeightKg: 3,
      freeWeightKg: 1,
      approvedBy: "Nadia Rahman",
      approvedAt: "2025-01-12T10:00:00Z",
      createdAt: "2025-01-10T08:30:00Z",
    },
    {
      id: "uuz3r7ln1o2ipbr12rnowx2q",
      businessName: "GreenLeaf Organics",
      ownerName: "Farzana Yasmin",
      email: "farzana@greenleaf.com",
      phone: "+8801712345602",
      address: "Shop 3, Gulshan Avenue, Dhaka",
      divisionId: DIVISION_IDS.Dhaka,
      status: "ACTIVE" as const,
      baseRate: 55,
      extraRatePerKg: 20,
      maxWeightKg: 3,
      freeWeightKg: 1,
      approvedBy: "Nadia Rahman",
      approvedAt: "2025-01-13T09:15:00Z",
      createdAt: "2025-01-11T12:00:00Z",
    },
    {
      id: "ur2kbc58wjhxvkjha2fsjcxc",
      businessName: "PixelCase Gadgets",
      ownerName: "Sabbir Ahmed",
      email: "sabbir@pixelcase.com",
      phone: "+8801712345603",
      address: "Level 4, Bashundhara City, Dhaka",
      divisionId: DIVISION_IDS.Dhaka,
      status: "PENDING" as const,
      baseRate: 0,
      extraRatePerKg: 15,
      maxWeightKg: 3,
      freeWeightKg: 1,
      approvedBy: null,
      approvedAt: null,
      createdAt: "2025-01-18T14:45:00Z",
    },
    {
      id: "y1m2o1zcyftdqes7gd36rwjd",
      businessName: "Bloom & Co.",
      ownerName: "Naila Haque",
      email: "naila@bloomco.com",
      phone: "+8801712345604",
      address: "Plot 9, Uttara Sector 4, Dhaka",
      divisionId: DIVISION_IDS.Dhaka,
      status: "PENDING" as const,
      baseRate: 0,
      extraRatePerKg: 15,
      maxWeightKg: 3,
      freeWeightKg: 1,
      approvedBy: null,
      approvedAt: null,
      createdAt: "2025-01-19T11:10:00Z",
    },
    {
      id: "nsfktk64zjut01r2x93hnweu",
      businessName: "Urban Crate",
      ownerName: "Rezaul Haque",
      email: "rezaul@urbancrate.com",
      phone: "+8801712345605",
      address: "Agrabad Commercial Area, Chattogram",
      divisionId: DIVISION_IDS.Chattogram,
      status: "SUSPENDED" as const,
      baseRate: 70,
      extraRatePerKg: 15,
      maxWeightKg: 3,
      freeWeightKg: 1,
      approvedBy: "Nadia Rahman",
      approvedAt: "2025-01-09T16:20:00Z",
      createdAt: "2025-01-08T10:00:00Z",
    },
  ]

  for (const row of rows) {
    const exists = await db
      .select()
      .from(merchant)
      .where(eq(merchant.id, row.id))
    if (exists.length > 0) {
      log(`  skip merchant ${row.businessName}`)
      continue
    }
    await db.insert(merchant).values(row)
    log(`  created merchant ${row.businessName}`)
  }
}
