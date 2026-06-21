import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import {
  division,
  merchant,
  order,
  pickupLocation,
  warehouse,
} from "@/lib/db/schema"
import { divisionUpdateSchema, parseBody } from "@/lib/validation"
import { and, eq, ne } from "drizzle-orm"
import { NextResponse } from "next/server"

// Super Admin renames a division or toggles its active state.
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
  const parsed = await parseBody(req, divisionUpdateSchema)
  if (parsed.error) return parsed.error
  const { name, isActive } = parsed.data

  const updates: { name?: string; isActive?: boolean } = {}
  if (name !== undefined) {
    const trimmed = name.trim()
    // Block renaming onto another division's name.
    const [clash] = await db
      .select({ id: division.id })
      .from(division)
      .where(and(eq(division.name, trimmed), ne(division.id, id)))
      .limit(1)
    if (clash) {
      return NextResponse.json(
        { error: "A division with that name already exists." },
        { status: 409 },
      )
    }
    updates.name = trimmed
  }
  if (isActive !== undefined) updates.isActive = isActive

  const [updated] = await db
    .update(division)
    .set(updates)
    .where(eq(division.id, id))
    .returning()

  if (!updated)
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(updated)
}

// Super Admin deletes a division. Blocked if any entity still references it so
// no address is left pointing at a missing division.
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

  const [warehouseRef] = await db
    .select({ id: warehouse.id })
    .from(warehouse)
    .where(eq(warehouse.divisionId, id))
    .limit(1)
  const [merchantRef] = await db
    .select({ id: merchant.id })
    .from(merchant)
    .where(eq(merchant.divisionId, id))
    .limit(1)
  const [pickupRef] = await db
    .select({ id: pickupLocation.id })
    .from(pickupLocation)
    .where(eq(pickupLocation.divisionId, id))
    .limit(1)
  const [orderRef] = await db
    .select({ id: order.id })
    .from(order)
    .where(eq(order.deliveryDivisionId, id))
    .limit(1)

  if (warehouseRef || merchantRef || pickupRef || orderRef) {
    return NextResponse.json(
      {
        error:
          "This division is in use by warehouses, merchants, pickup locations, or orders and cannot be deleted. Deactivate it instead.",
      },
      { status: 409 },
    )
  }

  await db.delete(division).where(eq(division.id, id))
  return NextResponse.json({ ok: true })
}
