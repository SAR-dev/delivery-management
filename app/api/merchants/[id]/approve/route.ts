import { requireSession } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { db } from "@/lib/db"
import { merchant } from "@/lib/db/schema"
import { sendMail } from "@/lib/mailer"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import siteData from "@/config/site.json"

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

  if (!current)
    return NextResponse.json({ error: "Not found" }, { status: 404 })
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

  await logAudit({
    actor: { userId: me.userId, name: me.name, role: me.role },
    action: "MERCHANT_APPROVED",
    entityType: "merchant",
    entityId: updated.id,
    description: `Approved merchant ${updated.businessName}`,
  })

  sendMail(
    {
      to: updated.email,
      subject: `[${siteData.name}] Your merchant account has been approved`,
      html: `
        <p>Hi ${updated.ownerName},</p>
        <p>Great news! Your business <strong>${updated.businessName}</strong> has been approved and your merchant account is now active.</p>
        <p>You can now log in and start creating orders.</p>
        <a href="${process.env.BETTER_AUTH_PRD_URL ?? process.env.BETTER_AUTH_DEV_URL ?? ""}">Log in to ${siteData.name}</a>
        <p>— The Delivery Management Team</p>
      `,
    },
    {
      maxRetries: 3,
      baseDelayMs: 1000,
      onRetry: (attempt, err) =>
        console.warn(
          `[mailer] Retry ${attempt} for merchant approval email (${updated.email}):`,
          err.message,
        ),
    },
  ).catch((err) =>
    console.error("[mailer] Merchant approval email failed:", err),
  )

  return NextResponse.json(updated)
}
