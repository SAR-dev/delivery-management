import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { warehouse } from "@/lib/db/schema"
import { parseBody, warehouseCreateSchema } from "@/lib/validation"
import { and, eq, ilike, or } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  const search = new URL(req.url).searchParams.get("q")?.trim()
  let q = db.select().from(warehouse).$dynamic()
  if (search) {
    const likeQ = `%${search}%`
    q = q.where(
      or(
        ilike(warehouse.name, likeQ),
        ilike(warehouse.address, likeQ),
        ilike(warehouse.city, likeQ),
      ),
    )
  }

  const rows = await q
  return NextResponse.json(rows)
}

// Only Super Admins create warehouses.
export async function POST(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const parsed = await parseBody(req, warehouseCreateSchema)
  if (parsed.error) return parsed.error
  const { name, address, city, divisionId } = parsed.data

  // Reject duplicate name within the same city before insert.
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

  return NextResponse.json(created, { status: 201 })
}
