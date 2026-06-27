import { requireSession } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { db } from "@/lib/db"
import { payoutRequest } from "@/lib/db/schema"
import { forbidden, notFound, unauthorized } from "@/lib/api-response"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSession()
  if (!me) return unauthorized()
  if (me.role !== "SUPER_ADMIN") {
    return forbidden()
  }

  const { id } = await params

  // Transaction: lock the request row for the guard + write so a concurrent
  // call can't slip in between the "still APPROVED" check and the write.
  const committed: { row: typeof payoutRequest.$inferSelect | null } = {
    row: null,
  }
  const response = await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: payoutRequest.status })
      .from(payoutRequest)
      .where(eq(payoutRequest.id, id))
      .for("update")
      .limit(1)

    if (!current) return notFound()
    if (current.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Only APPROVED requests can be marked paid." },
        { status: 400 },
      )
    }

    const [updated] = await tx
      .update(payoutRequest)
      .set({ status: "PAID", paidAt: new Date().toISOString() })
      .where(eq(payoutRequest.id, id))
      .returning()

    committed.row = updated
    return NextResponse.json(updated)
  })

  if (committed.row) {
    await logAudit({
      actor: { userId: me.userId, name: me.name, role: me.role },
      action: "PAYOUT_PAID",
      entityType: "payout_request",
      entityId: committed.row.id,
      description: `Marked payout request ${committed.row.code} as paid`,
    })
  }

  return response
}
