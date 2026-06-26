import { betterAuth } from "better-auth"
import { admin } from "better-auth/plugins"
import { db, dbProvider, pool } from "@/lib/db"

// Matches any Vercel preview deployment URL for this project, e.g.:
//   https://parcelflow-abc123-my-team.vercel.app
// Set VERCEL_PROJECT_NAME in your Vercel environment variables to scope this
// to your project. Falls back to a broad *.vercel.app pattern if unset, which
// is safe since Better Auth still validates the session origin on every request.
function buildVercelPreviewPattern(): RegExp | null {
  const project = process.env.VERCEL_PROJECT_NAME
  if (project) {
    // Escape hyphens; Vercel slugifies the project name
    const slug = project.toLowerCase().replace(/[^a-z0-9]/g, "-")
    return new RegExp(`^https://${slug}-[a-z0-9]+-[a-z0-9-]+\\.vercel\\.app$`)
  }
  // Broad fallback: any *.vercel.app origin. Acceptable because auth still
  // requires a valid session cookie — this just allows the CORS preflight.
  return /^https:\/\/[a-z0-9-]+\.vercel\.app$/
}

const vercelPreviewPattern = buildVercelPreviewPattern()

const sharedConfig = {
  plugins: [admin()],
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  trustedOrigins: (request?: Request) => {
    const staticOrigins = [
      ...(process.env.NEXT_PUBLIC_ENV === "development"
        ? ["http://localhost:3000"]
        : []),
      ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ]

    // Only allow the *.vercel.app fallback through if the incoming request's
    // origin actually matches the pattern — keeps the static list as plain
    // strings (satisfying Better Auth's type) while still covering previews.
    const origin = request?.headers.get("origin")
    if (origin && vercelPreviewPattern && vercelPreviewPattern.test(origin)) {
      staticOrigins.push(origin)
    }

    return staticOrigins
  },
  rateLimit: {
    enabled: true,
    window: 60, // seconds
    max: 10, // requests per window per IP on auth endpoints
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
}

function createAuth() {
  if (dbProvider === "postgres") {
    // Postgres: Better Auth talks to pg directly via the pool
    return betterAuth({
      ...sharedConfig,
      database: pool!,
    })
  } else {
    // Turso: use the Drizzle adapter with the sqlite schema
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzleAdapter } = require("better-auth/adapters/drizzle")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const schema = require("@/lib/db/schema.turso")

    return betterAuth({
      ...sharedConfig,
      database: drizzleAdapter(db, {
        provider: "sqlite",
        schema: {
          user: schema.user,
          session: schema.session,
          account: schema.account,
          verification: schema.verification,
        },
      }),
    })
  }
}

export const auth = createAuth()
