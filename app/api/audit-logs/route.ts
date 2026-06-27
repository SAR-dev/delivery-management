import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { auditLog } from "@/lib/db/schema"
import { paginateResponse, parsePagination, parseSort } from "@/lib/pagination"
import { asc, desc, ilike, or, sql } from "drizzle-orm"
import { unauthorized } from "@/lib/api-response"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const me = await requireSession()
  if (!me) return unauthorized()
  if (me.role !== "SUPER_ADMIN" && me.role !== "ADMIN") {
    return NextResponse.json(paginateResponse([], 0), { status: 200 })
  }

  const { limit, offset } = parsePagination(req)
  const search = new URL(req.url).searchParams.get("q")?.trim()
  const where = search
    ? (() => {
        const likeQ = `%${search}%`
        return or(
          ilike(auditLog.actorName, likeQ),
          ilike(auditLog.action, likeQ),
          ilike(auditLog.entityType, likeQ),
          ilike(auditLog.description, likeQ),
        )
      })()
    : undefined

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLog)
    .where(where)

  let q = db.select().from(auditLog).$dynamic()
  if (where) q = q.where(where)

  const sortColumnMap = {
    createdAt: auditLog.createdAt,
    actor: auditLog.actorName,
    actorRole: auditLog.actorRole,
    action: auditLog.action,
    entity: auditLog.entityType,
  }
  const sort = parseSort(req, sortColumnMap)
  if (sort) {
    q =
      sort.direction === "asc"
        ? q.orderBy(asc(sort.column))
        : q.orderBy(desc(sort.column))
  } else {
    q = q.orderBy(desc(auditLog.createdAt))
  }

  if (limit !== undefined) q = q.limit(limit)
  if (offset !== undefined) q = q.offset(offset)

  const rows = await q
  return NextResponse.json(paginateResponse(rows, count, limit, offset))
}
