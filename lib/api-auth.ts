import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { cache } from "react"

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
