import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { rider } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  const isAdmin = me.role === "SUPER_ADMIN" || me.role === "ADMIN"
  const isWarehouseAdmin = me.role === "WAREHOUSE_ADMIN"
  if (!isAdmin && !isWarehouseAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const [current] = await db
    .select({ isActive: rider.isActive, warehouseId: rider.warehouseId })
    .from(rider)
    .where(eq(rider.id, id))
    .limit(1)

  if (!current)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Warehouse Admins can only toggle riders based at their own hub.
  if (
    isWarehouseAdmin &&
    (!me.warehouseId || current.warehouseId !== me.warehouseId)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [updated] = await db
    .update(rider)
    .set({ isActive: !current.isActive })
    .where(eq(rider.id, id))
    .returning()

  return NextResponse.json(updated)
}
