import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { order, pickupLocation, warehouse } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "RIDER" || !me.riderId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const [orderRow] = await db
    .select()
    .from(order)
    .where(eq(order.id, id))
    .limit(1)
  if (!orderRow)
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (orderRow.pickupRiderId !== me.riderId) {
    return NextResponse.json(
      { error: "This pickup is not assigned to you." },
      { status: 403 },
    )
  }
  if (orderRow.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Only APPROVED orders can be picked up." },
      { status: 400 },
    )
  }

  // Route the parcel to an active hub in the SAME division it was picked up
  // from: "picked up in division A → submitted to a warehouse of division A".
  // The pickup location carries the division, so resolve it from there.
  // If the division has no active hub, leave warehouseId null — the order
  // stays in the shared incoming queue (orders GET fallback) so it can never
  // disappear.
  let destinationWarehouseId: string | null = null

  const [pickup] = await db
    .select({ divisionId: pickupLocation.divisionId })
    .from(pickupLocation)
    .where(eq(pickupLocation.id, orderRow.pickupLocationId))
    .limit(1)

  if (pickup?.divisionId) {
    const [hub] = await db
      .select({ id: warehouse.id })
      .from(warehouse)
      .where(
        and(
          eq(warehouse.isActive, true),
          eq(warehouse.divisionId, pickup.divisionId),
        ),
      )
      .limit(1)
    destinationWarehouseId = hub?.id ?? null
  }

  const [updated] = await db
    .update(order)
    .set({
      status: "PICKED_UP",
      pickedUpAt: new Date().toISOString(),
      warehouseId: destinationWarehouseId,
    })
    .where(eq(order.id, id))
    .returning()

  return NextResponse.json(updated)
}
