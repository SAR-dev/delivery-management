import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { merchant } from "@/lib/db/schema"
import { merchantPricingSchema, parseBody } from "@/lib/validation"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  const canWrite =
    me.role === "SUPER_ADMIN" || (me.role === "ADMIN" && me.canManagePricing)
  if (!canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const parsed = await parseBody(req, merchantPricingSchema)
  if (parsed.error) return parsed.error
  const { baseRate, extraRatePerKg, freeWeightKg, maxWeightKg } = parsed.data

  const [updated] = await db
    .update(merchant)
    .set({ baseRate, extraRatePerKg, freeWeightKg, maxWeightKg })
    .where(eq(merchant.id, id))
    .returning()

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(updated)
}
