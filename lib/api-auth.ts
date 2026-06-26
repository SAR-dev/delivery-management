import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { cache } from "react"

// `cache()` memoizes per-request: if a route handler (or anything it calls)
// invokes requireSession() more than once during the same request, only the
// first call hits Better Auth + the profile table — subsequent calls reuse
// the resolved value. This doesn't remove the two round-trips on a single
// call, but it eliminates duplicate round-trips across nested calls.
//
// Removing the second (profile) round-trip entirely would require storing
// role/merchantId/riderId/warehouseId as Better Auth `additionalFields` on
// the user record so they travel with the session — that's a schema
// migration, tracked separately rather than done here.
export const requireSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const [row] = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, session.user.id))
    .limit(1)

  if (!row) return null

  return { ...row, userId: session.user.id, name: session.user.name }
})
