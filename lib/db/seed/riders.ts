/**
 * lib/db/seed/riders.ts
 *
 * Seeds 8 riders across both warehouses.
 */

import { db } from "@/lib/db"
import { rider } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { log } from "./helpers"

export async function seedRiders() {
  log("Seeding riders…")

  const rows = [
    {
      id: "wcsub4pe1pk4x5zd7gri7ee2",
      name: "Jahangir Alam",
      phone: "+8801911000001",
      zone: "Dhanmondi / Mohammadpur",
      isActive: true,
      taskType: "PICKUP" as const,
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7",
    },
    {
      id: "q4am2x0nkz1m2a2m47if7vra",
      name: "Shahin Mia",
      phone: "+8801911000002",
      zone: "Gulshan / Banani",
      isActive: true,
      taskType: "PICKUP" as const,
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7",
    },
    {
      id: "gililvghb53wij1p965csiax",
      name: "Rasel Khan",
      phone: "+8801911000003",
      zone: "Uttara / Tongi",
      isActive: true,
      taskType: "BOTH" as const,
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7",
    },
    {
      id: "ksd77tlqpuvwkaygj5ucjjjs",
      name: "Forhad Hossain",
      phone: "+8801911000004",
      zone: "Tejgaon / Bashundhara",
      isActive: false,
      taskType: "PICKUP" as const,
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7",
    },
    {
      id: "khelbntdjda5h8y3pa7etjd4",
      name: "Kamrul Islam",
      phone: "+8801911000010",
      zone: "Dhanmondi / Banani",
      isActive: true,
      taskType: "DELIVERY" as const,
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7",
    },
    {
      id: "zgwc6kqieyjt9oa8txs18n49",
      name: "Tareq Aziz",
      phone: "+8801911000011",
      zone: "Uttara / Mirpur",
      isActive: true,
      taskType: "DELIVERY" as const,
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7",
    },
    {
      id: "ju4o1ji4z9lxwyb1iw4sd5nd",
      name: "Sohel Rana",
      phone: "+8801911000012",
      zone: "Bashundhara / Badda",
      isActive: false,
      taskType: "DELIVERY" as const,
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7",
    },
    {
      id: "rv4r3rbtyrceo203xzas257d",
      name: "Nasir Uddin",
      phone: "+8801911000013",
      zone: "Agrabad / Halishahar",
      isActive: true,
      taskType: "DELIVERY" as const,
      warehouseId: "op3s6e6t0q4oaerl6boqng1r",
    },
  ]

  for (const row of rows) {
    const exists = await db.select().from(rider).where(eq(rider.id, row.id))
    if (exists.length > 0) {
      log(`  skip rider ${row.name}`)
      continue
    }
    await db.insert(rider).values(row)
    log(`  created rider ${row.name}`)
  }
}
