import { requireSession } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"
import { db } from "@/lib/db"
import { emailLog } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

// Admin / Super Admin manually marks a FAILED email log entry as SENT — for
// example after confirming the email actually arrived, or after resending it
// by hand outside the app. This is the only mutation allowed on email_log;
// everything else about a row is written automatically by lib/mailer.ts.
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
    .select()
    .from(emailLog)
    .where(eq(emailLog.id, id))
    .limit(1)

  if (!current)
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (current.status !== "FAILED") {
    return NextResponse.json(
      { error: "Only FAILED entries can be marked as sent." },
      { status: 400 },
    )
  }

  const [updated] = await db
    .update(emailLog)
    .set({
      status: "SENT",
      markedSentBy: me.name,
      markedSentAt: new Date().toISOString(),
    })
    .where(eq(emailLog.id, id))
    .returning()

  await logAudit({
    actor: { userId: me.userId, name: me.name, role: me.role },
    action: "EMAIL_LOG_MARKED_SENT",
    entityType: "email_log",
    entityId: updated.id,
    description: `Marked email to ${updated.to} ("${updated.subject}") as sent`,
  })

  return NextResponse.json(updated)
}
