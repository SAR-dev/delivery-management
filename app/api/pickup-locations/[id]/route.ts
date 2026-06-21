import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { division, order, pickupLocation } from "@/lib/db/schema"
import { parseBody, pickupLocationSchema } from "@/lib/validation"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

// Loads a pickup location and verifies the signed-in merchant owns it. Returns
// either the row or a NextResponse error to short-circuit the handler.
async function loadOwned(id: string) {
  const me = await requireSession()
  if (!me) return { error: NextResponse.json(null, { status: 401 }) } as const

  if (me.role !== "MERCHANT" || !me.merchantId) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const
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
    return {
      error: NextResponse.json({ error: "Not found" }, { status: 404 }),
    } as const
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
  const { label, address, divisionId, mapLink, imageLinks } = parsed.data

  const [div] = await db
    .select({ id: division.id })
    .from(division)
    .where(and(eq(division.id, divisionId), eq(division.isActive, true)))
    .limit(1)
  if (!div) {
    return NextResponse.json(
      { error: "Select a valid division." },
      { status: 400 },
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
    return NextResponse.json(
      {
        error:
          "This shop has orders linked to it and cannot be removed. You can edit its details instead.",
      },
      { status: 409 },
    )
  }

  await db.delete(pickupLocation).where(eq(pickupLocation.id, id))
  return NextResponse.json({ ok: true })
}
