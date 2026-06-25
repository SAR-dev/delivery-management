import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { auditLog } from "@/lib/db/schema"
import { desc, ilike, or } from "drizzle-orm"
import { NextResponse } from "next/server"

// Read-only. Visible to Admin and Super Admin only — this is an internal
// trail of who-did-what, not a resource either role mutates through the API.
// Mirrors /api/team: other roles get an empty list (not 403) so the global
// useDataError aggregator — which subscribes for every signed-in user,
// regardless of role — doesn't surface a false "failed to load" banner.
export async function GET(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN" && me.role !== "ADMIN") {
    return NextResponse.json([], { status: 200 })
  }

  const search = new URL(req.url).searchParams.get("q")?.trim()
  const where = search
    ? (() => {
        const likeQ = `%${search}%`
        return or(
          ilike(auditLog.actorName, likeQ),
          ilike(auditLog.action, likeQ),
          ilike(auditLog.entityType, likeQ),
          ilike(auditLog.description, likeQ),
        )
      })()
    : undefined

  const rows = where
    ? await db
        .select()
        .from(auditLog)
        .where(where)
        .orderBy(desc(auditLog.createdAt))
    : await db.select().from(auditLog).orderBy(desc(auditLog.createdAt))

  return NextResponse.json(rows)
}
