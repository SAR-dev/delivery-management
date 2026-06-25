import { requireSession } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { db } from "@/lib/db"
import { division } from "@/lib/db/schema"
import { divisionCreateSchema, parseBody } from "@/lib/validation"
import { asc, eq, ilike } from "drizzle-orm"
import { NextResponse } from "next/server"

// Any signed-in user can read the division list (needed to populate address
// selectors across the app).
export async function GET(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  const search = new URL(req.url).searchParams.get("q")?.trim()
  let q = db.select().from(division).$dynamic()
  if (search) q = q.where(ilike(division.name, `%${search}%`))

  const rows = await q.orderBy(asc(division.name))
  return NextResponse.json(rows)
}

// Only Super Admins manage the division list.
export async function POST(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const parsed = await parseBody(req, divisionCreateSchema)
  if (parsed.error) return parsed.error
  const name = parsed.data.name.trim()

  // Reject duplicates (case-insensitive) before hitting the unique constraint.
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
