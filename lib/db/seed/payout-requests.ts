/**
 * lib/db/seed/payout-requests.ts
 *
 * Seeds 2 payout requests (PENDING, PAID).
 */

import { db } from "@/lib/db"
import { payoutRequest } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { log } from "./helpers"

export async function seedPayoutRequests() {
  log("Seeding payout requests…")

  const rows = [
    {
      id: "jokxrrtood7ik5zheahhzp1r",
      code: "PR-2041",
      merchantId: "uuz3r7ln1o2ipbr12rnowx2q",
      orderIds: ["wwywgid7ili0s9tw143wc4u0"] as string[],
      amount: 2800,
      status: "PENDING" as const,
      payoutMethod: "bKash",
      payoutDetails: "+8801712345602",
      requestedAt: "2025-01-19T09:30:00Z",
    },
    {
      id: "jybrz4o9bx5nefstz1drr1ex",
      code: "PR-2038",
      merchantId: "ucteju8w92cww2x029etxv67",
      orderIds: ["gvqst74z0k9azwudqedvfylw"] as string[],
      amount: 1500,
      status: "PAID" as const,
      payoutMethod: "Bank transfer",
      payoutDetails: "City Bank · A/C 1402300456789",
      requestedAt: "2025-01-15T10:00:00Z",
      reviewedBy: "Nadia Rahman",
      reviewedAt: "2025-01-15T14:00:00Z",
      paidAt: "2025-01-16T11:00:00Z",
    },
  ]

  for (const row of rows) {
    const exists = await db
      .select()
      .from(payoutRequest)
      .where(eq(payoutRequest.id, row.id))
    if (exists.length > 0) {
      log(`  skip payout request ${row.code}`)
      continue
    }
    await db.insert(payoutRequest).values(row)
    log(`  created payout request ${row.code}`)
  }
}
