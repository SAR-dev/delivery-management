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
  if (me.role !== "RIDER" || !me.riderId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const [orderRow] = await db.select().from(order).where(eq(order.id, id)).limit(1)
  if (!orderRow) return NextResponse.json({ error: "Order not found" }, { status: 404 })
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

  const [updated] = await db
    .update(order)
    .set({ status: "PICKED_UP", pickedUpAt: new Date().toISOString() })
    .where(eq(order.id, id))
    .returning()

  return NextResponse.json(updated)
}
