import { requireSession } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { db } from "@/lib/db"
import { merchant } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN" && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const [updated] = await db
    .update(merchant)
    .set({ status: "SUSPENDED" })
    .where(eq(merchant.id, id))
    .returning()

  if (!updated)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  await logAudit({
    actor: { userId: me.userId, name: me.name, role: me.role },
    action: "MERCHANT_SUSPENDED",
    entityType: "merchant",
    entityId: updated.id,
    description: `Suspended merchant ${updated.businessName}`,
  })

  return NextResponse.json(updated)
}
