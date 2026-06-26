import { requireSession } from "@/lib/api-auth"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { db } from "@/lib/db"
import { profile, rider, warehouse } from "@/lib/db/schema"
import { and, eq, ilike, inArray, or, sql } from "drizzle-orm"
import { parseBody, riderCreateSchema } from "@/lib/validation"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  const search = new URL(req.url).searchParams.get("q")?.trim()
  let searchClause
  if (search) {
    const likeQ = `%${search}%`
    const conditions = [
      ilike(rider.name, likeQ),
      ilike(rider.phone, likeQ),
      ilike(rider.zone, likeQ),
      ilike(rider.taskType, likeQ),
    ]
    // Also search by warehouse name.
    const [{ count: warehouseMatchCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(warehouse)
      .where(ilike(warehouse.name, likeQ))
    if (warehouseMatchCount > 0) {
      const warehouseIds = db
        .select({ id: warehouse.id })
        .from(warehouse)
        .where(ilike(warehouse.name, likeQ))
      conditions.push(inArray(rider.warehouseId, warehouseIds))
    }
    searchClause = or(...conditions)
  }

  // Warehouse Admins only manage the riders based at their own hub. Admins and
  // Super Admins see the full roster.
  if (me.role === "WAREHOUSE_ADMIN") {
    if (!me.warehouseId) return NextResponse.json([])
    const scopedWhere = searchClause
      ? and(eq(rider.warehouseId, me.warehouseId), searchClause)
      : eq(rider.warehouseId, me.warehouseId)
    const scoped = await db.select().from(rider).where(scopedWhere)
    return NextResponse.json(scoped)
  }

  const rows = searchClause
    ? await db.select().from(rider).where(searchClause)
    : await db.select().from(rider)
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
  const { name, email, phone, zone, warehouseId, taskType } = parsed.data

  // 1. Create the rider profile row first so we have its id.
  const [createdRider] = await db
    .insert(rider)
    .values({
      name,
      phone,
      zone,
      warehouseId,
      taskType: taskType ?? "DELIVERY",
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

  await logAudit({
    actor: { userId: me.userId, name: me.name, role: me.role },
    action: "RIDER_CREATED",
    entityType: "rider",
    entityId: createdRider.id,
    description: `Created rider ${createdRider.name} (${createdRider.zone})`,
  })

  return NextResponse.json(createdRider, { status: 201 })
}
