import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { order } from "@/lib/db/schema"
import { eq, or } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET() {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  switch (me.role) {
    case "MERCHANT": {
      if (!me.merchantId) return NextResponse.json([])
      const rows = await db
        .select()
        .from(order)
        .where(eq(order.merchantId, me.merchantId))
      return NextResponse.json(rows)
    }
    case "RIDER": {
      if (!me.riderId) return NextResponse.json([])
      const rows = await db
        .select()
        .from(order)
        .where(
          or(
            eq(order.pickupRiderId, me.riderId),
            eq(order.deliveryRiderId, me.riderId),
          ),
        )
      return NextResponse.json(rows)
    }
    case "WAREHOUSE_ADMIN": {
      if (!me.warehouseId) return NextResponse.json([])
      const rows = await db
        .select()
        .from(order)
        .where(eq(order.warehouseId, me.warehouseId))
      return NextResponse.json(rows)
    }
    case "ADMIN":
    case "SUPER_ADMIN": {
      const rows = await db.select().from(order)
      return NextResponse.json(rows)
    }
    default:
      return NextResponse.json([])
  }
}
