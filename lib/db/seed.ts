/**
 * lib/db/seed.ts
 *
 * One-time seed script. Run with:
 *   npx tsx lib/db/seed.ts
 *
 * Ports every row from lib/mock-data.ts into the real database.
 * Safe to re-run: each section checks for existing rows and skips them.
 *
 * Insertion order matters for FK constraints:
 *   warehouse → rider → merchant → pickup_location → security_config
 *   → user (via Better Auth) → profile → order → payout_request
 */

import "dotenv/config";
import { auth } from "@/lib/auth";
import { db, pool } from "@/lib/db";
import {
  user,
  warehouse,
  rider,
  merchant,
  pickupLocation,
  securityConfig,
  profile,
  order,
  payoutRequest,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SEED_CREDENTIALS } from "./seed-credentials";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg: string) {
  console.log(`[seed] ${msg}`);
}

/** Create a Better Auth user + our profile row in one step. */
async function createUser(input: {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: "SUPER_ADMIN" | "ADMIN" | "WAREHOUSE_ADMIN" | "MERCHANT" | "RIDER";
  isActive?: boolean;
  canManagePricing?: boolean;
  warehouseId?: string | null;
  merchantId?: string | null;
  riderId?: string | null;
}) {
  // Check if user already exists to make the script re-runnable.
  const existing = await db
    .select()
    .from(user)
    .where(eq(user.email, input.email))
    .limit(1);
  if (existing.length > 0) {
    log(`  skip user ${input.email} (already exists)`);
    return;
  }

  // Better Auth creates the `user` and `account` rows.
  // Called without headers so the admin plugin's session check is bypassed.
  await auth.api.createUser({
    body: {
      name: input.name,
      email: input.email,
      password: input.password,
      // role is our app's custom role — stored in the profile row below, not in BA's user table
    },
  });

  // Fetch the newly created user to get the BA-generated id.
  const created = await db
    .select()
    .from(user)
    .where(eq(user.email, input.email))
    .limit(1);
  const baUser = created[0];
  if (!baUser) throw new Error(`Failed to create user ${input.email}`);

  // Insert our platform profile row. The profile uses the BA user id as PK.
  await db.insert(profile).values({
    userId: baUser.id,
    role: input.role,
    phone: input.phone,
    isActive: input.isActive ?? true,
    canManagePricing: input.canManagePricing ?? false,
    warehouseId: input.warehouseId ?? null,
    merchantId: input.merchantId ?? null,
    riderId: input.riderId ?? null,
  });

  log(`  created user ${input.email} (${input.role})`);
}

// ---------------------------------------------------------------------------
// 1. Warehouses
// ---------------------------------------------------------------------------

async function seedWarehouses() {
  log("Seeding warehouses…");

  const rows = [
    {
      id: "b5mujkfyyq6qqw5t1unbm8b7",
      name: "Dhaka Central Hub",
      address: "Plot 22, Tejgaon Industrial Area",
      city: "Dhaka",
      managedBy: null as string | null, // back-filled after users are seeded
      isActive: true,
    },
    {
      id: "op3s6e6t0q4oaerl6boqng1r",
      name: "Chattogram Port Hub",
      address: "Agrabad Commercial Area, Block C",
      city: "Chattogram",
      managedBy: null,
      isActive: true,
    },
    {
      id: "u9kbfapo43wkoj65972psioh",
      name: "Sylhet Regional Depot",
      address: "Zindabazar Main Road",
      city: "Sylhet",
      managedBy: null,
      isActive: false,
    },
  ];

  for (const row of rows) {
    const exists = await db.select().from(warehouse).where(eq(warehouse.id, row.id));
    if (exists.length > 0) { log(`  skip warehouse ${row.name}`); continue; }
    await db.insert(warehouse).values(row);
    log(`  created warehouse ${row.name}`);
  }
}

// ---------------------------------------------------------------------------
// 2. Riders
// ---------------------------------------------------------------------------

async function seedRiders() {
  log("Seeding riders…");

  const rows = [
    { id: "wcsub4pe1pk4x5zd7gri7ee2", name: "Jahangir Alam",  phone: "+8801911000001", zone: "Dhanmondi / Mohammadpur",  isActive: true,  warehouseId: null },
    { id: "q4am2x0nkz1m2a2m47if7vra", name: "Shahin Mia",     phone: "+8801911000002", zone: "Gulshan / Banani",          isActive: true,  warehouseId: null },
    { id: "gililvghb53wij1p965csiax", name: "Rasel Khan",      phone: "+8801911000003", zone: "Uttara / Tongi",            isActive: true,  warehouseId: null },
    { id: "ksd77tlqpuvwkaygj5ucjjjs", name: "Forhad Hossain",  phone: "+8801911000004", zone: "Tejgaon / Bashundhara",    isActive: false, warehouseId: null },
    { id: "khelbntdjda5h8y3pa7etjd4", name: "Kamrul Islam",    phone: "+8801911000010", zone: "Dhanmondi / Banani",        isActive: true,  warehouseId: "b5mujkfyyq6qqw5t1unbm8b7" },
    { id: "zgwc6kqieyjt9oa8txs18n49", name: "Tareq Aziz",      phone: "+8801911000011", zone: "Uttara / Mirpur",           isActive: true,  warehouseId: "b5mujkfyyq6qqw5t1unbm8b7" },
    { id: "ju4o1ji4z9lxwyb1iw4sd5nd", name: "Sohel Rana",      phone: "+8801911000012", zone: "Bashundhara / Badda",       isActive: false, warehouseId: "b5mujkfyyq6qqw5t1unbm8b7" },
    { id: "rv4r3rbtyrceo203xzas257d", name: "Nasir Uddin",     phone: "+8801911000013", zone: "Agrabad / Halishahar",      isActive: true,  warehouseId: "op3s6e6t0q4oaerl6boqng1r" },
  ];

  for (const row of rows) {
    const exists = await db.select().from(rider).where(eq(rider.id, row.id));
    if (exists.length > 0) { log(`  skip rider ${row.name}`); continue; }
    await db.insert(rider).values(row);
    log(`  created rider ${row.name}`);
  }
}

// ---------------------------------------------------------------------------
// 3. Merchants
// ---------------------------------------------------------------------------

async function seedMerchants() {
  log("Seeding merchants…");

  const rows = [
    {
      id: "ucteju8w92cww2x029etxv67",
      businessName: "Threadline Apparel",
      ownerName: "Imran Kabir",
      email: "imran@threadline.com",
      phone: "+8801712345601",
      address: "House 14, Road 7, Dhanmondi, Dhaka",
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
      status: "SUSPENDED" as const,
      baseRate: 70,
      extraRatePerKg: 15,
      maxWeightKg: 3,
      freeWeightKg: 1,
      approvedBy: "Nadia Rahman",
      approvedAt: "2025-01-09T16:20:00Z",
      createdAt: "2025-01-08T10:00:00Z",
    },
  ];

  for (const row of rows) {
    const exists = await db.select().from(merchant).where(eq(merchant.id, row.id));
    if (exists.length > 0) { log(`  skip merchant ${row.businessName}`); continue; }
    await db.insert(merchant).values(row);
    log(`  created merchant ${row.businessName}`);
  }
}

// ---------------------------------------------------------------------------
// 4. Pickup locations
// ---------------------------------------------------------------------------

async function seedPickupLocations() {
  log("Seeding pickup locations…");

  const rows = [
    { id: "hu22eapfey4srbcrn87uu8dy", merchantId: "ucteju8w92cww2x029etxv67", label: "Main Store — Dhanmondi",    address: "House 14, Road 7, Dhanmondi, Dhaka" },
    { id: "zf18qsus6o4l4cgt98s0d5ng", merchantId: "ucteju8w92cww2x029etxv67", label: "Warehouse — Tejgaon",        address: "Plot 5, Tejgaon Industrial Area, Dhaka" },
    { id: "i8407hm6he3upn30fse0qj4w", merchantId: "uuz3r7ln1o2ipbr12rnowx2q", label: "GreenLeaf Outlet — Gulshan", address: "Shop 3, Gulshan Avenue, Dhaka" },
  ];

  for (const row of rows) {
    const exists = await db.select().from(pickupLocation).where(eq(pickupLocation.id, row.id));
    if (exists.length > 0) { log(`  skip pickup location ${row.label}`); continue; }
    await db.insert(pickupLocation).values(row);
    log(`  created pickup location ${row.label}`);
  }
}

// ---------------------------------------------------------------------------
// 5. Security config (single row, id = 'default')
// ---------------------------------------------------------------------------

async function seedSecurityConfig() {
  log("Seeding security config…");
  const exists = await db.select().from(securityConfig).where(eq(securityConfig.id, "default"));
  if (exists.length > 0) { log("  skip security_config (already exists)"); return; }

  await db.insert(securityConfig).values({
    id: "default",
    lowValueThreshold: 1000,
    lowValueFlatFee: 10,
    highValuePercentage: 1,
    updatedAt: "2025-01-04T09:05:00Z",
    updatedBy: "Nadia Rahman",
  });
  log("  created security_config");
}

// ---------------------------------------------------------------------------
// 6. Users + profiles
// ---------------------------------------------------------------------------

// Shorthand to pull { email, password } from SEED_CREDENTIALS by email.
function cred(email: string) {
  const c = SEED_CREDENTIALS.find((u) => u.email === email);
  if (!c) throw new Error(`No seed credential found for ${email}`);
  return { email: c.email, password: c.password };
}

async function seedUsers() {
  log("Seeding users…");

  // Super Admin
  await createUser({
    id: "byai6ci02ogt3lnawaro35pj",
    name: "Nadia Rahman",
    ...cred("superadmin@parcelflow.io"),
    phone: "+8801711000001",
    role: "SUPER_ADMIN",
    isActive: true,
    canManagePricing: false,
  });

  // Admins
  await createUser({
    id: "u5f1ybhii5mzu2ejkcckusxn",
    name: "Tanvir Hossain",
    ...cred("tanvir@parcelflow.io"),
    phone: "+8801711000010",
    role: "ADMIN",
    isActive: true,
    canManagePricing: true,
  });
  await createUser({
    id: "xr4s7lha6epx9lv9q59n5czu",
    name: "Sadia Karim",
    ...cred("sadia@parcelflow.io"),
    phone: "+8801711000011",
    role: "ADMIN",
    isActive: true,
    canManagePricing: false,
  });

  // Warehouse Admins
  await createUser({
    id: "x60dwd1h0fyp7jxpr86vp8ue",
    name: "Rifat Chowdhury",
    ...cred("rifat@parcelflow.io"),
    phone: "+8801711000020",
    role: "WAREHOUSE_ADMIN",
    isActive: true,
    canManagePricing: false,
    warehouseId: "b5mujkfyyq6qqw5t1unbm8b7", // Dhaka Central Hub
  });
  await createUser({
    id: "q05x0r1u33o482an65id6dsa",
    name: "Maliha Akter",
    ...cred("maliha@parcelflow.io"),
    phone: "+8801711000021",
    role: "WAREHOUSE_ADMIN",
    isActive: false,
    canManagePricing: false,
    warehouseId: "op3s6e6t0q4oaerl6boqng1r", // Chattogram Port Hub
  });

  // Merchants
  await createUser({
    id: "b7ou67y7wgz52n6h56brvu7a",
    name: "Imran Kabir",
    ...cred("imran@threadline.com"),
    phone: "+8801712345601",
    role: "MERCHANT",
    isActive: true,
    merchantId: "ucteju8w92cww2x029etxv67", // Threadline Apparel
  });
  await createUser({
    id: "g73o2veh2xe6g1053dgrbs0f",
    name: "Farzana Yasmin",
    ...cred("farzana@greenleaf.com"),
    phone: "+8801712345602",
    role: "MERCHANT",
    isActive: true,
    merchantId: "uuz3r7ln1o2ipbr12rnowx2q", // GreenLeaf Organics
  });

  // Riders (pickup riders)
  await createUser({
    id: "b1vumrk4al17bfcdrh8sy0fx",
    name: "Jahangir Alam",
    ...cred("jahangir@parcelflow.io"),
    phone: "+8801911000001",
    role: "RIDER",
    isActive: true,
    riderId: "wcsub4pe1pk4x5zd7gri7ee2",
  });
  await createUser({
    id: "fqfr9el8wj8vm6daorxq2aab",
    name: "Shahin Mia",
    ...cred("shahin@parcelflow.io"),
    phone: "+8801911000002",
    role: "RIDER",
    isActive: true,
    riderId: "q4am2x0nkz1m2a2m47if7vra",
  });
  await createUser({
    id: "ilqxbvdg73konhlso4w7vqa4",
    name: "Rasel Khan",
    ...cred("rasel@parcelflow.io"),
    phone: "+8801911000003",
    role: "RIDER",
    isActive: true,
    riderId: "gililvghb53wij1p965csiax",
  });

  // Delivery rider (Kamrul — used for Phase 8 delivery-attempt demo)
  await createUser({
    id: "aczezx2g544hbgtun37478zq",
    name: "Kamrul Islam",
    ...cred("kamrul@parcelflow.io"),
    phone: "+8801911000010",
    role: "RIDER",
    isActive: true,
    riderId: "khelbntdjda5h8y3pa7etjd4",
  });

  // Back-fill warehouse.managedBy now that users exist.
  // We use the Better Auth user id (looked up by email) rather than the
  // hard-coded mock id so FK logic is correct if BA regenerated IDs.
  log("Back-filling warehouse.managedBy…");
  const [rifat] = await db.select().from(user).where(eq(user.email, "rifat@parcelflow.io")).limit(1);
  const [maliha] = await db.select().from(user).where(eq(user.email, "maliha@parcelflow.io")).limit(1);
  if (rifat) {
    await db.update(warehouse).set({ managedBy: rifat.id }).where(eq(warehouse.id, "b5mujkfyyq6qqw5t1unbm8b7"));
    log("  set Dhaka Central Hub managedBy → Rifat");
  }
  if (maliha) {
    await db.update(warehouse).set({ managedBy: maliha.id }).where(eq(warehouse.id, "op3s6e6t0q4oaerl6boqng1r"));
    log("  set Chattogram Port Hub managedBy → Maliha");
  }
}

// ---------------------------------------------------------------------------
// 7. Orders
// ---------------------------------------------------------------------------

async function seedOrders() {
  log("Seeding orders…");

  // payout_request rows must exist before orders that reference them, so we
  // split them into two groups: orders without a payoutRequestId first, then
  // payout requests, then the two orders that link to them.

  const baseOrders = [
    {
      id: "drieuxxjt70yx2p21s5itsvs", code: "PF-100231",
      merchantId: "ucteju8w92cww2x029etxv67", pickupLocationId: "hu22eapfey4srbcrn87uu8dy",
      recipientName: "Sumaiya Islam", recipientPhone: "+8801811112233",
      deliveryAddress: "Flat B2, Road 11, Banani, Dhaka", deliveryCity: "Dhaka",
      parcelWeightKg: 2, deliveryType: "STANDARD" as const,
      productCost: 5000, deliveryCharge: 75, securityMoney: 50, totalCollectible: 5125,
      status: "DELIVERED" as const, createdAt: "2025-01-15T09:30:00Z",
      approvedBy: "Tanvir Hossain", approvedAt: "2025-01-15T10:05:00Z",
      pickupRiderId: "q4am2x0nkz1m2a2m47if7vra", assignedAt: "2025-01-15T10:06:00Z",
      pickedUpAt: "2025-01-15T11:00:00Z",
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7", receivedAtWarehouseAt: "2025-01-15T12:00:00Z", receivedByWarehouse: "Rifat Chowdhury",
      deliveryRiderId: "khelbntdjda5h8y3pa7etjd4", dispatchedAt: "2025-01-15T13:00:00Z", dispatchedBy: "Rifat Chowdhury",
      outForDeliveryAt: "2025-01-15T14:00:00Z", deliveredAt: "2025-01-15T16:30:00Z",
      deliveryProofRef: "proof_pf-100231.jpg", amountCollected: 5125, deliveryAttempts: 1,
      codSettledAt: "2025-01-15T18:00:00Z", codSettledBy: "Rifat Chowdhury",
    },
    {
      id: "hnbwmr22caet61ey365e6irx", code: "PF-100247",
      merchantId: "ucteju8w92cww2x029etxv67", pickupLocationId: "hu22eapfey4srbcrn87uu8dy",
      recipientName: "Rakib Hasan", recipientPhone: "+8801822223344",
      deliveryAddress: "House 7, Sector 10, Uttara, Dhaka", deliveryCity: "Dhaka",
      parcelWeightKg: 0.8, deliveryType: "FRAGILE" as const,
      productCost: 800, deliveryCharge: 60, securityMoney: 10, totalCollectible: 870,
      status: "IN_TRANSIT" as const, createdAt: "2025-01-19T13:10:00Z", deliveryAttempts: 0,
      approvedBy: "Tanvir Hossain", approvedAt: "2025-01-19T13:40:00Z",
      pickupRiderId: "gililvghb53wij1p965csiax", assignedAt: "2025-01-19T13:41:00Z",
      pickedUpAt: "2025-01-19T14:20:00Z",
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7", receivedAtWarehouseAt: "2025-01-19T16:00:00Z", receivedByWarehouse: "Rifat Chowdhury",
      deliveryRiderId: "khelbntdjda5h8y3pa7etjd4", dispatchedAt: "2025-01-19T17:30:00Z", dispatchedBy: "Rifat Chowdhury",
    },
    {
      id: "zrwpbc3uawa3dp8p2fm890r6", code: "PF-100258",
      merchantId: "ucteju8w92cww2x029etxv67", pickupLocationId: "zf18qsus6o4l4cgt98s0d5ng",
      recipientName: "Tania Ahmed", recipientPhone: "+8801833334455",
      deliveryAddress: "Plot 19, Bashundhara R/A, Dhaka", deliveryCity: "Dhaka",
      parcelWeightKg: 3, deliveryType: "STANDARD" as const,
      productCost: 12000, deliveryCharge: 90, securityMoney: 120, totalCollectible: 12210,
      status: "PENDING" as const, createdAt: "2025-01-20T11:45:00Z", deliveryAttempts: 0,
    },
    {
      id: "vdkisd09zdgxf6csufb9x6t8", code: "PF-100260",
      merchantId: "uuz3r7ln1o2ipbr12rnowx2q", pickupLocationId: "i8407hm6he3upn30fse0qj4w",
      recipientName: "Nusrat Jahan", recipientPhone: "+8801844445566",
      deliveryAddress: "Flat 5C, Road 27, Gulshan 1, Dhaka", deliveryCity: "Dhaka",
      parcelWeightKg: 1.5, deliveryType: "STANDARD" as const,
      productCost: 2200, deliveryCharge: 65, securityMoney: 22, totalCollectible: 2287,
      status: "PENDING" as const, createdAt: "2025-01-20T15:20:00Z", deliveryAttempts: 0,
    },
    {
      id: "i91xwpi5kbbqozueb8y1hoqx", code: "PF-100261",
      merchantId: "ucteju8w92cww2x029etxv67", pickupLocationId: "hu22eapfey4srbcrn87uu8dy",
      recipientName: "Imtiaz Mahmud", recipientPhone: "+8801855556677",
      deliveryAddress: "House 22, Road 5, Dhanmondi, Dhaka", deliveryCity: "Dhaka",
      parcelWeightKg: 0.5, deliveryType: "FRAGILE" as const,
      productCost: 650, deliveryCharge: 60, securityMoney: 10, totalCollectible: 720,
      status: "PENDING" as const, createdAt: "2025-01-21T08:55:00Z", deliveryAttempts: 0,
    },
    {
      id: "ynq7gdy7f1bzvmtjipol9gvh", code: "PF-100262",
      merchantId: "ucteju8w92cww2x029etxv67", pickupLocationId: "hu22eapfey4srbcrn87uu8dy",
      recipientName: "Adnan Sami", recipientPhone: "+8801866667788",
      deliveryAddress: "Flat 4A, Road 12, Banani, Dhaka", deliveryCity: "Dhaka",
      parcelWeightKg: 1.2, deliveryType: "STANDARD" as const,
      productCost: 1800, deliveryCharge: 75, securityMoney: 18, totalCollectible: 1893,
      status: "APPROVED" as const, createdAt: "2025-01-21T10:15:00Z", deliveryAttempts: 0,
      approvedBy: "Tanvir Hossain", approvedAt: "2025-01-21T10:40:00Z",
      pickupRiderId: "q4am2x0nkz1m2a2m47if7vra", assignedAt: "2025-01-21T10:41:00Z",
    },
    {
      id: "wkequtjhojn0fptvaekgd27w", code: "PF-100263",
      merchantId: "uuz3r7ln1o2ipbr12rnowx2q", pickupLocationId: "i8407hm6he3upn30fse0qj4w",
      recipientName: "Lamia Chowdhury", recipientPhone: "+8801877778899",
      deliveryAddress: "House 9, Road 27, Gulshan 1, Dhaka", deliveryCity: "Dhaka",
      parcelWeightKg: 2.5, deliveryType: "FRAGILE" as const,
      productCost: 3200, deliveryCharge: 95, securityMoney: 32, totalCollectible: 3327,
      status: "APPROVED" as const, createdAt: "2025-01-21T11:05:00Z", deliveryAttempts: 0,
      approvedBy: "Tanvir Hossain", approvedAt: "2025-01-21T11:30:00Z",
      pickupRiderId: "q4am2x0nkz1m2a2m47if7vra", assignedAt: "2025-01-21T11:31:00Z",
    },
    {
      id: "r5q5zhtr37xjlpmd91k8d48w", code: "PF-100264",
      merchantId: "ucteju8w92cww2x029etxv67", pickupLocationId: "hu22eapfey4srbcrn87uu8dy",
      recipientName: "Faria Tabassum", recipientPhone: "+8801888889900",
      deliveryAddress: "House 31, Road 8, Dhanmondi, Dhaka", deliveryCity: "Dhaka",
      parcelWeightKg: 1, deliveryType: "STANDARD" as const,
      productCost: 1500, deliveryCharge: 60, securityMoney: 15, totalCollectible: 1575,
      status: "PICKED_UP" as const, createdAt: "2025-01-21T09:10:00Z", deliveryAttempts: 0,
      approvedBy: "Tanvir Hossain", approvedAt: "2025-01-21T09:30:00Z",
      pickupRiderId: "wcsub4pe1pk4x5zd7gri7ee2", assignedAt: "2025-01-21T09:31:00Z",
      pickedUpAt: "2025-01-21T10:05:00Z",
    },
    {
      id: "t4sr2h9n3j7ml253k7a9m8xx", code: "PF-100265",
      merchantId: "uuz3r7ln1o2ipbr12rnowx2q", pickupLocationId: "i8407hm6he3upn30fse0qj4w",
      recipientName: "Sabbir Rahman", recipientPhone: "+8801899990011",
      deliveryAddress: "Flat 7B, Road 11, Banani, Dhaka", deliveryCity: "Dhaka",
      parcelWeightKg: 2.2, deliveryType: "FRAGILE" as const,
      productCost: 4200, deliveryCharge: 85, securityMoney: 42, totalCollectible: 4327,
      status: "PICKED_UP" as const, createdAt: "2025-01-21T09:40:00Z", deliveryAttempts: 0,
      approvedBy: "Sadia Karim", approvedAt: "2025-01-21T10:00:00Z",
      pickupRiderId: "gililvghb53wij1p965csiax", assignedAt: "2025-01-21T10:01:00Z",
      pickedUpAt: "2025-01-21T10:50:00Z",
    },
    {
      id: "lp77ebws2n5edjk3g21ebi6f", code: "PF-100266",
      merchantId: "ucteju8w92cww2x029etxv67", pickupLocationId: "hu22eapfey4srbcrn87uu8dy",
      recipientName: "Mizanur Rahman", recipientPhone: "+8801800001122",
      deliveryAddress: "House 5, Road 16, Dhanmondi, Dhaka", deliveryCity: "Dhaka",
      parcelWeightKg: 1.4, deliveryType: "STANDARD" as const,
      productCost: 2600, deliveryCharge: 70, securityMoney: 26, totalCollectible: 2696,
      status: "IN_WAREHOUSE" as const, createdAt: "2025-01-21T08:20:00Z", deliveryAttempts: 0,
      approvedBy: "Tanvir Hossain", approvedAt: "2025-01-21T08:45:00Z",
      pickupRiderId: "wcsub4pe1pk4x5zd7gri7ee2", assignedAt: "2025-01-21T08:46:00Z",
      pickedUpAt: "2025-01-21T09:30:00Z",
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7", receivedAtWarehouseAt: "2025-01-21T11:15:00Z", receivedByWarehouse: "Rifat Chowdhury",
    },
    {
      id: "uzcmncpas06zsjjc4q2bdbyi", code: "PF-100267",
      merchantId: "uuz3r7ln1o2ipbr12rnowx2q", pickupLocationId: "i8407hm6he3upn30fse0qj4w",
      recipientName: "Anika Tasnim", recipientPhone: "+8801800002233",
      deliveryAddress: "Flat 9C, Road 7, Uttara Sector 4, Dhaka", deliveryCity: "Dhaka",
      parcelWeightKg: 0.9, deliveryType: "FRAGILE" as const,
      productCost: 1100, deliveryCharge: 55, securityMoney: 11, totalCollectible: 1166,
      status: "IN_WAREHOUSE" as const, createdAt: "2025-01-21T08:55:00Z", deliveryAttempts: 0,
      approvedBy: "Sadia Karim", approvedAt: "2025-01-21T09:10:00Z",
      pickupRiderId: "q4am2x0nkz1m2a2m47if7vra", assignedAt: "2025-01-21T09:11:00Z",
      pickedUpAt: "2025-01-21T10:00:00Z",
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7", receivedAtWarehouseAt: "2025-01-21T11:40:00Z", receivedByWarehouse: "Rifat Chowdhury",
    },
    {
      id: "p3gfiuld4l805tixug8pwqjh", code: "PF-100268",
      merchantId: "ucteju8w92cww2x029etxv67", pickupLocationId: "hu22eapfey4srbcrn87uu8dy",
      recipientName: "Farhana Akter", recipientPhone: "+8801800003344",
      deliveryAddress: "House 22, Road 11, Banani, Dhaka", deliveryCity: "Dhaka",
      parcelWeightKg: 1.1, deliveryType: "STANDARD" as const,
      productCost: 1900, deliveryCharge: 60, securityMoney: 19, totalCollectible: 1979,
      status: "IN_TRANSIT" as const, createdAt: "2025-01-21T07:50:00Z", deliveryAttempts: 0,
      approvedBy: "Tanvir Hossain", approvedAt: "2025-01-21T08:05:00Z",
      pickupRiderId: "wcsub4pe1pk4x5zd7gri7ee2", assignedAt: "2025-01-21T08:06:00Z",
      pickedUpAt: "2025-01-21T08:50:00Z",
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7", receivedAtWarehouseAt: "2025-01-21T10:30:00Z", receivedByWarehouse: "Rifat Chowdhury",
      deliveryRiderId: "khelbntdjda5h8y3pa7etjd4", dispatchedAt: "2025-01-21T12:15:00Z", dispatchedBy: "Rifat Chowdhury",
    },
    {
      id: "wwywgid7ili0s9tw143wc4u0", code: "PF-100269",
      merchantId: "uuz3r7ln1o2ipbr12rnowx2q", pickupLocationId: "i8407hm6he3upn30fse0qj4w",
      recipientName: "Sabbir Ahmed", recipientPhone: "+8801800004455",
      deliveryAddress: "Flat 4B, Road 27, Dhanmondi, Dhaka", deliveryCity: "Dhaka",
      parcelWeightKg: 0.6, deliveryType: "STANDARD" as const,
      productCost: 850, deliveryCharge: 50, securityMoney: 9, totalCollectible: 909,
      status: "OUT_FOR_DELIVERY" as const, createdAt: "2025-01-21T07:20:00Z",
      approvedBy: "Sadia Karim", approvedAt: "2025-01-21T07:35:00Z",
      pickupRiderId: "q4am2x0nkz1m2a2m47if7vra", assignedAt: "2025-01-21T07:36:00Z",
      pickedUpAt: "2025-01-21T08:20:00Z",
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7", receivedAtWarehouseAt: "2025-01-21T10:05:00Z", receivedByWarehouse: "Rifat Chowdhury",
      deliveryRiderId: "khelbntdjda5h8y3pa7etjd4", dispatchedAt: "2025-01-21T12:10:00Z", dispatchedBy: "Rifat Chowdhury",
      outForDeliveryAt: "2025-01-21T13:00:00Z", deliveryAttempts: 1,
    },
    {
      id: "nxu47gm70g9snsbmqc3y6u9j", code: "PF-100270",
      merchantId: "ucteju8w92cww2x029etxv67", pickupLocationId: "hu22eapfey4srbcrn87uu8dy",
      recipientName: "Rumana Kabir", recipientPhone: "+8801800005566",
      deliveryAddress: "House 8, Road 3, Dhanmondi, Dhaka", deliveryCity: "Dhaka",
      parcelWeightKg: 1.3, deliveryType: "STANDARD" as const,
      productCost: 2400, deliveryCharge: 65, securityMoney: 24, totalCollectible: 2489,
      status: "FAILED_ATTEMPT" as const, createdAt: "2025-01-20T07:10:00Z",
      approvedBy: "Tanvir Hossain", approvedAt: "2025-01-20T07:30:00Z",
      pickupRiderId: "wcsub4pe1pk4x5zd7gri7ee2", assignedAt: "2025-01-20T07:31:00Z",
      pickedUpAt: "2025-01-20T08:20:00Z",
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7", receivedAtWarehouseAt: "2025-01-20T10:00:00Z", receivedByWarehouse: "Rifat Chowdhury",
      deliveryRiderId: "khelbntdjda5h8y3pa7etjd4", dispatchedAt: "2025-01-20T11:30:00Z", dispatchedBy: "Rifat Chowdhury",
      outForDeliveryAt: "2025-01-20T12:40:00Z", deliveryAttempts: 1,
      failedAttemptAt: "2025-01-20T15:20:00Z", failureNote: "Recipient not available, phone switched off after two calls.",
    },
    // ORD_15 — delivered, COD NOT yet settled (COD reconciliation queue)
    {
      id: "q7s1xm0ng2iz4niaqvm7vz4m", code: "PF-100271",
      merchantId: "ucteju8w92cww2x029etxv67", pickupLocationId: "hu22eapfey4srbcrn87uu8dy",
      recipientName: "Tahmid Khan", recipientPhone: "+8801800006677",
      deliveryAddress: "House 12, Road 9, Dhanmondi, Dhaka", deliveryCity: "Dhaka",
      parcelWeightKg: 1.6, deliveryType: "STANDARD" as const,
      productCost: 3400, deliveryCharge: 70, securityMoney: 34, totalCollectible: 3504,
      status: "DELIVERED" as const, createdAt: "2025-01-21T07:00:00Z",
      approvedBy: "Tanvir Hossain", approvedAt: "2025-01-21T07:20:00Z",
      pickupRiderId: "wcsub4pe1pk4x5zd7gri7ee2", assignedAt: "2025-01-21T07:21:00Z",
      pickedUpAt: "2025-01-21T08:10:00Z",
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7", receivedAtWarehouseAt: "2025-01-21T10:00:00Z", receivedByWarehouse: "Rifat Chowdhury",
      deliveryRiderId: "khelbntdjda5h8y3pa7etjd4", dispatchedAt: "2025-01-21T11:30:00Z", dispatchedBy: "Rifat Chowdhury",
      outForDeliveryAt: "2025-01-21T13:00:00Z", deliveredAt: "2025-01-21T15:10:00Z",
      deliveryProofRef: "proof_pf-100271.jpg", amountCollected: 3504, deliveryAttempts: 1,
    },
    // ORD_16 — delivered, COD NOT yet settled
    {
      id: "bir2621ivna3xm9ue2e51tiq", code: "PF-100272",
      merchantId: "uuz3r7ln1o2ipbr12rnowx2q", pickupLocationId: "i8407hm6he3upn30fse0qj4w",
      recipientName: "Nabila Rahman", recipientPhone: "+8801800007788",
      deliveryAddress: "Flat 6A, Road 11, Banani, Dhaka", deliveryCity: "Dhaka",
      parcelWeightKg: 2.4, deliveryType: "FRAGILE" as const,
      productCost: 6200, deliveryCharge: 95, securityMoney: 62, totalCollectible: 6357,
      status: "DELIVERED" as const, createdAt: "2025-01-21T06:30:00Z",
      approvedBy: "Sadia Karim", approvedAt: "2025-01-21T06:50:00Z",
      pickupRiderId: "q4am2x0nkz1m2a2m47if7vra", assignedAt: "2025-01-21T06:51:00Z",
      pickedUpAt: "2025-01-21T07:40:00Z",
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7", receivedAtWarehouseAt: "2025-01-21T09:30:00Z", receivedByWarehouse: "Rifat Chowdhury",
      deliveryRiderId: "khelbntdjda5h8y3pa7etjd4", dispatchedAt: "2025-01-21T11:00:00Z", dispatchedBy: "Rifat Chowdhury",
      outForDeliveryAt: "2025-01-21T12:30:00Z", deliveredAt: "2025-01-21T14:40:00Z",
      deliveryProofRef: "proof_pf-100272.jpg", amountCollected: 6357, deliveryAttempts: 1,
    },
  ];

  for (const row of baseOrders) {
    const exists = await db.select().from(order).where(eq(order.id, row.id));
    if (exists.length > 0) { log(`  skip order ${row.code}`); continue; }
    await db.insert(order).values(row);
    log(`  created order ${row.code}`);
  }
}

// ---------------------------------------------------------------------------
// 8. Payout requests
// ---------------------------------------------------------------------------

async function seedPayoutRequests() {
  log("Seeding payout requests…");

  const rows = [
    {
      id: "jokxrrtood7ik5zheahhzp1r",
      code: "PR-2041",
      merchantId: "uuz3r7ln1o2ipbr12rnowx2q",
      orderIds: ["wwywgid7ili0s9tw143wc4u0"] as string[], // ORD_17
      amount: 2800,
      status: "PENDING" as const,
      payoutMethod: "bKash",
      payoutDetails: "+8801712345602",
      requestedAt: "2025-01-19T09:30:00Z",
    },
    {
      id: "jybrz4o9bx5nefstz1drr1ex",
      code: "PR-2038",
      merchantId: "ucteju8w92cww2x029etxv67",
      orderIds: ["gvqst74z0k9azwudqedvfylw"] as string[], // ORD_18
      amount: 1500,
      status: "PAID" as const,
      payoutMethod: "Bank transfer",
      payoutDetails: "City Bank · A/C 1402300456789",
      requestedAt: "2025-01-15T10:00:00Z",
      reviewedBy: "Nadia Rahman",
      reviewedAt: "2025-01-15T14:00:00Z",
      paidAt: "2025-01-16T11:00:00Z",
    },
  ];

  for (const row of rows) {
    const exists = await db.select().from(payoutRequest).where(eq(payoutRequest.id, row.id));
    if (exists.length > 0) { log(`  skip payout request ${row.code}`); continue; }
    await db.insert(payoutRequest).values(row);
    log(`  created payout request ${row.code}`);
  }
}

// ---------------------------------------------------------------------------
// 9. Orders that reference payout requests (ORD_17, ORD_18)
// ---------------------------------------------------------------------------

async function seedPayoutLinkedOrders() {
  log("Seeding payout-linked orders…");

  const rows = [
    // ORD_17 — delivered + COD settled, attached to PR_01 (PENDING)
    {
      id: "l0n1vgduq8v5sbq0i44c9i40", code: "PF-100273",
      merchantId: "uuz3r7ln1o2ipbr12rnowx2q", pickupLocationId: "i8407hm6he3upn30fse0qj4w",
      recipientName: "Junaid Bashar", recipientPhone: "+8801800008899",
      deliveryAddress: "House 3, Road 27, Gulshan 1, Dhaka", deliveryCity: "Dhaka",
      parcelWeightKg: 1.2, deliveryType: "STANDARD" as const,
      productCost: 2800, deliveryCharge: 55, securityMoney: 28, totalCollectible: 2883,
      status: "DELIVERED" as const, createdAt: "2025-01-18T07:00:00Z",
      approvedBy: "Tanvir Hossain", approvedAt: "2025-01-18T07:20:00Z",
      pickupRiderId: "q4am2x0nkz1m2a2m47if7vra", assignedAt: "2025-01-18T07:21:00Z",
      pickedUpAt: "2025-01-18T08:10:00Z",
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7", receivedAtWarehouseAt: "2025-01-18T10:00:00Z", receivedByWarehouse: "Rifat Chowdhury",
      deliveryRiderId: "khelbntdjda5h8y3pa7etjd4", dispatchedAt: "2025-01-18T11:30:00Z", dispatchedBy: "Rifat Chowdhury",
      outForDeliveryAt: "2025-01-18T13:00:00Z", deliveredAt: "2025-01-18T15:10:00Z",
      deliveryProofRef: "proof_pf-100273.jpg", amountCollected: 2883, deliveryAttempts: 1,
      codSettledAt: "2025-01-18T18:00:00Z", codSettledBy: "Rifat Chowdhury",
      payoutRequestId: "jokxrrtood7ik5zheahhzp1r",
    },
    // ORD_18 — delivered + COD settled, attached to PR_02 (PAID)
    {
      id: "gvqst74z0k9azwudqedvfylw", code: "PF-100274",
      merchantId: "ucteju8w92cww2x029etxv67", pickupLocationId: "hu22eapfey4srbcrn87uu8dy",
      recipientName: "Mehjabin Haque", recipientPhone: "+8801800009900",
      deliveryAddress: "House 5, Road 16, Dhanmondi, Dhaka", deliveryCity: "Dhaka",
      parcelWeightKg: 0.9, deliveryType: "STANDARD" as const,
      productCost: 1500, deliveryCharge: 60, securityMoney: 15, totalCollectible: 1575,
      status: "DELIVERED" as const, createdAt: "2025-01-14T07:00:00Z",
      approvedBy: "Tanvir Hossain", approvedAt: "2025-01-14T07:20:00Z",
      pickupRiderId: "wcsub4pe1pk4x5zd7gri7ee2", assignedAt: "2025-01-14T07:21:00Z",
      pickedUpAt: "2025-01-14T08:10:00Z",
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7", receivedAtWarehouseAt: "2025-01-14T10:00:00Z", receivedByWarehouse: "Rifat Chowdhury",
      deliveryRiderId: "khelbntdjda5h8y3pa7etjd4", dispatchedAt: "2025-01-14T11:30:00Z", dispatchedBy: "Rifat Chowdhury",
      outForDeliveryAt: "2025-01-14T13:00:00Z", deliveredAt: "2025-01-14T15:10:00Z",
      deliveryProofRef: "proof_pf-100274.jpg", amountCollected: 1575, deliveryAttempts: 1,
      codSettledAt: "2025-01-14T18:00:00Z", codSettledBy: "Rifat Chowdhury",
      payoutRequestId: "jybrz4o9bx5nefstz1drr1ex",
    },
  ];

  for (const row of rows) {
    const exists = await db.select().from(order).where(eq(order.id, row.id));
    if (exists.length > 0) { log(`  skip order ${row.code}`); continue; }
    await db.insert(order).values(row);
    log(`  created order ${row.code}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== ParcelFlow seed starting ===\n");

  try {
    await seedWarehouses();
    await seedRiders();
    await seedMerchants();
    await seedPickupLocations();
    await seedSecurityConfig();
    await seedUsers();       // must come after warehouses (warehouseId FK in profile)
    await seedOrders();      // must come after riders + merchants + pickup locations
    await seedPayoutRequests();
    await seedPayoutLinkedOrders(); // must come after payout requests

    console.log("\n=== Seed complete ✓ ===");
  } catch (err) {
    console.error("\n[seed] ERROR:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
