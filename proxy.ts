// Edge proxy — runs before every matched request.
//
// Responsibilities:
//   1. Rate-limit the upload endpoint to prevent flood attacks.
//      Uses an in-process sliding-window counter (Map + timestamp).
//      For multi-instance deployments swap this out for a Redis/Upstash store.

import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

// ---------------------------------------------------------------------------
// Simple in-process sliding-window rate limiter.
// Sufficient for single-instance / single-region deployments.
// Replace with @upstash/ratelimit for multi-instance setups.
// ---------------------------------------------------------------------------

interface Window {
  count: number
  resetAt: number
}

const uploadWindows = new Map<string, Window>()

const UPLOAD_LIMIT = 20 // requests
const UPLOAD_WINDOW_MS = 60_000 // per minute

function pruneExpired(now: number): void {
  for (const [ip, entry] of uploadWindows) {
    if (now >= entry.resetAt) uploadWindows.delete(ip)
  }
}

function uploadRateLimit(ip: string): boolean {
  const now = Date.now()
  pruneExpired(now)
  const entry = uploadWindows.get(ip)

  if (!entry || now >= entry.resetAt) {
    uploadWindows.set(ip, { count: 1, resetAt: now + UPLOAD_WINDOW_MS })
    return true // allowed
  }

  if (entry.count >= UPLOAD_LIMIT) return false // blocked

  entry.count++
  return true // allowed
}

// ---------------------------------------------------------------------------

export function proxy(req: NextRequest) {
  if (req.method === "POST" && req.nextUrl.pathname === "/api/uploads") {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"

    if (!uploadRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many uploads. Please wait a moment and try again." },
        { status: 429 },
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/uploads"],
}
