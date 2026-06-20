import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { merchant, order, rider } from "@/lib/db/schema"
import { orderApproveSchema, parseBody } from "@/lib/validation"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN" && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const parsed = await parseBody(req, orderApproveSchema)
  if (parsed.error) return parsed.error
  const { riderId } = parsed.data

  const [orderRow] = await db
    .select()
    .from(order)
    .where(eq(order.id, id))
    .limit(1)
  if (!orderRow)
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (orderRow.status !== "PENDING") {
    return NextResponse.json(
      { error: "Only PENDING orders can be approved" },
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
      { error: "Select an active pickup rider." },
      { status: 400 },
    )
  }
  if (riderRow.warehouseId) {
    return NextResponse.json(
      {
        error:
          "Select a pickup rider — this rider is a warehouse delivery rider.",
      },
      { status: 400 },
    )
  }

  // Weight compliance against the merchant's current pricing settings.
  const [merchantRow] = await db
    .select({ maxWeightKg: merchant.maxWeightKg })
    .from(merchant)
    .where(eq(merchant.id, orderRow.merchantId))
    .limit(1)

  if (merchantRow && orderRow.parcelWeightKg > merchantRow.maxWeightKg) {
    return NextResponse.json(
      {
        error: `Parcel weight exceeds the ${merchantRow.maxWeightKg} KG limit and cannot be approved.`,
      },
      { status: 400 },
    )
  }

  const now = new Date().toISOString()
  const [updated] = await db
    .update(order)
    .set({
      status: "APPROVED",
      approvedBy: me.name,
      approvedAt: now,
      pickupRiderId: riderId,
      assignedAt: now,
    })
    .where(eq(order.id, id))
    .returning()

  return NextResponse.json(updated)
}
