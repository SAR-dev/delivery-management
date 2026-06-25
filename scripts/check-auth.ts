import "dotenv/config"
import { client, db } from "@/lib/db"
import { user, profile, account } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"

async function main() {
  const dbUrl = process.env.TURSO_DATABASE_URL ?? ""
  console.log("[check] TURSO_DATABASE_URL:", dbUrl)

  // List all tables in the SQLite database
  const tables = await db.run(
    sql`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
  )
  console.log("[check] tables:", tables.rows)

  // Check the superadmin user
  const rows = await db
    .select({
      email: user.email,
      role: profile.role,
      hasCredential: account.id,
      pwPrefix: account.password,
    })
    .from(user)
    .leftJoin(profile, eq(profile.userId, user.id))
    .leftJoin(
      account,
      sql`${account.userId} = ${user.id} AND ${account.providerId} = 'credential'`,
    )
    .where(eq(user.email, "superadmin@parcelflow.io"))
    .limit(1)

  console.log("[check] superadmin row:", rows)

  client.close()
}

main().catch((e) => {
  console.error("[check] error:", e)
  process.exit(1)
})
