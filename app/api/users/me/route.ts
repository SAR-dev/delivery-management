import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { profile, user } from "@/lib/db/schema"
import { parseBody, profileUpdateSchema } from "@/lib/validation"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

// Serializes a Better Auth user row + its profile row into the app-level User
// shape consumed by the client (mirrors the GET response below).
function serializeUser(
  u: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image?: string | null
    createdAt: string | Date
    updatedAt: string | Date
  },
  row: typeof profile.$inferSelect,
) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    image: u.image ?? null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    role: row.role,
    phone: row.phone,
    isActive: row.isActive,
    canManagePricing: row.canManagePricing,
    warehouseId: row.warehouseId,
    merchantId: row.merchantId,
    riderId: row.riderId,
  }
}

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

  return NextResponse.json(serializeUser(session.user, row))
}

// Update the signed-in user's own profile (currently just their display name).
export async function PATCH(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json(null, { status: 401 })
  }

  const parsed = await parseBody(req, profileUpdateSchema)
  if (parsed.error) return parsed.error

  const updates: { name?: string; image?: string | null; updatedAt: string } = {
    updatedAt: new Date().toISOString(),
  }
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.image !== undefined) updates.image = parsed.data.image

  const [updatedUser] = await db
    .update(user)
    .set(updates)
    .where(eq(user.id, session.user.id))
    .returning()

  const [row] = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, session.user.id))
    .limit(1)

  if (!row) {
    return NextResponse.json(null, { status: 404 })
  }

  return NextResponse.json(
    serializeUser({ ...session.user, ...updatedUser }, row),
  )
}
