import "dotenv/config"
import { defineConfig } from "drizzle-kit"

const provider = (process.env.DB_PROVIDER ?? "postgres").toLowerCase()

if (provider === "postgres") {
  if (!process.env.POSTGRES_DATABASE_URL) {
    throw new Error(
      "POSTGRES_DATABASE_URL is required when DB_PROVIDER=postgres",
    )
  }
} else if (provider === "turso") {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    throw new Error(
      "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required when DB_PROVIDER=turso",
    )
  }
} else {
  throw new Error(
    `Invalid DB_PROVIDER: "${provider}". Must be "postgres" or "turso".`,
  )
}

export default defineConfig(
  provider === "postgres"
    ? {
        schema: "./lib/db/schema.postgres.ts",
        out: "./drizzle/postgres",
        dialect: "postgresql",
        dbCredentials: {
          url: process.env.POSTGRES_DATABASE_URL!,
        },
        strict: true,
        verbose: true,
      }
    : {
        schema: "./lib/db/schema.turso.ts",
        out: "./drizzle/turso",
        dialect: "turso",
        dbCredentials: {
          url: process.env.TURSO_DATABASE_URL!,
          authToken: process.env.TURSO_AUTH_TOKEN!,
        },
        strict: true,
        verbose: true,
      },
)
