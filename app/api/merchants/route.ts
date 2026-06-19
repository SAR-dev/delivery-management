import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { merchant } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET() {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  if (me.role === "MERCHANT" && me.merchantId) {
    const rows = await db
      .select()
      .from(merchant)
      .where(eq(merchant.id, me.merchantId))
    return NextResponse.json(rows)
  }

  const rows = await db.select().from(merchant)
  return NextResponse.json(rows)
}
