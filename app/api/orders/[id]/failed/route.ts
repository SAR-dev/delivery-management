import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { order } from "@/lib/db/schema"
import { orderFailedSchema, parseBody } from "@/lib/validation"
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
  const parsed = await parseBody(req, orderFailedSchema)
  if (parsed.error) return parsed.error
  const { note } = parsed.data

  const [orderRow] = await db
    .select()
    .from(order)
    .where(eq(order.id, id))
    .limit(1)
  if (!orderRow)
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (orderRow.deliveryRiderId !== me.riderId) {
    return NextResponse.json(
      { error: "This delivery is not assigned to you." },
      { status: 403 },
    )
  }
  if (orderRow.status !== "OUT_FOR_DELIVERY") {
    return NextResponse.json(
      { error: "Only OUT_FOR_DELIVERY parcels can be marked failed." },
      { status: 400 },
    )
  }

  const [updated] = await db
    .update(order)
    .set({
      status: "FAILED_ATTEMPT",
      failedAttemptAt: new Date().toISOString(),
      failureNote: note.trim(),
    })
    .where(eq(order.id, id))
    .returning()

  return NextResponse.json(updated)
}
