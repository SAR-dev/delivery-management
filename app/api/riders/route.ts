import { requireSession } from "@/lib/api-auth"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { profile, rider } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { parseBody, riderCreateSchema } from "@/lib/validation"
import { NextResponse } from "next/server"

export async function GET() {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  const rows = await db.select().from(rider)
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN" && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const parsed = await parseBody(req, riderCreateSchema)
  if (parsed.error) return parsed.error
  const { name, email, phone, zone, warehouseId } = parsed.data

  // 1. Create the rider profile row first so we have its id.
  const [createdRider] = await db
    .insert(rider)
    .values({
      name,
      phone,
      zone,
      warehouseId: warehouseId || null,
      isActive: true,
    })
    .returning()

  // 2. Create the auth account. Name is used as the initial password.
  let createdUser
  try {
    createdUser = await auth.api.createUser({
      body: { name, email, password: name, role: "RIDER" as "user" },
    })
  } catch (err) {
    // Roll back the rider row so we don't leave an orphan.
    await db.delete(rider).where(eq(rider.id, createdRider.id))
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create user account",
      },
      { status: 400 },
    )
  }

  // 3. Create the profile linking the auth user → rider row.
  await db.insert(profile).values({
    userId: createdUser.user.id,
    role: "RIDER",
    phone,
    isActive: true,
    riderId: createdRider.id,
  })

  return NextResponse.json(createdRider, { status: 201 })
}
