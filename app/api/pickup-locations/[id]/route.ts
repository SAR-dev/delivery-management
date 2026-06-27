import { requireSession } from "@/lib/api-auth"
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  unauthorized,
} from "@/lib/api-response"
import { db } from "@/lib/db"
import { division, merchant, order, pickupLocation } from "@/lib/db/schema"
import { parseBody, pickupLocationSchema } from "@/lib/validation"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

// Loads a pickup location and verifies the signed-in merchant owns it. Returns
// either the row or a NextResponse error to short-circuit the handler.
async function loadOwned(id: string) {
  const me = await requireSession()
  if (!me) return { error: unauthorized() } as const

  if (me.role !== "MERCHANT" || !me.merchantId) {
    return { error: forbidden() } as const
  }

  const [row] = await db
    .select()
    .from(pickupLocation)
    .where(
      and(
        eq(pickupLocation.id, id),
        eq(pickupLocation.merchantId, me.merchantId),
      ),
    )
    .limit(1)

  if (!row) {
    return { error: notFound() } as const
  }

  return { row } as const
}

// Merchant updates one of their pickup locations (shop name, address, map
// link, image links).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const owned = await loadOwned(id)
  if ("error" in owned) return owned.error

  const parsed = await parseBody(req, pickupLocationSchema)
  if (parsed.error) return parsed.error
  const { label, address, mapLink, imageLinks } = parsed.data

  // A shop's division is never client-controlled — it always mirrors the
  // merchant's own business division, regardless of what the client sends.
  const [merchantRow] = await db
    .select({ divisionId: merchant.divisionId })
    .from(merchant)
    .where(eq(merchant.id, owned.row.merchantId))
    .limit(1)
  const divisionId = merchantRow?.divisionId ?? null
  if (!divisionId) {
    return badRequest(
      "Set your business's division in your profile before updating a shop.",
    )
  }

  const [div] = await db
    .select({ id: division.id })
    .from(division)
    .where(and(eq(division.id, divisionId), eq(division.isActive, true)))
    .limit(1)
  if (!div) {
    return badRequest(
      "Your business's division is no longer active. Contact support.",
    )
  }

  const [updated] = await db
    .update(pickupLocation)
    .set({
      label: label.trim(),
      address: address.trim(),
      divisionId,
      mapLink: mapLink?.trim() ? mapLink.trim() : null,
      imageLinks:
        imageLinks && imageLinks.length > 0
          ? imageLinks.map((l) => l.trim()).filter((l) => l.length > 0)
          : null,
    })
    .where(eq(pickupLocation.id, id))
    .returning()

  return NextResponse.json(updated)
}

// Merchant removes one of their pickup locations. Blocked if any order still
// references it (the order.pickupLocationId FK has no cascade), so the
// merchant keeps an accurate audit trail.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const owned = await loadOwned(id)
  if ("error" in owned) return owned.error

  const [referencing] = await db
    .select({ id: order.id })
    .from(order)
    .where(eq(order.pickupLocationId, id))
    .limit(1)

  if (referencing) {
    return conflict(
      "This shop has orders linked to it and cannot be removed. You can edit its details instead.",
    )
  }

  await db.delete(pickupLocation).where(eq(pickupLocation.id, id))
  return NextResponse.json({ ok: true })
}
