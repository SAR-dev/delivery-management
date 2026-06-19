import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json(null, { status: 401 })
  }

  const [row] = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, session.user.id))
    .limit(1)

  if (!row) {
    return NextResponse.json(null, { status: 404 })
  }

  return NextResponse.json({
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
    createdAt: session.user.createdAt,
    updatedAt: session.user.updatedAt,
    role: row.role,
    phone: row.phone,
    isActive: row.isActive,
    canManagePricing: row.canManagePricing,
    warehouseId: row.warehouseId,
    merchantId: row.merchantId,
    riderId: row.riderId,
  })
}
