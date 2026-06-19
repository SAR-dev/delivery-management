import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { order, payoutRequest } from "@/lib/db/schema"
import { parseBody, payoutRejectSchema } from "@/lib/validation"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const parsed = await parseBody(req, payoutRejectSchema)
  if (parsed.error) return parsed.error
  const { reason } = parsed.data

  const [current] = await db
    .select()
    .from(payoutRequest)
    .where(eq(payoutRequest.id, id))
    .limit(1)

  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (current.status !== "PENDING") {
    return NextResponse.json(
      { error: "Only PENDING requests can be rejected." },
      { status: 400 },
    )
  }

  const updated = await db.transaction(async (tx) => {
    // Unlock orders before updating the request status.
    await tx
      .update(order)
      .set({ payoutRequestId: null })
      .where(eq(order.payoutRequestId, id))

    const [rejected] = await tx
      .update(payoutRequest)
      .set({
        status: "REJECTED",
        reviewedBy: me.name,
        reviewedAt: new Date().toISOString(),
        rejectReason: reason.trim(),
      })
      .where(eq(payoutRequest.id, id))
      .returning()

    return rejected
  })

  return NextResponse.json(updated)
}
