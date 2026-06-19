import { Pool } from "pg"

const targets = {
  "jolly-scene (.env)":
    "postgresql://neondb_owner:npg_cLpYGa4rfM5y@ep-jolly-scene-ai8fastz-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require",
  "fancy-union (.env.development.local)":
    "postgresql://neondb_owner:npg_HQ69wCTnauNF@ep-fancy-union-atl1dza8-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require",
}

for (const [label, connectionString] of Object.entries(targets)) {
  const pool = new Pool({ connectionString })
  try {
    const schemas = await pool.query(
      `SELECT table_schema, count(*)::int AS n FROM information_schema.tables
       WHERE table_schema NOT IN ('pg_catalog','information_schema')
       GROUP BY table_schema ORDER BY table_schema`,
    )
    let userCount = "n/a"
    try {
      const u = await pool.query(`SELECT count(*)::int AS n FROM "user"`)
      userCount = u.rows[0].n
    } catch {}
    console.log(`\n=== ${label} ===`)
    console.log("schemas:", schemas.rows)
    console.log("user rows:", userCount)
  } catch (e) {
    console.log(`\n=== ${label} ===`)
    console.log("error:", e.message)
  } finally {
    await pool.end()
  }
}
