import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { merchant, order, payoutRequest } from "@/lib/db/schema"
import { getClientIp, rateLimit } from "@/lib/rate-limit"
import { parseBody, payoutCreateSchema } from "@/lib/validation"
import { forbidden, unauthorized } from "@/lib/api-response"
import {
  paginateResponse,
  parsePagination,
  parseSort,
  parseStatusFilter,
} from "@/lib/pagination"
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const me = await requireSession()
  if (!me) return unauthorized()

  const { limit, offset } = parsePagination(req)
  const search = new URL(req.url).searchParams.get("q")?.trim()
  let searchClause
  if (search) {
    const likeQ = `%${search}%`
    const conditions = [ilike(payoutRequest.code, likeQ)]
    // Also search by merchant business name.
    const merchantIds = db
      .select({ id: merchant.id })
      .from(merchant)
      .where(ilike(merchant.businessName, likeQ))
    conditions.push(inArray(payoutRequest.merchantId, merchantIds))
    searchClause = or(...conditions)
  }

  const statuses = parseStatusFilter(req)

  if (me.role === "MERCHANT" && me.merchantId) {
    let where = eq(payoutRequest.merchantId, me.merchantId)
    if (searchClause) where = and(where, searchClause)!
    if (statuses.length > 0)
      where = and(where, inArray(payoutRequest.status, statuses as any))!

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(payoutRequest)
      .where(where)

    let q = db.select().from(payoutRequest).where(where).$dynamic()

    const sortColumnMap = {
      request: payoutRequest.code,
      method: payoutRequest.payoutMethod,
      requested: payoutRequest.requestedAt,
      amount: payoutRequest.amount,
      status: payoutRequest.status,
    }
    const sort = parseSort(req, sortColumnMap)
    if (sort) {
      q =
        sort.direction === "asc"
          ? q.orderBy(asc(sort.column))
          : q.orderBy(desc(sort.column))
    }

    if (limit !== undefined) q = q.limit(limit)
    if (offset !== undefined) q = q.offset(offset)

    const rows = await q
    return NextResponse.json(paginateResponse(rows, count, limit, offset))
  }

  if (me.role !== "SUPER_ADMIN")
    return NextResponse.json(paginateResponse([], 0))

  let where = searchClause
  if (statuses.length > 0) {
    const statusClause = inArray(payoutRequest.status, statuses as any)
    where = where ? and(where, statusClause) : statusClause
  }
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(payoutRequest)
    .where(where)

  let q = db.select().from(payoutRequest).$dynamic()
  if (where) q = q.where(where)

  const sortColumnMap = {
    request: payoutRequest.code,
    method: payoutRequest.payoutMethod,
    requested: payoutRequest.requestedAt,
    amount: payoutRequest.amount,
    status: payoutRequest.status,
  }
  const sort = parseSort(req, sortColumnMap)
  if (sort) {
    q =
      sort.direction === "asc"
        ? q.orderBy(asc(sort.column))
        : q.orderBy(desc(sort.column))
  }

  if (limit !== undefined) q = q.limit(limit)
  if (offset !== undefined) q = q.offset(offset)

  const rows = await q
  return NextResponse.json(paginateResponse(rows, count, limit, offset))
}

export async function POST(req: Request) {
  const me = await requireSession()
  if (!me) return unauthorized()
  if (me.role !== "MERCHANT" || !me.merchantId) {
    return forbidden("Only merchants can request payouts")
  }

  const limited = rateLimit(`payouts:${getClientIp(req)}`, 10, 60)
  if (limited) return limited

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

  const amount = payableOrders.reduce(
    (sum: number, o: { productCost: number }) => sum + o.productCost,
    0,
  )

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
        orderIds: payableOrders.map((o: { id: string }) => o.id),
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
