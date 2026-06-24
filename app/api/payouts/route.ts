import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { order, payoutRequest } from "@/lib/db/schema"
import { parseBody, payoutCreateSchema } from "@/lib/validation"
import { and, eq, ilike, isNull, sql } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  const search = new URL(req.url).searchParams.get("q")?.trim()
  const searchClause = search
    ? ilike(payoutRequest.code, `%${search}%`)
    : undefined

  if (me.role === "MERCHANT" && me.merchantId) {
    const where = searchClause
      ? and(eq(payoutRequest.merchantId, me.merchantId), searchClause)
      : eq(payoutRequest.merchantId, me.merchantId)
    const rows = await db.select().from(payoutRequest).where(where)
    return NextResponse.json(rows)
  }

  if (me.role !== "SUPER_ADMIN") return NextResponse.json([])

  const rows = searchClause
    ? await db.select().from(payoutRequest).where(searchClause)
    : await db.select().from(payoutRequest)
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "MERCHANT" || !me.merchantId) {
    return NextResponse.json(
      { error: "Only merchants can request payouts" },
      { status: 403 },
    )
  }

  const parsed = await parseBody(req, payoutCreateSchema)
  if (parsed.error) return parsed.error
  const { payoutMethod, payoutDetails } = parsed.data

  const payableOrders = await db
    .select()
    .from(order)
    .where(
      and(
        eq(order.merchantId, me.merchantId),
        eq(order.status, "DELIVERED"),
        sql`${order.codSettledAt} is not null`,
        isNull(order.payoutRequestId),
      ),
    )

  if (payableOrders.length === 0) {
    return NextResponse.json(
      { error: "No settled funds available to request." },
      { status: 400 },
    )
  }

  const amount = payableOrders.reduce((sum, o) => sum + o.productCost, 0)

  const [{ maxCode }] = await db
    .select({ maxCode: sql<string>`max(code)` })
    .from(payoutRequest)
  const maxSeq = maxCode
    ? Number.parseInt(maxCode.replace(/^PR-0*/, ""), 10)
    : 2041
  const seq = (Number.isFinite(maxSeq) ? maxSeq : 2041) + 1
  const code = `PR-${String(seq).padStart(4, "0")}`

  // Transaction: insert the request and lock its orders atomically.
  const newRequest = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(payoutRequest)
      .values({
        code,
        merchantId: me.merchantId!,
        orderIds: payableOrders.map((o) => o.id),
        amount,
        status: "PENDING",
        payoutMethod: payoutMethod.trim(),
        payoutDetails: payoutDetails.trim(),
      })
      .returning()

    await tx
      .update(order)
      .set({ payoutRequestId: inserted.id })
      .where(
        and(
          eq(order.merchantId, me.merchantId!),
          eq(order.status, "DELIVERED"),
          sql`${order.codSettledAt} is not null`,
          isNull(order.payoutRequestId),
        ),
      )

    return inserted
  })

  return NextResponse.json(newRequest, { status: 201 })
}
