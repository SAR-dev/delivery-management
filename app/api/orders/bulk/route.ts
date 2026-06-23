import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { division, merchant, order, securityConfig } from "@/lib/db/schema"
import { calcDeliveryCharge, calcSecurityMoney } from "@/lib/pricing"
import { orderBulkCreateSchema, parseBody } from "@/lib/validation"
import { and, eq, inArray, sql } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "MERCHANT" || !me.merchantId) {
    return NextResponse.json(
      { error: "Only merchants can create orders" },
      { status: 403 },
    )
  }

  const parsed = await parseBody(req, orderBulkCreateSchema)
  if (parsed.error) return parsed.error
  const { orders: inputs } = parsed.data

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

  // Validate every parcel's weight up-front so the whole batch is rejected
  // atomically rather than inserting a partial set.
  const overweight = inputs
    .map((o, i) => ({ i, weight: o.parcelWeightKg }))
    .filter((o) => o.weight > merchantRow.maxWeightKg)
  if (overweight.length > 0) {
    return NextResponse.json(
      {
        error: `${overweight.length} parcel(s) exceed the ${merchantRow.maxWeightKg} KG limit.`,
        rows: overweight.map((o) => o.i),
      },
      { status: 400 },
    )
  }

  // Every referenced delivery division must exist and be active.
  const divisionIds = [...new Set(inputs.map((o) => o.deliveryDivisionId))]
  const validDivisions = await db
    .select({ id: division.id })
    .from(division)
    .where(and(inArray(division.id, divisionIds), eq(division.isActive, true)))
  const validDivisionIds = new Set(validDivisions.map((d) => d.id))
  const badDivisionRows = inputs
    .map((o, i) => ({ i, ok: validDivisionIds.has(o.deliveryDivisionId) }))
    .filter((o) => !o.ok)
  if (badDivisionRows.length > 0) {
    return NextResponse.json(
      {
        error: `${badDivisionRows.length} parcel(s) have an invalid delivery division.`,
        rows: badDivisionRows.map((o) => o.i),
      },
      { status: 400 },
    )
  }

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

  const merchantId = me.merchantId

  // Insert the whole batch in one transaction. The starting sequence is read
  // inside the transaction so concurrent bulk submissions can't collide.
  const created = await db.transaction(async (tx) => {
    const [{ maxCode }] = await tx
      .select({ maxCode: sql<string>`max(${order.code})` })
      .from(order)
    const baseSeq = maxCode
      ? Number.parseInt(maxCode.replace(/^PF-0*/, ""), 10)
      : 100258
    let seq = Number.isFinite(baseSeq) ? baseSeq : 100258

    const values = inputs.map((input) => {
      const { total: deliveryCharge } = calcDeliveryCharge(
        merchantRow,
        input.parcelWeightKg,
      )
      const securityMoney = calcSecurityMoney(configRow, input.productCost)
      const totalCollectible =
        input.productCost + deliveryCharge + securityMoney
      seq += 1
      const mapLink = input.deliveryMapLink?.trim()
      const imageLinks = (input.deliveryImageLinks ?? [])
        .map((link) => link.trim())
        .filter((link) => link.length > 0)
      return {
        code: `PF-${String(seq).padStart(6, "0")}`,
        merchantId,
        pickupLocationId: input.pickupLocationId,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        deliveryAddress: input.deliveryAddress,
        deliveryCity: input.deliveryCity,
        deliveryDivisionId: input.deliveryDivisionId,
        deliveryMapLink: mapLink ? mapLink : null,
        deliveryImageLinks: imageLinks.length ? imageLinks : null,
        parcelWeightKg: input.parcelWeightKg,
        deliveryType: input.deliveryType ?? "STANDARD",
        productCost: input.productCost,
        deliveryCharge,
        securityMoney,
        totalCollectible,
        status: "PENDING" as const,
        deliveryAttempts: 0,
        merchantNote: input.merchantNote?.trim() || null,
      }
    })

    return tx.insert(order).values(values).returning()
  })

  return NextResponse.json(created, { status: 201 })
}
