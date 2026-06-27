/**
 * lib/db/seed/users.ts
 *
 * Seeds 11 users (1 super admin, 2 admins, 2 warehouse admins,
 * 2 merchants, 4 riders) + back-fills warehouse.managedBy.
 */

import { db } from "@/lib/db"
import { user, warehouse } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { createUser, cred, log } from "./helpers"

export async function seedUsers() {
  log("Seeding users…")

  // Super Admin
  await createUser({
    id: "byai6ci02ogt3lnawaro35pj",
    name: "Nadia Rahman",
    ...cred("superadmin@parcelflow.io"),
    phone: "+8801711000001",
    role: "SUPER_ADMIN",
    isActive: true,
    canManagePricing: false,
  })

  // Admins
  await createUser({
    id: "u5f1ybhii5mzu2ejkcckusxn",
    name: "Tanvir Hossain",
    ...cred("tanvir@parcelflow.io"),
    phone: "+8801711000010",
    role: "ADMIN",
    isActive: true,
    canManagePricing: true,
  })
  await createUser({
    id: "xr4s7lha6epx9lv9q59n5czu",
    name: "Sadia Karim",
    ...cred("sadia@parcelflow.io"),
    phone: "+8801711000011",
    role: "ADMIN",
    isActive: true,
    canManagePricing: false,
  })

  // Warehouse Admins
  await createUser({
    id: "x60dwd1h0fyp7jxpr86vp8ue",
    name: "Rifat Chowdhury",
    ...cred("rifat@parcelflow.io"),
    phone: "+8801711000020",
    role: "WAREHOUSE_ADMIN",
    isActive: true,
    canManagePricing: false,
    warehouseId: "b5mujkfyyq6qqw5t1unbm8b7",
  })
  await createUser({
    id: "q05x0r1u33o482an65id6dsa",
    name: "Maliha Akter",
    ...cred("maliha@parcelflow.io"),
    phone: "+8801711000021",
    role: "WAREHOUSE_ADMIN",
    isActive: false,
    canManagePricing: false,
    warehouseId: "op3s6e6t0q4oaerl6boqng1r",
  })

  // Merchants
  await createUser({
    id: "b7ou67y7wgz52n6h56brvu7a",
    name: "Imran Kabir",
    ...cred("imran@threadline.com"),
    phone: "+8801712345601",
    role: "MERCHANT",
    isActive: true,
    merchantId: "ucteju8w92cww2x029etxv67",
  })
  await createUser({
    id: "g73o2veh2xe6g1053dgrbs0f",
    name: "Farzana Yasmin",
    ...cred("farzana@greenleaf.com"),
    phone: "+8801712345602",
    role: "MERCHANT",
    isActive: true,
    merchantId: "uuz3r7ln1o2ipbr12rnowx2q",
  })

  // Riders (pickup riders)
  await createUser({
    id: "b1vumrk4al17bfcdrh8sy0fx",
    name: "Jahangir Alam",
    ...cred("jahangir@parcelflow.io"),
    phone: "+8801911000001",
    role: "RIDER",
    isActive: true,
    riderId: "wcsub4pe1pk4x5zd7gri7ee2",
  })
  await createUser({
    id: "fqfr9el8wj8vm6daorxq2aab",
    name: "Shahin Mia",
    ...cred("shahin@parcelflow.io"),
    phone: "+8801911000002",
    role: "RIDER",
    isActive: true,
    riderId: "q4am2x0nkz1m2a2m47if7vra",
  })
  await createUser({
    id: "ilqxbvdg73konhlso4w7vqa4",
    name: "Rasel Khan",
    ...cred("rasel@parcelflow.io"),
    phone: "+8801911000003",
    role: "RIDER",
    isActive: true,
    riderId: "gililvghb53wij1p965csiax",
  })

  // Delivery rider (Kamrul — used for Phase 8 delivery-attempt demo)
  await createUser({
    id: "aczezx2g544hbgtun37478zq",
    name: "Kamrul Islam",
    ...cred("kamrul@parcelflow.io"),
    phone: "+8801911000010",
    role: "RIDER",
    isActive: true,
    riderId: "khelbntdjda5h8y3pa7etjd4",
  })

  // Back-fill warehouse.managedBy now that users exist.
  log("Back-filling warehouse.managedBy…")
  const [rifat] = await db
    .select()
    .from(user)
    .where(eq(user.email, "rifat@parcelflow.io"))
    .limit(1)
  const [maliha] = await db
    .select()
    .from(user)
    .where(eq(user.email, "maliha@parcelflow.io"))
    .limit(1)
  if (rifat) {
    await db
      .update(warehouse)
      .set({ managedBy: rifat.id })
      .where(eq(warehouse.id, "b5mujkfyyq6qqw5t1unbm8b7"))
    log("  set Dhaka Central Hub managedBy → Rifat")
  }
  if (maliha) {
    await db
      .update(warehouse)
      .set({ managedBy: maliha.id })
      .where(eq(warehouse.id, "op3s6e6t0q4oaerl6boqng1r"))
    log("  set Chattogram Port Hub managedBy → Maliha")
  }
}
