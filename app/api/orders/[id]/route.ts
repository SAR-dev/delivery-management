import { requireSession } from "@/lib/api-auth"
import { notFound, unauthorized } from "@/lib/api-response"
import { db } from "@/lib/db"
import { order, merchant } from "@/lib/db/schema"
import { and, eq, inArray, isNull, or } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSession()
  if (!me) return unauthorized()

  const { id } = await params

  // Build the same role-based scope as the list endpoint.
  let scope
  switch (me.role) {
    case "MERCHANT":
      if (!me.merchantId) return notFound()
      scope = eq(order.merchantId, me.merchantId)
      break
    case "RIDER":
      if (!me.riderId) return notFound()
      scope = or(
        eq(order.pickupRiderId, me.riderId),
        eq(order.deliveryRiderId, me.riderId),
      )
      break
    case "WAREHOUSE_ADMIN":
      if (!me.warehouseId) return notFound()
      // Mirror the list endpoint: warehouse-assigned orders OR picked-up
      // parcels not yet assigned to any warehouse (incoming candidates).
      scope = or(
        eq(order.warehouseId, me.warehouseId),
        and(isNull(order.warehouseId), eq(order.status, "PICKED_UP")),
      )
      break
    case "ADMIN":
    case "SUPER_ADMIN":
      scope = undefined
      break
    default:
      return notFound()
  }

  const conditions = [eq(order.id, id)]
  if (scope) conditions.push(scope)

  const [row] = await db
    .select()
    .from(order)
    .where(and(...conditions))
    .limit(1)

  if (!row) return notFound()
  return NextResponse.json(row)
}
