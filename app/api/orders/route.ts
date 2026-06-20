import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { merchant, order, securityConfig } from "@/lib/db/schema"
import { parsePagination } from "@/lib/pagination"
import { calcDeliveryCharge, calcSecurityMoney } from "@/lib/pricing"
import { orderCreateSchema, parseBody } from "@/lib/validation"
import { eq, or, sql, type SQL } from "drizzle-orm"
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
      where = eq(order.warehouseId, me.warehouseId)
      break
    case "ADMIN":
    case "SUPER_ADMIN":
      where = undefined
      break
    default:
      return NextResponse.json([])
  }

  const { limit, offset } = parsePagination(req)
  let q = db.select().from(order).$dynamic()
  if (where) q = q.where(where)
  if (limit !== undefined) q = q.limit(limit)
  if (offset !== undefined) q = q.offset(offset)

  const rows = await q
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
    deliveryMapLink,
    deliveryImageLinks,
    parcelWeightKg,
    deliveryType,
    productCost,
  } = parsed.data

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

  // MAX(code) is a DB-level operation, avoiding collisions under concurrent
  // inserts that the client-side reduce over in-memory state couldn't prevent.
  const [{ maxCode }] = await db
    .select({ maxCode: sql<string>`max(${order.code})` })
    .from(order)
  const maxSeq = maxCode
    ? Number.parseInt(maxCode.replace(/^PF-0*/, ""), 10)
    : 100258
  const seq = (Number.isFinite(maxSeq) ? maxSeq : 100258) + 1
  const code = `PF-${String(seq).padStart(6, "0")}`

  const [newOrder] = await db
    .insert(order)
    .values({
      code,
      merchantId: me.merchantId,
      pickupLocationId,
      recipientName,
      recipientPhone,
      deliveryAddress,
      deliveryCity,
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
    })
    .returning()

  return NextResponse.json(newOrder, { status: 201 })
}
