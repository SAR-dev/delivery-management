import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { securityConfig } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET() {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  const [row] = await db
    .select()
    .from(securityConfig)
    .where(eq(securityConfig.id, "default"))
    .limit(1)

  return NextResponse.json(row ?? null)
}
