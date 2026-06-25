import { betterAuth } from "better-auth"
import { admin } from "better-auth/plugins"
import { db, pool, dbProvider } from "@/lib/db"

const sharedConfig = {
  plugins: [admin()],
  baseURL:
    process.env.BETTER_AUTH_DEV_URL ??
    process.env.BETTER_AUTH_PRD_URL ??
    undefined,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  trustedOrigins: [
    ...(process.env.NEXT_PUBLIC_ENV === "development"
      ? ["http://localhost:3000"]
      : []),
    ...(process.env.BETTER_AUTH_DEV_URL
      ? [process.env.BETTER_AUTH_DEV_URL]
      : []),
    ...(process.env.BETTER_AUTH_PRD_URL
      ? [process.env.BETTER_AUTH_PRD_URL]
      : []),
  ],
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
