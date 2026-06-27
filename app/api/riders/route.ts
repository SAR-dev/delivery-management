import { requireSession } from "@/lib/api-auth"
import { forbidden, unauthorized } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { db } from "@/lib/db"
import { profile, rider, warehouse } from "@/lib/db/schema"
import { paginateResponse, parsePagination } from "@/lib/pagination"
import { getClientIp, rateLimit } from "@/lib/rate-limit"
import { and, eq, ilike, inArray, or, sql } from "drizzle-orm"
import { parseBody, riderCreateSchema } from "@/lib/validation"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const me = await requireSession()
  if (!me) return unauthorized()

  const { limit, offset } = parsePagination(req)
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
    const warehouseIds = db
      .select({ id: warehouse.id })
      .from(warehouse)
      .where(ilike(warehouse.name, likeQ))
    conditions.push(inArray(rider.warehouseId, warehouseIds))
    searchClause = or(...conditions)
  }

  // Warehouse Admins only manage the riders based at their own hub. Admins and
  // Super Admins see the full roster.
  if (me.role === "WAREHOUSE_ADMIN") {
    if (!me.warehouseId) return NextResponse.json(paginateResponse([], 0))
    const scopedWhere = searchClause
      ? and(eq(rider.warehouseId, me.warehouseId), searchClause)
      : eq(rider.warehouseId, me.warehouseId)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rider)
      .where(scopedWhere)

    let scopedQuery = db.select().from(rider).where(scopedWhere).$dynamic()
    if (limit !== undefined) scopedQuery = scopedQuery.limit(limit)
    if (offset !== undefined) scopedQuery = scopedQuery.offset(offset)

    const scoped = await scopedQuery
    return NextResponse.json(paginateResponse(scoped, count, limit, offset))
  }

  const where = searchClause
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(rider)
    .where(where)

  let q = db.select().from(rider).$dynamic()
  if (where) q = q.where(where)
  if (limit !== undefined) q = q.limit(limit)
  if (offset !== undefined) q = q.offset(offset)

  const rows = await q
  return NextResponse.json(paginateResponse(rows, count, limit, offset))
}

export async function POST(req: Request) {
  const me = await requireSession()
  if (!me) return unauthorized()
  if (me.role !== "SUPER_ADMIN" && me.role !== "ADMIN") {
    return forbidden()
  }

  const limited = rateLimit(`riders:${getClientIp(req)}`, 10, 60)
  if (limited) return limited

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

  // 2. Create the auth account with a random temporary password.
  const temporaryPassword = crypto.randomUUID()
  let createdUser
  try {
    createdUser = await auth.api.createUser({
      body: {
        name,
        email,
        password: temporaryPassword,
        role: "RIDER" as "user",
      },
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

  return NextResponse.json(
    { ...createdRider, temporaryPassword },
    { status: 201 },
  )
}
