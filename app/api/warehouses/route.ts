import { requireSession } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { db } from "@/lib/db"
import { division, warehouse } from "@/lib/db/schema"
import { paginateResponse, parsePagination } from "@/lib/pagination"
import { parseBody, warehouseCreateSchema } from "@/lib/validation"
import { and, eq, ilike, inArray, or, sql } from "drizzle-orm"
import { forbidden, unauthorized } from "@/lib/api-response"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const me = await requireSession()
  if (!me) return unauthorized()

  const { limit, offset } = parsePagination(req)
  const search = new URL(req.url).searchParams.get("q")?.trim()
  let where
  if (search) {
    const likeQ = `%${search}%`
    const conditions = [
      ilike(warehouse.name, likeQ),
      ilike(warehouse.address, likeQ),
      ilike(warehouse.city, likeQ),
    ]
    const [{ count: divisionMatchCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(division)
      .where(ilike(division.name, likeQ))
    if (divisionMatchCount > 0) {
      const divisionIds = db
        .select({ id: division.id })
        .from(division)
        .where(ilike(division.name, likeQ))
      conditions.push(inArray(warehouse.divisionId, divisionIds))
    }
    where = or(...conditions)
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(warehouse)
    .where(where)

  let q = db.select().from(warehouse).$dynamic()
  if (where) q = q.where(where)
  if (limit !== undefined) q = q.limit(limit)
  if (offset !== undefined) q = q.offset(offset)

  const rows = await q
  return NextResponse.json(paginateResponse(rows, count, limit, offset))
}

export async function POST(req: Request) {
  const me = await requireSession()
  if (!me) return unauthorized()
  if (me.role !== "SUPER_ADMIN") {
    return forbidden()
  }

  const parsed = await parseBody(req, warehouseCreateSchema)
  if (parsed.error) return parsed.error
  const { name, address, city, divisionId } = parsed.data

  const [existing] = await db
    .select({ id: warehouse.id })
    .from(warehouse)
    .where(
      and(eq(warehouse.name, name.trim()), eq(warehouse.city, city.trim())),
    )
    .limit(1)
  if (existing) {
    return NextResponse.json(
      { error: "A warehouse with that name already exists in this city." },
      { status: 409 },
    )
  }

  const [created] = await db
    .insert(warehouse)
    .values({
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      divisionId,
      isActive: true,
    })
    .returning()

  await logAudit({
    actor: { userId: me.userId, name: me.name, role: me.role },
    action: "WAREHOUSE_CREATED",
    entityType: "warehouse",
    entityId: created.id,
    description: `Created warehouse ${created.name} (${created.city})`,
  })

  return NextResponse.json(created, { status: 201 })
}
