import { betterAuth } from "better-auth"
import { admin } from "better-auth/plugins"
import { db, dbProvider, pool } from "@/lib/db"

function buildVercelPreviewPattern(): RegExp | null {
  const project = process.env.VERCEL_PROJECT_NAME
  if (project) {
    const slug = project.toLowerCase().replace(/[^a-z0-9]/g, "-")
    return new RegExp(`^https://${slug}-[a-z0-9]+-[a-z0-9-]+\\.vercel\\.app$`)
  }
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
    window: 60,
    max: 10,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
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
