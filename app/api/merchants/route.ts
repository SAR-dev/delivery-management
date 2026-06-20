import { requireSession } from "@/lib/api-auth"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { merchant, profile } from "@/lib/db/schema"
import { parsePagination } from "@/lib/pagination"
import { merchantRegisterSchema, parseBody } from "@/lib/validation"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  // A merchant only ever sees their own business row — no pagination needed.
  if (me.role === "MERCHANT" && me.merchantId) {
    const rows = await db
      .select()
      .from(merchant)
      .where(eq(merchant.id, me.merchantId))
    return NextResponse.json(rows)
  }

  const { limit, offset } = parsePagination(req)
  let q = db.select().from(merchant).$dynamic()
  if (limit !== undefined) q = q.limit(limit)
  if (offset !== undefined) q = q.offset(offset)

  const rows = await q
  return NextResponse.json(rows)
}

// Public registration — no requireSession() guard. Called from the sign-up page.
export async function POST(req: Request) {
  const parsed = await parseBody(req, merchantRegisterSchema)
  if (parsed.error) return parsed.error
  const { businessName, ownerName, email, phone, address, password } =
    parsed.data

  // 1. Insert the merchant row first (no dependency on the Better Auth user).
  const [newMerchant] = await db
    .insert(merchant)
    .values({
      businessName,
      ownerName,
      email,
      phone,
      address,
      status: "PENDING",
      baseRate: 0,
      extraRatePerKg: 0,
      freeWeightKg: 1,
      maxWeightKg: 3,
    })
    .returning()

  // 2. Create the Better Auth user (createUser throws on failure).
  let created
  try {
    created = await auth.api.createUser({
      // The app's real role lives in the `profile` table; Better Auth's admin
      // plugin only types `role` as "user" | "admin", so cast to satisfy it.
      body: { name: ownerName, email, password, role: "MERCHANT" as "user" },
    })
  } catch (err) {
    // Roll back the merchant row so a failed sign-up doesn't leave an orphan.
    await db.delete(merchant).where(eq(merchant.id, newMerchant.id))
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not create user account",
      },
      { status: 400 },
    )
  }

  // 3. Link the Better Auth user to the merchant row via the profile table.
  await db.insert(profile).values({
    userId: created.user.id,
    role: "MERCHANT",
    phone,
    isActive: true,
    canManagePricing: false,
    merchantId: newMerchant.id,
  })

  return NextResponse.json(newMerchant, { status: 201 })
}
