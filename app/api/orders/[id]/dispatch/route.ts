import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { order, rider } from "@/lib/db/schema"
import { orderDispatchSchema, parseBody } from "@/lib/validation"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "WAREHOUSE_ADMIN" || !me.warehouseId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const parsed = await parseBody(req, orderDispatchSchema)
  if (parsed.error) return parsed.error
  const { riderId } = parsed.data

  const [orderRow] = await db
    .select()
    .from(order)
    .where(eq(order.id, id))
    .limit(1)
  if (!orderRow)
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (orderRow.status !== "IN_WAREHOUSE") {
    return NextResponse.json(
      { error: "Only IN_WAREHOUSE parcels can be dispatched." },
      { status: 400 },
    )
  }
  if (orderRow.warehouseId !== me.warehouseId) {
    return NextResponse.json(
      { error: "This parcel is held at a different warehouse." },
      { status: 400 },
    )
  }

  const [riderRow] = await db
    .select()
    .from(rider)
    .where(eq(rider.id, riderId))
    .limit(1)
  if (!riderRow || !riderRow.isActive) {
    return NextResponse.json(
      { error: "Select an active delivery rider." },
      { status: 400 },
    )
  }
  if (riderRow.warehouseId !== me.warehouseId) {
    return NextResponse.json(
      { error: "Select a delivery rider based at this warehouse." },
      { status: 400 },
    )
  }

  const [updated] = await db
    .update(order)
    .set({
      status: "IN_TRANSIT",
      deliveryRiderId: riderId,
      dispatchedAt: new Date().toISOString(),
      dispatchedBy: me.name,
    })
    .where(eq(order.id, id))
    .returning()

  return NextResponse.json(updated)
}
