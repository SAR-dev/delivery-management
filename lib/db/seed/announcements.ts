/**
 * lib/db/seed/announcements.ts
 *
 * Seeds 6 announcements covering every meaningful state:
 *   - live (active, published, not yet expired)
 *   - expiring soon
 *   - expired (active flag on, but expiresAt in the past)
 *   - inactive (killed via isActive=false)
 *   - scheduled (publishedAt in the future)
 *   - draft (no publishedAt)
 *
 * All dates are expressed relative to `now` so the seed stays realistic
 * across re-runs without manual date maintenance.
 */

import { db } from "@/lib/db"
import { announcement } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { log } from "./helpers"

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export async function seedAnnouncements() {
  log("Seeding announcements…")

  const rows = [
    // 1. Live — visible to all roles right now, no expiry.
    {
      id: "ann_seed_0001",
      title: "Welcome to ParcelFlow",
      content:
        "ParcelFlow is now live. Merchants can start placing orders, riders can begin pickups, and warehouse staff can manage intake and dispatch from their dashboards. Reach out to your admin if you need help getting started.",
      publishedAt: daysFromNow(-7),
      expiresAt: null,
      isActive: true,
      targetRoles: ["SUPER_ADMIN", "ADMIN", "WAREHOUSE_ADMIN", "MERCHANT", "RIDER"],
      createdBy: "Nadia Rahman",
    },

    // 2. Live — targeted only at riders, expiring in 3 days (urgency test).
    {
      id: "ann_seed_0002",
      title: "New pickup zones active from Monday",
      content:
        "Three new pickup zones have been added in Mirpur, Uttara, and Demra. Update your route plans accordingly. Zone maps are available in the Divisions page. Contact your warehouse admin if you have questions about your assigned area.",
      publishedAt: daysFromNow(-2),
      expiresAt: daysFromNow(3),
      isActive: true,
      targetRoles: ["RIDER"],
      createdBy: "Tanvir Hossain",
    },

    // 3. Live — targeted at merchants, published 3 days ago.
    {
      id: "ann_seed_0003",
      title: "COD payout cycle updated to weekly",
      content:
        "COD payouts are now processed every Monday instead of bi-weekly. The first weekly payout will include all settled orders from the past two weeks. No action is required on your part — payout requests will be reviewed and approved on the new schedule.",
      publishedAt: daysFromNow(-3),
      expiresAt: daysFromNow(14),
      isActive: true,
      targetRoles: ["MERCHANT"],
      createdBy: "Nadia Rahman",
    },

    // 4. Expired — isActive true but expiresAt is in the past.
    //    Tests that expired announcements are correctly excluded from /active.
    {
      id: "ann_seed_0004",
      title: "Eid holiday schedule (expired)",
      content:
        "Operations will run on a reduced schedule during the Eid holiday. Pickup and delivery services will continue in Dhaka and Chattogram. Other divisions may experience delays of 1–2 days.",
      publishedAt: daysFromNow(-30),
      expiresAt: daysFromNow(-10),
      isActive: true,
      targetRoles: ["SUPER_ADMIN", "ADMIN", "WAREHOUSE_ADMIN", "MERCHANT", "RIDER"],
      createdBy: "Tanvir Hossain",
    },

    // 5. Scheduled — publishedAt in the future, so not yet live.
    {
      id: "ann_seed_0005",
      title: "Planned maintenance — Sunday 2 AM–4 AM",
      content:
        "The platform will be in read-only mode during a scheduled maintenance window. Order creation, status updates, and payout requests will be unavailable during this period. All other views will remain accessible.",
      publishedAt: daysFromNow(5),
      expiresAt: daysFromNow(6),
      isActive: true,
      targetRoles: ["SUPER_ADMIN", "ADMIN", "WAREHOUSE_ADMIN", "MERCHANT", "RIDER"],
      createdBy: "Nadia Rahman",
    },

    // 6. Inactive draft — isActive false, no publishedAt.
    //    Tests the admin kill-switch; never surfaces in /active.
    {
      id: "ann_seed_0006",
      title: "Rate card revision (draft)",
      content:
        "Delivery rate cards are being revised for the upcoming quarter. New rates will apply from the first of next month. An updated announcement will be published once the rates are finalised.",
      publishedAt: null,
      expiresAt: null,
      isActive: false,
      targetRoles: ["MERCHANT"],
      createdBy: "Nadia Rahman",
    },
  ]

  for (const row of rows) {
    const exists = await db
      .select()
      .from(announcement)
      .where(eq(announcement.id, row.id))
    if (exists.length > 0) {
      log(`  skip announcement "${row.title}"`)
      continue
    }
    await db.insert(announcement).values(row)
    log(`  created announcement "${row.title}"`)
  }
}
