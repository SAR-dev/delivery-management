import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { payoutRequest } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const [current] = await db
    .select({ status: payoutRequest.status })
    .from(payoutRequest)
    .where(eq(payoutRequest.id, id))
    .limit(1)

  if (!current)
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (current.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Only APPROVED requests can be marked paid." },
      { status: 400 },
    )
  }

  const [updated] = await db
    .update(payoutRequest)
    .set({ status: "PAID", paidAt: new Date().toISOString() })
    .where(eq(payoutRequest.id, id))
    .returning()

  return NextResponse.json(updated)
}
