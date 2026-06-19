import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { order } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "WAREHOUSE_ADMIN" || !me.warehouseId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const [orderRow] = await db.select().from(order).where(eq(order.id, id)).limit(1)
  if (!orderRow) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (orderRow.status !== "FAILED_ATTEMPT") {
    return NextResponse.json(
      { error: "Only FAILED_ATTEMPT parcels can be reattempted." },
      { status: 400 },
    )
  }
  if (orderRow.warehouseId !== me.warehouseId) {
    return NextResponse.json(
      { error: "This parcel is held at a different warehouse." },
      { status: 400 },
    )
  }

  const now = new Date().toISOString()
  const [updated] = await db
    .update(order)
    .set({
      status: "OUT_FOR_DELIVERY",
      failureNote: null,
      failedAttemptAt: null,
      failedResolvedAt: now,
      failedResolvedBy: me.name,
      outForDeliveryAt: now,
      deliveryAttempts: (orderRow.deliveryAttempts ?? 0) + 1,
    })
    .where(eq(order.id, id))
    .returning()

  return NextResponse.json(updated)
}
