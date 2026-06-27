/**
 * lib/db/seed/email-logs.ts
 *
 * Seeds 3 email-log entries (SENT, FAILED).
 */

import { db } from "@/lib/db"
import { emailLog } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { log } from "./helpers"

export async function seedEmailLogs() {
  log("Seeding email logs…")

  const rows = [
    {
      id: "emaillog_seed_0001",
      to: "owner@threadnstyle.com",
      subject: "[ParcelFlow] Your merchant account has been approved",
      status: "SENT" as const,
      attempts: 1,
      error: null,
      createdAt: "2025-01-12T10:15:05Z",
    },
    {
      id: "emaillog_seed_0002",
      to: "owner@urbanthreads.com",
      subject: "[ParcelFlow] Your merchant account has been approved",
      status: "SENT" as const,
      attempts: 2,
      error: null,
      createdAt: "2025-01-13T11:05:00Z",
    },
    {
      id: "emaillog_seed_0003",
      to: "owner@gadgethub.com",
      subject: "[ParcelFlow] Your merchant account has been approved",
      status: "FAILED" as const,
      attempts: 4,
      error: "Connection timeout while contacting mail server",
      createdAt: "2025-01-16T09:40:00Z",
    },
  ]

  for (const row of rows) {
    const exists = await db
      .select()
      .from(emailLog)
      .where(eq(emailLog.id, row.id))
    if (exists.length > 0) {
      log(`  skip email log ${row.id}`)
      continue
    }
    await db.insert(emailLog).values(row)
    log(`  created email log to ${row.to} (${row.status})`)
  }
}
