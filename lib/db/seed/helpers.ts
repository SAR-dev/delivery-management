/**
 * lib/db/seed/helpers.ts
 *
 * Shared utilities for all seed modules.
 */

import "dotenv/config"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { profile, user } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { SEED_CREDENTIALS } from "../seed-credentials"

// ---------------------------------------------------------------------------
// Division IDs — stable so seeded entities can reference them by name.
// ---------------------------------------------------------------------------

export const DIVISION_IDS = {
  Dhaka: "division_dhaka",
  Chattogram: "division_chattogram",
  Khulna: "division_khulna",
  Rajshahi: "division_rajshahi",
  Barishal: "division_barishal",
  Sylhet: "division_sylhet",
  Rangpur: "division_rangpur",
  Mymensingh: "division_mymensingh",
} as const

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------

export const MIN_MODE = process.argv.includes("--min")

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function log(msg: string) {
  console.log(`[seed] ${msg}`)
}

/** Shorthand to pull { email, password } from SEED_CREDENTIALS by email. */
export function cred(email: string) {
  const c = SEED_CREDENTIALS.find((u) => u.email === email)
  if (!c) throw new Error(`No seed credential found for ${email}`)
  return { email: c.email, password: c.password }
}

/** Create a Better Auth user + our profile row in one step. */
export async function createUser(input: {
  id: string
  name: string
  email: string
  password: string
  phone: string
  role: "SUPER_ADMIN" | "ADMIN" | "WAREHOUSE_ADMIN" | "MERCHANT" | "RIDER"
  isActive?: boolean
  canManagePricing?: boolean
  warehouseId?: string | null
  merchantId?: string | null
  riderId?: string | null
}) {
  const existing = await db
    .select()
    .from(user)
    .where(eq(user.email, input.email))
    .limit(1)
  if (existing.length > 0) {
    log(`  skip user ${input.email} (already exists)`)
    return
  }

  await auth.api.createUser({
    body: {
      name: input.name,
      email: input.email,
      password: input.password,
    },
  })

  const created = await db
    .select()
    .from(user)
    .where(eq(user.email, input.email))
    .limit(1)
  const baUser = created[0]
  if (!baUser) throw new Error(`Failed to create user ${input.email}`)

  await db.insert(profile).values({
    userId: baUser.id,
    role: input.role,
    phone: input.phone,
    isActive: input.isActive ?? true,
    canManagePricing: input.canManagePricing ?? false,
    warehouseId: input.warehouseId ?? null,
    merchantId: input.merchantId ?? null,
    riderId: input.riderId ?? null,
  })

  log(`  created user ${input.email} (${input.role})`)
}
