/**
 * lib/db/seed/payout-linked-orders.ts
 *
 * Seeds 2 orders that reference payout requests (ORD_17, ORD_18).
 */

import { db } from "@/lib/db"
import { order } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { DIVISION_IDS, log } from "./helpers"

export async function seedPayoutLinkedOrders() {
  log("Seeding payout-linked orders…")

  const rows = [
    {
      id: "l0n1vgduq8v5sbq0i44c9i40",
      code: "PF-100273",
      merchantId: "uuz3r7ln1o2ipbr12rnowx2q",
      pickupLocationId: "i8407hm6he3upn30fse0qj4w",
      recipientName: "Junaid Bashar",
      recipientPhone: "+8801800008899",
      deliveryAddress: "House 3, Road 27, Gulshan 1, Dhaka",
      deliveryCity: "Dhaka",
      deliveryDivisionId: DIVISION_IDS.Dhaka,
      deliveryMapLink:
        "https://www.google.com/maps/search/?api=1&query=House%203%2C%20Road%2027%2C%20Gulshan%201%2C%20Dhaka",
      parcelWeightKg: 1.2,
      deliveryType: "STANDARD" as const,
      productCost: 2800,
      deliveryCharge: 55,
      securityMoney: 28,
      totalCollectible: 2883,
      status: "DELIVERED" as const,
      createdAt: "2025-01-18T07:00:00Z",
      approvedBy: "Tanvir Hossain",
      approvedAt: "2025-01-18T07:20:00Z",
      pickupRiderId: "q4am2x0nkz1m2a2m47if7vra",
      assignedAt: "2025-01-18T07:21:00Z",
      pickedUpAt: "2025-01-18T08:10:00Z",
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7",
      receivedAtWarehouseAt: "2025-01-18T10:00:00Z",
      receivedByWarehouse: "Rifat Chowdhury",
      deliveryRiderId: "khelbntdjda5h8y3pa7etjd4",
      dispatchedAt: "2025-01-18T11:30:00Z",
      dispatchedBy: "Rifat Chowdhury",
      outForDeliveryAt: "2025-01-18T13:00:00Z",
      deliveredAt: "2025-01-18T15:10:00Z",
      deliveryProofRef: "proof_pf-100273.jpg",
      amountCollected: 2883,
      deliveryAttempts: 1,
      codSettledAt: "2025-01-18T18:00:00Z",
      codSettledBy: "Rifat Chowdhury",
      payoutRequestId: "jokxrrtood7ik5zheahhzp1r",
    },
    {
      id: "gvqst74z0k9azwudqedvfylw",
      code: "PF-100274",
      merchantId: "ucteju8w92cww2x029etxv67",
      pickupLocationId: "hu22eapfey4srbcrn87uu8dy",
      recipientName: "Mehjabin Haque",
      recipientPhone: "+8801800009900",
      deliveryAddress: "House 5, Road 16, Dhanmondi, Dhaka",
      deliveryCity: "Dhaka",
      deliveryDivisionId: DIVISION_IDS.Dhaka,
      deliveryImageLinks: [
        "https://picsum.photos/seed/PF-100274-gate/600/600",
        "https://picsum.photos/seed/PF-100274-building/600/600",
      ],
      parcelWeightKg: 0.9,
      deliveryType: "STANDARD" as const,
      productCost: 1500,
      deliveryCharge: 60,
      securityMoney: 15,
      totalCollectible: 1575,
      status: "DELIVERED" as const,
      createdAt: "2025-01-14T07:00:00Z",
      approvedBy: "Tanvir Hossain",
      approvedAt: "2025-01-14T07:20:00Z",
      pickupRiderId: "wcsub4pe1pk4x5zd7gri7ee2",
      assignedAt: "2025-01-14T07:21:00Z",
      pickedUpAt: "2025-01-14T08:10:00Z",
      warehouseId: "b5mujkfyyq6qqw5t1unbm8b7",
      receivedAtWarehouseAt: "2025-01-14T10:00:00Z",
      receivedByWarehouse: "Rifat Chowdhury",
      deliveryRiderId: "khelbntdjda5h8y3pa7etjd4",
      dispatchedAt: "2025-01-14T11:30:00Z",
      dispatchedBy: "Rifat Chowdhury",
      outForDeliveryAt: "2025-01-14T13:00:00Z",
      deliveredAt: "2025-01-14T15:10:00Z",
      deliveryProofRef: "proof_pf-100274.jpg",
      amountCollected: 1575,
      deliveryAttempts: 1,
      codSettledAt: "2025-01-14T18:00:00Z",
      codSettledBy: "Rifat Chowdhury",
      payoutRequestId: "jybrz4o9bx5nefstz1drr1ex",
    },
  ]

  for (const row of rows) {
    const exists = await db.select().from(order).where(eq(order.id, row.id))
    if (exists.length > 0) {
      log(`  skip order ${row.code}`)
      continue
    }
    await db.insert(order).values(row)
    log(`  created order ${row.code}`)
  }
}
