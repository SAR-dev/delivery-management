import { betterAuth } from "better-auth"
import { admin } from "better-auth/plugins"
import { pool } from "@/lib/db"

export const auth = betterAuth({
  database: pool,
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
    ...(process.env.NODE_ENV === "development"
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
