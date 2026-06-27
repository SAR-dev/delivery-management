/**
 * lib/db/seed/audit-logs.ts
 *
 * Seeds 5 audit-log entries.
 */

import { db } from "@/lib/db"
import { auditLog } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { log } from "./helpers"

export async function seedAuditLogs() {
  log("Seeding audit logs…")

  const rows = [
    {
      id: "auditlog_seed_0001",
      actorId: "byai6ci02ogt3lnawaro35pj",
      actorName: "Nadia Rahman",
      actorRole: "SUPER_ADMIN" as const,
      action: "SECURITY_CONFIG_UPDATED",
      entityType: "security_config",
      entityId: "default",
      description: "Updated security money rules",
      createdAt: "2025-01-10T09:00:00Z",
    },
    {
      id: "auditlog_seed_0002",
      actorId: "u5f1ybhii5mzu2ejkcckusxn",
      actorName: "Tanvir Hossain",
      actorRole: "ADMIN" as const,
      action: "MERCHANT_APPROVED",
      entityType: "merchant",
      entityId: "merchant_threadnstyle",
      description: "Approved merchant Thread & Style",
      createdAt: "2025-01-12T10:15:00Z",
    },
    {
      id: "auditlog_seed_0003",
      actorId: "u5f1ybhii5mzu2ejkcckusxn",
      actorName: "Tanvir Hossain",
      actorRole: "ADMIN" as const,
      action: "ORDER_APPROVE",
      entityType: "order",
      entityId: "order_pf100274",
      description: "Approved order PF-100274",
      createdAt: "2025-01-14T07:20:00Z",
    },
    {
      id: "auditlog_seed_0004",
      actorId: "byai6ci02ogt3lnawaro35pj",
      actorName: "Nadia Rahman",
      actorRole: "SUPER_ADMIN" as const,
      action: "PAYOUT_APPROVED",
      entityType: "payout_request",
      entityId: "jybrz4o9bx5nefstz1drr1ex",
      description: "Approved payout request PR-1001",
      createdAt: "2025-01-15T12:00:00Z",
    },
    {
      id: "auditlog_seed_0005",
      actorId: "byai6ci02ogt3lnawaro35pj",
      actorName: "Nadia Rahman",
      actorRole: "SUPER_ADMIN" as const,
      action: "TEAM_MEMBER_CREATED",
      entityType: "user",
      entityId: "u5f1ybhii5mzu2ejkcckusxn",
      description:
        "Created ADMIN account for Tanvir Hossain (tanvir@parcelflow.io)",
      createdAt: "2025-01-08T08:00:00Z",
    },
  ]

  for (const row of rows) {
    const exists = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.id, row.id))
    if (exists.length > 0) {
      log(`  skip audit log ${row.id}`)
      continue
    }
    await db.insert(auditLog).values(row)
    log(`  created audit log ${row.action}`)
  }
}
