import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { order } from "@/lib/db/schema"
import { orderDeliveredSchema, parseBody } from "@/lib/validation"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "RIDER" || !me.riderId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const parsed = await parseBody(req, orderDeliveredSchema)
  if (parsed.error) return parsed.error
  const { proofRef } = parsed.data

  const [orderRow] = await db.select().from(order).where(eq(order.id, id)).limit(1)
  if (!orderRow) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (orderRow.deliveryRiderId !== me.riderId) {
    return NextResponse.json(
      { error: "This delivery is not assigned to you." },
      { status: 403 },
    )
  }
  if (orderRow.status !== "OUT_FOR_DELIVERY") {
    return NextResponse.json(
      { error: "Only OUT_FOR_DELIVERY parcels can be marked delivered." },
      { status: 400 },
    )
  }

  const [updated] = await db
    .update(order)
    .set({
      status: "DELIVERED",
      deliveredAt: new Date().toISOString(),
      deliveryProofRef: proofRef ?? `proof_${orderRow.code.toLowerCase()}.jpg`,
      amountCollected: orderRow.totalCollectible,
    })
    .where(eq(order.id, id))
    .returning()

  return NextResponse.json(updated)
}
