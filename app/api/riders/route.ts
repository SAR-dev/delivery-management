import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { rider } from "@/lib/db/schema"
import { NextResponse } from "next/server"

export async function GET() {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  const rows = await db.select().from(rider)
  return NextResponse.json(rows)
}
