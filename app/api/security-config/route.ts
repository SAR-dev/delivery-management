import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { securityConfig } from "@/lib/db/schema"
import { parseBody, securityConfigSchema } from "@/lib/validation"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET() {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  const [row] = await db
    .select()
    .from(securityConfig)
    .where(eq(securityConfig.id, "default"))
    .limit(1)

  return NextResponse.json(row ?? null)
}

export async function PATCH(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  const canWrite =
    me.role === "SUPER_ADMIN" || (me.role === "ADMIN" && me.canManagePricing)
  if (!canWrite)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const parsed = await parseBody(req, securityConfigSchema)
  if (parsed.error) return parsed.error
  const { lowValueThreshold, lowValueFlatFee, highValuePercentage } =
    parsed.data

  const [updated] = await db
    .update(securityConfig)
    .set({
      lowValueThreshold,
      lowValueFlatFee,
      highValuePercentage,
      updatedAt: new Date().toISOString(),
      updatedBy: me.name,
    })
    .where(eq(securityConfig.id, "default"))
    .returning()

  return NextResponse.json(updated)
}
