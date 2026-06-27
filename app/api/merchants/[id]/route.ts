import { requireSession } from "@/lib/api-auth"
import { forbidden, notFound, unauthorized } from "@/lib/api-response"
import { db } from "@/lib/db"
import { division, merchant } from "@/lib/db/schema"
import { merchantProfileSchema, parseBody } from "@/lib/validation"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

// Update a merchant's own business contact details (name, email, phone,
// address). A merchant may only edit their own business; Admins / Super Admins
// may edit any merchant. Pricing and status are handled by dedicated routes.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSession()
  if (!me) return unauthorized()

  const { id } = await params

  const isOwner = me.role === "MERCHANT" && me.merchantId === id
  const isAdmin = me.role === "SUPER_ADMIN" || me.role === "ADMIN"
  if (!isOwner && !isAdmin) {
    return forbidden()
  }

  const parsed = await parseBody(req, merchantProfileSchema)
  if (parsed.error) return parsed.error
  const { businessName, email, phone, address, divisionId } = parsed.data

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
    .update(merchant)
    .set({
      businessName: businessName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      divisionId,
    })
    .where(eq(merchant.id, id))
    .returning()

  if (!updated) return notFound()
  return NextResponse.json(updated)
}
