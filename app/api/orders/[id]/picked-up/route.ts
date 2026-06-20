import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { order, warehouse } from "@/lib/db/schema"
import { and, eq, ilike } from "drizzle-orm"
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

  // Route the parcel to the active hub serving its destination city. Pickup
  // riders aren't tied to a warehouse (approve route enforces this), so the
  // destination is the only reliable signal for which hub should receive it.
  // If no hub serves the city, leave warehouseId null — the order stays in the
  // shared incoming queue (orders GET fallback) so it can never disappear.
  const [destinationWarehouse] = await db
    .select({ id: warehouse.id })
    .from(warehouse)
    .where(
      and(
        eq(warehouse.isActive, true),
        ilike(warehouse.city, orderRow.deliveryCity),
      ),
    )
    .limit(1)

  const [updated] = await db
    .update(order)
    .set({
      status: "PICKED_UP",
      pickedUpAt: new Date().toISOString(),
      warehouseId: destinationWarehouse?.id ?? null,
    })
    .where(eq(order.id, id))
    .returning()

  return NextResponse.json(updated)
}
