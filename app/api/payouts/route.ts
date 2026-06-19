import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { payoutRequest } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET() {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  if (me.role === "MERCHANT" && me.merchantId) {
    const rows = await db
      .select()
      .from(payoutRequest)
      .where(eq(payoutRequest.merchantId, me.merchantId))
    return NextResponse.json(rows)
  }

  if (me.role !== "SUPER_ADMIN") return NextResponse.json([])

  const rows = await db.select().from(payoutRequest)
  return NextResponse.json(rows)
}
