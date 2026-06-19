import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { merchant } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN" && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const [current] = await db
    .select({ status: merchant.status })
    .from(merchant)
    .where(eq(merchant.id, id))
    .limit(1)

  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (current.status !== "PENDING") {
    return NextResponse.json(
      { error: "Only PENDING merchants can be approved" },
      { status: 400 },
    )
  }

  const [updated] = await db
    .update(merchant)
    .set({
      status: "ACTIVE",
      approvedBy: me.name,
      approvedAt: new Date().toISOString(),
    })
    .where(eq(merchant.id, id))
    .returning()

  return NextResponse.json(updated)
}
