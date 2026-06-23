import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { division, merchant, pickupLocation } from "@/lib/db/schema"
import { parseBody, pickupLocationSchema } from "@/lib/validation"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  const merchantId = new URL(req.url).searchParams.get("merchantId")
  const effectiveMerchantId =
    me.role === "MERCHANT" ? me.merchantId : merchantId

  const rows = effectiveMerchantId
    ? await db
        .select()
        .from(pickupLocation)
        .where(eq(pickupLocation.merchantId, effectiveMerchantId))
    : await db.select().from(pickupLocation)

  return NextResponse.json(rows)
}

// Merchant registers a new pickup location (shop) for their own business.
export async function POST(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  if (me.role !== "MERCHANT" || !me.merchantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const parsed = await parseBody(req, pickupLocationSchema)
  if (parsed.error) return parsed.error
  const { label, address, mapLink, imageLinks } = parsed.data

  // A shop's division is never client-controlled — it always mirrors the
  // merchant's own business division, regardless of what the client sends.
  const [merchantRow] = await db
    .select({ divisionId: merchant.divisionId })
    .from(merchant)
    .where(eq(merchant.id, me.merchantId))
    .limit(1)
  const divisionId = merchantRow?.divisionId ?? null
  if (!divisionId) {
    return NextResponse.json(
      {
        error:
          "Set your business's division in your profile before adding a shop.",
      },
      { status: 400 },
    )
  }

  // The division must exist and be active so parcels picked up here can be
  // routed to a hub serving that division.
  const [div] = await db
    .select({ id: division.id })
    .from(division)
    .where(and(eq(division.id, divisionId), eq(division.isActive, true)))
    .limit(1)
  if (!div) {
    return NextResponse.json(
      {
        error: "Your business's division is no longer active. Contact support.",
      },
      { status: 400 },
    )
  }

  const [created] = await db
    .insert(pickupLocation)
    .values({
      merchantId: me.merchantId,
      label: label.trim(),
      address: address.trim(),
      divisionId,
      mapLink: mapLink?.trim() ? mapLink.trim() : null,
      imageLinks:
        imageLinks && imageLinks.length > 0
          ? imageLinks.map((l) => l.trim()).filter((l) => l.length > 0)
          : null,
    })
    .returning()

  return NextResponse.json(created, { status: 201 })
}
