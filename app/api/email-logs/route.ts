import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { emailLog } from "@/lib/db/schema"
import { desc, ilike, or } from "drizzle-orm"
import { NextResponse } from "next/server"

// Read-only. Visible to Admin and Super Admin only. Mirrors /api/team:
// other roles get an empty list (not 403) so the global useDataError
// aggregator doesn't surface a false "failed to load" banner.
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
        return or(ilike(emailLog.to, likeQ), ilike(emailLog.subject, likeQ))
      })()
    : undefined

  const rows = where
    ? await db
        .select()
        .from(emailLog)
        .where(where)
        .orderBy(desc(emailLog.createdAt))
    : await db.select().from(emailLog).orderBy(desc(emailLog.createdAt))

  return NextResponse.json(rows)
}
