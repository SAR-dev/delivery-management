import { requireSession } from "@/lib/api-auth"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { profile, user, warehouse } from "@/lib/db/schema"
import { parseBody, teamCreateSchema } from "@/lib/validation"
import { inArray, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET() {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  // Only the Super Admin manages the Admin / Warehouse Admin roster.
  if (me.role !== "SUPER_ADMIN") {
    return NextResponse.json([], { status: 200 })
  }

  const rows = await db
    .select()
    .from(profile)
    .innerJoin(user, eq(profile.userId, user.id))
    .where(inArray(profile.role, ["SUPER_ADMIN", "ADMIN", "WAREHOUSE_ADMIN"]))

  const team = rows.map(({ profile: p, user: u }) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    role: p.role,
    phone: p.phone,
    isActive: p.isActive,
    canManagePricing: p.canManagePricing,
    warehouseId: p.warehouseId,
    merchantId: p.merchantId,
    riderId: p.riderId,
  }))

  return NextResponse.json(team)
}

export async function POST(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const parsed = await parseBody(req, teamCreateSchema)
  if (parsed.error) return parsed.error
  const {
    name,
    email,
    phone,
    role: newRole,
    warehouseId,
    canManagePricing,
    password,
  } = parsed.data

  // Use the admin plugin (no headers passed) so the caller's own session
  // cookie is untouched. createUser throws on failure.
  let created
  try {
    created = await auth.api.createUser({
      // The app's real role lives in the `profile` table; Better Auth's admin
      // plugin only types `role` as "user" | "admin", so cast to satisfy it.
      body: { name, email, password, role: newRole as "user" },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create user" },
      { status: 400 },
    )
  }

  await db.insert(profile).values({
    userId: created.user.id,
    role: newRole,
    phone,
    isActive: true,
    canManagePricing: newRole === "ADMIN" ? (canManagePricing ?? false) : false,
    warehouseId: newRole === "WAREHOUSE_ADMIN" ? (warehouseId ?? null) : null,
  })

  // Keep warehouse.managedBy in sync so the assigned warehouse reflects its
  // new manager (and is no longer offered as "unassigned" elsewhere).
  if (newRole === "WAREHOUSE_ADMIN" && warehouseId) {
    await db
      .update(warehouse)
      .set({ managedBy: created.user.id })
      .where(eq(warehouse.id, warehouseId))
  }

  const [profileRow] = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, created.user.id))
    .limit(1)

  return NextResponse.json(
    {
      id: created.user.id,
      name: created.user.name,
      email: created.user.email,
      emailVerified: created.user.emailVerified,
      createdAt: created.user.createdAt,
      updatedAt: created.user.updatedAt,
      role: profileRow.role,
      phone: profileRow.phone,
      isActive: profileRow.isActive,
      canManagePricing: profileRow.canManagePricing,
      warehouseId: profileRow.warehouseId,
      merchantId: profileRow.merchantId,
      riderId: profileRow.riderId,
    },
    { status: 201 },
  )
}
