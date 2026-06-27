import { requireSession } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { db } from "@/lib/db"
import { announcement } from "@/lib/db/schema"
import { forbidden, unauthorized } from "@/lib/api-response"
import { paginateResponse, parsePagination, parseSort } from "@/lib/pagination"
import { announcementCreateSchema, parseBody } from "@/lib/validation"
import { asc, desc, ilike, sql } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const me = await requireSession()
  if (!me) return unauthorized()

  const { limit, offset } = parsePagination(req)
  const search = new URL(req.url).searchParams.get("q")?.trim()
  const where = search ? ilike(announcement.title, `%${search}%`) : undefined

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(announcement)
    .where(where)

  let q = db.select().from(announcement).$dynamic()
  if (where) q = q.where(where)

  const sortColumnMap = {
    title: announcement.title,
    publishedAt: announcement.publishedAt,
    expiresAt: announcement.expiresAt,
    isActive: announcement.isActive,
    createdAt: announcement.createdAt,
  }
  const sort = parseSort(req, sortColumnMap)
  if (sort) {
    q =
      sort.direction === "asc"
        ? q.orderBy(asc(sort.column))
        : q.orderBy(desc(sort.column))
  } else {
    q = q.orderBy(desc(announcement.createdAt))
  }

  if (limit !== undefined) q = q.limit(limit)
  if (offset !== undefined) q = q.offset(offset)

  const rows = await q
  return NextResponse.json(paginateResponse(rows, count, limit, offset))
}

export async function POST(req: Request) {
  const me = await requireSession()
  if (!me) return unauthorized()
  if (me.role !== "SUPER_ADMIN" && me.role !== "ADMIN") return forbidden()

  const parsed = await parseBody(req, announcementCreateSchema)
  if (parsed.error) return parsed.error

  const { title, content, publishedAt, expiresAt, isActive, targetRoles } =
    parsed.data

  const [created] = await db
    .insert(announcement)
    .values({
      title,
      content,
      publishedAt: publishedAt ?? null,
      expiresAt: expiresAt ?? null,
      isActive: isActive ?? true,
      targetRoles,
      createdBy: me.name,
    })
    .returning()

  await logAudit({
    actor: { userId: me.userId, name: me.name, role: me.role },
    action: "ANNOUNCEMENT_CREATED",
    entityType: "announcement",
    entityId: created.id,
    description: `Created announcement "${created.title}"`,
  })

  return NextResponse.json(created, { status: 201 })
}
