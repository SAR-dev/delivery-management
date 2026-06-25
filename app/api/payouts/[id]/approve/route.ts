import { requireSession } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
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

  // Transaction: lock the request row for the guard + write so two
  // concurrent approve/reject calls on the same request can't both pass the
  // "still PENDING" check against stale state.
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

    if (!current)
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (current.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only PENDING requests can be approved." },
        { status: 400 },
      )
    }

    const [updated] = await tx
      .update(payoutRequest)
      .set({
        status: "APPROVED",
        reviewedBy: me.name,
        reviewedAt: new Date().toISOString(),
      })
      .where(eq(payoutRequest.id, id))
      .returning()

    committed.row = updated
    return NextResponse.json(updated)
  })

  if (committed.row) {
    await logAudit({
      actor: { userId: me.userId, name: me.name, role: me.role },
      action: "PAYOUT_APPROVED",
      entityType: "payout_request",
      entityId: committed.row.id,
      description: `Approved payout request ${committed.row.code}`,
    })
  }

  return response
}
