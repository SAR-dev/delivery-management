import { betterAuth } from "better-auth"
import { admin } from "better-auth/plugins"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
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
})
