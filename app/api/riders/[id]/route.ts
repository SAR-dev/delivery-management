import { requireSession } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { db } from "@/lib/db"
import { rider } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { parseBody, riderUpdateSchema } from "@/lib/validation"
import { NextResponse } from "next/server"

// Update a rider's details. Admins / Super Admins can edit any rider and
// reassign their warehouse and task type. Warehouse Admins can only edit
// riders based at their own hub and may not move a rider to another hub.
export async function PATCH(
  req: Request,
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
    .select()
    .from(rider)
    .where(eq(rider.id, id))
    .limit(1)
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const parsed = await parseBody(req, riderUpdateSchema)
  if (parsed.error) return parsed.error
  const { name, phone, zone, warehouseId, taskType, isActive } = parsed.data

  // Warehouse Admins are scoped to riders at their own hub and cannot move a
  // rider away from it.
  if (isWarehouseAdmin) {
    if (!me.warehouseId || current.warehouseId !== me.warehouseId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (warehouseId !== undefined && warehouseId !== me.warehouseId) {
      return NextResponse.json(
        { error: "You cannot move a rider to another warehouse." },
        { status: 403 },
      )
    }
  }

  const [updated] = await db
    .update(rider)
    .set({
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(zone !== undefined ? { zone } : {}),
      // Only Admins may reassign the home warehouse.
      ...(isAdmin && warehouseId !== undefined ? { warehouseId } : {}),
      ...(taskType !== undefined ? { taskType } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    })
    .where(eq(rider.id, id))
    .returning()

  await logAudit({
    actor: { userId: me.userId, name: me.name, role: me.role },
    action: "RIDER_UPDATED",
    entityType: "rider",
    entityId: updated.id,
    description: `Updated rider ${updated.name}`,
    metadata: { name, phone, zone, warehouseId, taskType, isActive },
  })

  return NextResponse.json(updated)
}
