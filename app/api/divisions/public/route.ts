import { db } from "@/lib/db"
import { division } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

// Public list of *active* divisions, used to populate the division selector on
// the unauthenticated merchant registration form. Only id + name are returned.
export async function GET() {
  const rows = await db
    .select({ id: division.id, name: division.name })
    .from(division)
    .where(eq(division.isActive, true))
    .orderBy(asc(division.name))
  return NextResponse.json(rows, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  })
}
