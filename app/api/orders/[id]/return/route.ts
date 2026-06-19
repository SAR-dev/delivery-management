import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { order } from "@/lib/db/schema"
import { orderReturnSchema, parseBody } from "@/lib/validation"
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
  const parsed = await parseBody(req, orderReturnSchema)
  if (parsed.error) return parsed.error
  const { reason } = parsed.data

  const [orderRow] = await db.select().from(order).where(eq(order.id, id)).limit(1)
  if (!orderRow) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (orderRow.status !== "FAILED_ATTEMPT") {
    return NextResponse.json(
      { error: "Only FAILED_ATTEMPT parcels can be returned." },
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
      status: "RETURNED",
      failedResolvedAt: now,
      failedResolvedBy: me.name,
      returnedAt: now,
      returnReason: reason.trim(),
    })
    .where(eq(order.id, id))
    .returning()

  return NextResponse.json(updated)
}
