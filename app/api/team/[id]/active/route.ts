import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
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
    .select({ isActive: profile.isActive })
    .from(profile)
    .where(eq(profile.userId, id))
    .limit(1)

  if (!current)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [updated] = await db
    .update(profile)
    .set({ isActive: !current.isActive })
    .where(eq(profile.userId, id))
    .returning()

  return NextResponse.json(updated)
}
