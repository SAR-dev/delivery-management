import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { division } from "@/lib/db/schema"
import { divisionCreateSchema, parseBody } from "@/lib/validation"
import { asc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

// Any signed-in user can read the division list (needed to populate address
// selectors across the app).
export async function GET() {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  const rows = await db.select().from(division).orderBy(asc(division.name))
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

  return NextResponse.json(created, { status: 201 })
}
