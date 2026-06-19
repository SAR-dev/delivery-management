import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { profile, user } from "@/lib/db/schema"
import { inArray, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET() {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  if (me.role !== "SUPER_ADMIN" && me.role !== "ADMIN") {
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
