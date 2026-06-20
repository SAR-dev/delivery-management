import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { merchant } from "@/lib/db/schema"
import { merchantProfileSchema, parseBody } from "@/lib/validation"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

// Update a merchant's own business contact details (name, email, phone,
// address). A merchant may only edit their own business; Admins / Super Admins
// may edit any merchant. Pricing and status are handled by dedicated routes.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  const { id } = await params

  const isOwner = me.role === "MERCHANT" && me.merchantId === id
  const isAdmin = me.role === "SUPER_ADMIN" || me.role === "ADMIN"
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const parsed = await parseBody(req, merchantProfileSchema)
  if (parsed.error) return parsed.error
  const { businessName, email, phone, address } = parsed.data

  const [updated] = await db
    .update(merchant)
    .set({
      businessName: businessName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
    })
    .where(eq(merchant.id, id))
    .returning()

  if (!updated)
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(updated)
}
