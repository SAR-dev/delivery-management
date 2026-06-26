import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import {
  division,
  merchant,
  order,
  securityConfig,
  warehouse,
} from "@/lib/db/schema"
import { parsePagination } from "@/lib/pagination"
import { calcDeliveryCharge, calcSecurityMoney } from "@/lib/pricing"
import { orderCreateSchema, parseBody } from "@/lib/validation"
import { and, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  // Resolve the role-scoped WHERE clause first; SUPER_ADMIN / ADMIN see all.
  let where: SQL | undefined
  switch (me.role) {
    case "MERCHANT":
      if (!me.merchantId) return NextResponse.json([])
      where = eq(order.merchantId, me.merchantId)
      break
    case "RIDER":
      if (!me.riderId) return NextResponse.json([])
      where = or(
        eq(order.pickupRiderId, me.riderId),
        eq(order.deliveryRiderId, me.riderId),
      )
      break
    case "WAREHOUSE_ADMIN":
      if (!me.warehouseId) return NextResponse.json([])
      // Orders already logged into this warehouse, plus picked-up parcels
      // not yet assigned to any warehouse — these are the incoming
      // candidates any warehouse admin can receive (see app/warehouse/page.tsx).
      where = or(
        eq(order.warehouseId, me.warehouseId),
        and(isNull(order.warehouseId), eq(order.status, "PICKED_UP")),
      )
      break
    case "ADMIN":
    case "SUPER_ADMIN":
      where = undefined
      break
    default:
      return NextResponse.json([])
  }

  // Free-text search layered on top of the role-scoped where above — search
  // never widens the visibility a user already has.
  const search = new URL(req.url).searchParams.get("q")?.trim()
  if (search) {
    const likeQ = `%${search}%`
    const conditions = [
      ilike(order.code, likeQ),
      ilike(order.recipientName, likeQ),
      ilike(order.recipientPhone, likeQ),
      ilike(order.deliveryCity, likeQ),
    ]
    // Also search by merchant business name.
    const [{ count: merchantMatchCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(merchant)
      .where(ilike(merchant.businessName, likeQ))
    if (merchantMatchCount > 0) {
      const merchantIds = db
        .select({ id: merchant.id })
        .from(merchant)
        .where(ilike(merchant.businessName, likeQ))
      conditions.push(inArray(order.merchantId, merchantIds))
    }
    // Also search by warehouse name and city.
    const [{ count: warehouseMatchCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(warehouse)
      .where(or(ilike(warehouse.name, likeQ), ilike(warehouse.city, likeQ)))
    if (warehouseMatchCount > 0) {
      const warehouseIds = db
        .select({ id: warehouse.id })
        .from(warehouse)
        .where(or(ilike(warehouse.name, likeQ), ilike(warehouse.city, likeQ)))
      conditions.push(inArray(order.warehouseId, warehouseIds))
    }
    const searchClause = or(...conditions)
    where = where ? and(where, searchClause) : searchClause
  }

  const { limit, offset } = parsePagination(req)
  let dbQuery = db.select().from(order).$dynamic()
  if (where) dbQuery = dbQuery.where(where)
  if (limit !== undefined) dbQuery = dbQuery.limit(limit)
  if (offset !== undefined) dbQuery = dbQuery.offset(offset)

  const rows = await dbQuery
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "MERCHANT" || !me.merchantId) {
    return NextResponse.json(
      { error: "Only merchants can create orders" },
      { status: 403 },
    )
  }

  const parsed = await parseBody(req, orderCreateSchema)
  if (parsed.error) return parsed.error
  const {
    pickupLocationId,
    recipientName,
    recipientPhone,
    deliveryAddress,
    deliveryCity,
    deliveryDivisionId,
    deliveryMapLink,
    deliveryImageLinks,
    parcelWeightKg,
    deliveryType,
    productCost,
    merchantNote,
  } = parsed.data

  // Receiver division must exist and be active.
  const [deliveryDivision] = await db
    .select({ id: division.id })
    .from(division)
    .where(
      and(eq(division.id, deliveryDivisionId), eq(division.isActive, true)),
    )
    .limit(1)
  if (!deliveryDivision) {
    return NextResponse.json(
      { error: "Select a valid delivery division." },
      { status: 400 },
    )
  }

  const normalizedMapLink = deliveryMapLink?.trim()
    ? deliveryMapLink.trim()
    : null
  const normalizedImageLinks = (deliveryImageLinks ?? [])
    .map((link) => link.trim())
    .filter((link) => link.length > 0)

  const [merchantRow] = await db
    .select()
    .from(merchant)
    .where(eq(merchant.id, me.merchantId))
    .limit(1)

  if (!merchantRow) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 })
  }
  if (merchantRow.status !== "ACTIVE") {
    return NextResponse.json(
      {
        error:
          merchantRow.status === "PENDING"
            ? "Your merchant account is pending approval."
            : "Your merchant account is suspended and cannot create orders.",
      },
      { status: 400 },
    )
  }
  if (parcelWeightKg > merchantRow.maxWeightKg) {
    return NextResponse.json(
      {
        error: `Parcel weight exceeds the ${merchantRow.maxWeightKg} KG limit.`,
      },
      { status: 400 },
    )
  }

  const { total: deliveryCharge } = calcDeliveryCharge(
    merchantRow,
    parcelWeightKg,
  )

  const [configRow] = await db
    .select()
    .from(securityConfig)
    .where(eq(securityConfig.id, "default"))
    .limit(1)

  if (!configRow) {
    return NextResponse.json(
      { error: "Security config not found" },
      { status: 500 },
    )
  }
  const securityMoney = calcSecurityMoney(configRow, productCost)
  const totalCollectible = productCost + deliveryCharge + securityMoney

  // MAX(code) read + insert must happen inside a single transaction, matching
  // the bulk route's pattern — otherwise two concurrent single-order
  // submissions can read the same MAX(code) and generate the same PF-XXXXXX
  // code (race condition).
  const [newOrder] = await db.transaction(async (tx: any) => {
    const [{ maxCode }] = await tx
      .select({ maxCode: sql<string>`max(${order.code})` })
      .from(order)
    const maxSeq = maxCode
      ? Number.parseInt(maxCode.replace(/^PF-0*/, ""), 10)
      : 100258
    const seq = (Number.isFinite(maxSeq) ? maxSeq : 100258) + 1
    const code = `PF-${String(seq).padStart(6, "0")}`

    return tx
      .insert(order)
      .values({
        code,
        merchantId: me.merchantId,
        pickupLocationId,
        recipientName,
        recipientPhone,
        deliveryAddress,
        deliveryCity,
        deliveryDivisionId,
        deliveryMapLink: normalizedMapLink,
        deliveryImageLinks: normalizedImageLinks.length
          ? normalizedImageLinks
          : null,
        parcelWeightKg,
        deliveryType: deliveryType ?? "STANDARD",
        productCost,
        deliveryCharge,
        securityMoney,
        totalCollectible,
        status: "PENDING",
        deliveryAttempts: 0,
        merchantNote: merchantNote?.trim() || null,
      })
      .returning()
  })

  return NextResponse.json(newOrder, { status: 201 })
}
