import { requireSession } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { db } from "@/lib/db"
import { division } from "@/lib/db/schema"
import { paginateResponse, parsePagination, parseSort } from "@/lib/pagination"
import { divisionCreateSchema, parseBody } from "@/lib/validation"
import { asc, desc, eq, ilike, sql } from "drizzle-orm"
import { forbidden, unauthorized } from "@/lib/api-response"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const me = await requireSession()
  if (!me) return unauthorized()

  const { limit, offset } = parsePagination(req)
  const search = new URL(req.url).searchParams.get("q")?.trim()
  const where = search ? ilike(division.name, `%${search}%`) : undefined

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(division)
    .where(where)

  let q = db.select().from(division).$dynamic()
  if (where) q = q.where(where)

  const sortColumnMap = {
    name: division.name,
    isActive: division.isActive,
  }
  const sort = parseSort(req, sortColumnMap)
  if (sort) {
    q =
      sort.direction === "asc"
        ? q.orderBy(asc(sort.column))
        : q.orderBy(desc(sort.column))
  } else {
    q = q.orderBy(asc(division.name))
  }

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

  const parsed = await parseBody(req, divisionCreateSchema)
  if (parsed.error) return parsed.error
  const name = parsed.data.name.trim()

  const [existing] = await db
    .select({ id: division.id })
    .from(division)
    .where(eq(division.name, name))
    .limit(1)
  if (existing) {
    return NextResponse.json(
      { error: "A division with that name already exists." },
      { status: 409 },
    )
  }

  const [created] = await db
    .insert(division)
    .values({ name, isActive: true })
    .returning()

  await logAudit({
    actor: { userId: me.userId, name: me.name, role: me.role },
    action: "DIVISION_CREATED",
    entityType: "division",
    entityId: created.id,
    description: `Created division ${created.name}`,
  })

  return NextResponse.json(created, { status: 201 })
}
