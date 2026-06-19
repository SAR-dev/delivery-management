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
  if (orderRow.status !== "PICKED_UP") {
    return NextResponse.json(
      { error: "Only PICKED_UP parcels can be received." },
      { status: 400 },
    )
  }

  const [updated] = await db
    .update(order)
    .set({
      status: "IN_WAREHOUSE",
      warehouseId: me.warehouseId,
      receivedAtWarehouseAt: new Date().toISOString(),
      receivedByWarehouse: me.name,
    })
    .where(eq(order.id, id))
    .returning()

  return NextResponse.json(updated)
}
