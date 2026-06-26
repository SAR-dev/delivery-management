// Central env validation. Called once at server startup via instrumentation.ts.
//
// Throws on the first missing/invalid value so the app refuses to boot with a
// clear message instead of crashing deep in a request handler or silently
// misbehaving.
//
// Add new vars here as the app grows — group them by concern.

type EnvError = { key: string; message: string }

function collect(fn: (errors: EnvError[]) => void): EnvError[] {
  const errors: EnvError[] = []
  fn(errors)
  return errors
}

function required(
  errors: EnvError[],
  key: string,
  description: string,
): string | undefined {
  const value = process.env[key]
  if (!value || value.trim() === "") {
    errors.push({ key, message: `${description} is required but not set.` })
    return undefined
  }
  return value
}

function oneOf(
  errors: EnvError[],
  key: string,
  allowed: string[],
  fallback: string,
): string {
  const value = (process.env[key] ?? fallback).toLowerCase()
  if (!allowed.includes(value)) {
    errors.push({
      key,
      message: `Must be one of: ${allowed.map((v) => `"${v}"`).join(", ")}. Got: "${process.env[key]}".`,
    })
  }
  return value
}

function minLength(
  errors: EnvError[],
  key: string,
  min: number,
  description: string,
): void {
  const value = process.env[key]
  if (value && value.length < min) {
    errors.push({
      key,
      message: `${description} must be at least ${min} characters.`,
    })
  }
}

// ---------------------------------------------------------------------------

export function validateEnv(): void {
  const errors = collect((e) => {
    // --- Database -----------------------------------------------------------
    const dbProvider = oneOf(e, "DB_PROVIDER", ["postgres", "turso"], "postgres")

    if (dbProvider === "postgres") {
      required(e, "POSTGRES_DATABASE_URL", "PostgreSQL connection string")
    } else if (dbProvider === "turso") {
      required(e, "TURSO_DATABASE_URL", "Turso database URL")
      required(e, "TURSO_AUTH_TOKEN", "Turso auth token")
    }

    // --- Auth ---------------------------------------------------------------
    const secret = required(e, "BETTER_AUTH_SECRET", "Auth secret key")
    if (secret) {
      minLength(e, "BETTER_AUTH_SECRET", 32, "Auth secret key")
    }

    const env = oneOf(
      e,
      "NEXT_PUBLIC_ENV",
      ["development", "production"],
      "development",
    )
    if (env === "production") {
      required(
        e,
        "BETTER_AUTH_PRD_URL",
        "Production app base URL (BETTER_AUTH_PRD_URL)",
      )
    }

    // --- Email (Gmail SMTP) -------------------------------------------------
    required(e, "GMAIL_USER", "Gmail address for sending emails")
    required(
      e,
      "GMAIL_APP_PASSWORD",
      "Gmail App Password (not your login password)",
    )

    // --- Storage ------------------------------------------------------------
    const provider = oneOf(e, "STORAGE_PROVIDER", ["local", "r2"], "local")

    if (provider === "local") {
      required(e, "LOCAL_UPLOADS_DIR", "Local uploads directory path")
    } else if (provider === "r2") {
      required(e, "R2_ACCOUNT_ID", "Cloudflare account ID")
      required(e, "R2_ACCESS_KEY_ID", "R2 API access key")
      required(e, "R2_SECRET_ACCESS_KEY", "R2 API secret key")
      required(e, "R2_BUCKET_NAME", "R2 bucket name")
      required(e, "R2_PUBLIC_URL", "R2 public base URL")
    }
  })

  if (errors.length === 0) return

  const lines = errors
    .map(({ key, message }) => `  ✗ ${key}: ${message}`)
    .join("\n")

  throw new Error(
    `\n\nMissing or invalid environment variables (${errors.length}):\n\n${lines}\n\n` +
    `Check your .env file against .env.example and restart the server.\n`,
  )
}
