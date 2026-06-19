import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { pickupLocation } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  const merchantId = new URL(req.url).searchParams.get("merchantId")
  const effectiveMerchantId =
    me.role === "MERCHANT" ? me.merchantId : merchantId

  const rows = effectiveMerchantId
    ? await db
        .select()
        .from(pickupLocation)
        .where(eq(pickupLocation.merchantId, effectiveMerchantId))
    : await db.select().from(pickupLocation)

  return NextResponse.json(rows)
}
