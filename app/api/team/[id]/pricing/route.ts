import { requireSession } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { db } from "@/lib/db"
import { profile, user } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const [current] = await db
    .select({ role: profile.role, canManagePricing: profile.canManagePricing })
    .from(profile)
    .where(eq(profile.userId, id))
    .limit(1)

  if (!current)
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (current.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only ADMIN users have pricing permission" },
      { status: 400 },
    )
  }

  const [updated] = await db
    .update(profile)
    .set({ canManagePricing: !current.canManagePricing })
    .where(eq(profile.userId, id))
    .returning()

  const [targetUser] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, id))
    .limit(1)

  await logAudit({
    actor: { userId: me.userId, name: me.name, role: me.role },
    action: "TEAM_MEMBER_PRICING_PERMISSION_CHANGED",
    entityType: "user",
    entityId: id,
    description: `${updated.canManagePricing ? "Granted" : "Revoked"} pricing permission for ${targetUser?.name ?? id}`,
  })

  return NextResponse.json(updated)
}
