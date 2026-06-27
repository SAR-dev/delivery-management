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
    tableRowsPerPage: row.tableRowsPerPage,
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

// Update the signed-in user's own profile: display name, avatar (both on the
// `user` row), and/or table rows-per-page preference (on `profile`).
export async function PATCH(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json(null, { status: 401 })
  }

  const parsed = await parseBody(req, profileUpdateSchema)
  if (parsed.error) return parsed.error
  const { name, image, tableRowsPerPage } = parsed.data

  // Transaction: the name/image write (user table) and the rows-per-page
  // write (profile table) are two tables backing one logical "update my
  // account" action — keep them atomic even though today's UI only ever
  // sends one group at a time.
  const result = await db.transaction(async (tx) => {
    let updatedUser: Parameters<typeof serializeUser>[0] = session.user
    if (name !== undefined || image !== undefined) {
      const userUpdates: {
        name?: string
        image?: string | null
        updatedAt: string
      } = { updatedAt: new Date().toISOString() }
      if (name !== undefined) userUpdates.name = name
      if (image !== undefined) userUpdates.image = image
      const [row] = await tx
        .update(user)
        .set(userUpdates)
        .where(eq(user.id, session.user.id))
        .returning()
      updatedUser = { ...session.user, ...row }
    }

    if (tableRowsPerPage !== undefined) {
      await tx
        .update(profile)
        .set({ tableRowsPerPage })
        .where(eq(profile.userId, session.user.id))
    }

    const [profileRow] = await tx
      .select()
      .from(profile)
      .where(eq(profile.userId, session.user.id))
      .limit(1)

    return { updatedUser, profileRow }
  })

  if (!result.profileRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(serializeUser(result.updatedUser, result.profileRow))
}
