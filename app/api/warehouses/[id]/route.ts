import { requireSession } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { db } from "@/lib/db"
import { order, profile, rider, warehouse } from "@/lib/db/schema"
import { parseBody, warehouseUpdateSchema } from "@/lib/validation"
import { and, eq, ne } from "drizzle-orm"
import { NextResponse } from "next/server"

// Super Admin edits a warehouse or toggles its active state.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const parsed = await parseBody(req, warehouseUpdateSchema)
  if (parsed.error) return parsed.error
  const { name, address, city, divisionId, isActive } = parsed.data

  const updates: {
    name?: string
    address?: string
    city?: string
    divisionId?: string
    isActive?: boolean
  } = {}

  if (name !== undefined) updates.name = name.trim()
  if (address !== undefined) updates.address = address.trim()
  if (city !== undefined) updates.city = city.trim()
  if (divisionId !== undefined) updates.divisionId = divisionId
  if (isActive !== undefined) updates.isActive = isActive

  // Block renaming onto another warehouse with the same name in the same city.
  if (updates.name !== undefined || updates.city !== undefined) {
    const [current] = await db
      .select({ name: warehouse.name, city: warehouse.city })
      .from(warehouse)
      .where(eq(warehouse.id, id))
      .limit(1)
    if (!current)
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    const nextName = updates.name ?? current.name
    const nextCity = updates.city ?? current.city
    const [clash] = await db
      .select({ id: warehouse.id })
      .from(warehouse)
      .where(
        and(
          eq(warehouse.name, nextName),
          eq(warehouse.city, nextCity),
          ne(warehouse.id, id),
        ),
      )
      .limit(1)
    if (clash) {
      return NextResponse.json(
        { error: "A warehouse with that name already exists in this city." },
        { status: 409 },
      )
    }
  }

  const [updated] = await db
    .update(warehouse)
    .set(updates)
    .where(eq(warehouse.id, id))
    .returning()

  if (!updated)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  await logAudit({
    actor: { userId: me.userId, name: me.name, role: me.role },
    action: "WAREHOUSE_UPDATED",
    entityType: "warehouse",
    entityId: updated.id,
    description: `Updated warehouse ${updated.name}`,
    metadata: updates,
  })

  return NextResponse.json(updated)
}

// Super Admin deletes a warehouse. Blocked if any order, rider, or team member
// still references it so no record is left pointing at a missing warehouse.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const [orderRef] = await db
    .select({ id: order.id })
    .from(order)
    .where(eq(order.warehouseId, id))
    .limit(1)
  const [riderRef] = await db
    .select({ id: rider.id })
    .from(rider)
    .where(eq(rider.warehouseId, id))
    .limit(1)
  const [profileRef] = await db
    .select({ userId: profile.userId })
    .from(profile)
    .where(eq(profile.warehouseId, id))
    .limit(1)

  if (orderRef || riderRef || profileRef) {
    return NextResponse.json(
      {
        error:
          "This warehouse is in use by orders, riders, or warehouse admins and cannot be deleted. Deactivate it instead.",
      },
      { status: 409 },
    )
  }

  const [existing] = await db
    .select({ name: warehouse.name })
    .from(warehouse)
    .where(eq(warehouse.id, id))
    .limit(1)

  await db.delete(warehouse).where(eq(warehouse.id, id))

  await logAudit({
    actor: { userId: me.userId, name: me.name, role: me.role },
    action: "WAREHOUSE_DELETED",
    entityType: "warehouse",
    entityId: id,
    description: `Deleted warehouse ${existing?.name ?? id}`,
  })

  return NextResponse.json({ ok: true })
}
