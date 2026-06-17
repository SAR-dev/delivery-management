export type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "WAREHOUSE_ADMIN"
  | "MERCHANT"
  | "RIDER"

export type MerchantStatus = "PENDING" | "ACTIVE" | "SUSPENDED"

export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: Role
  isActive: boolean
  createdAt: string
  // Convenience flag for ADMIN users: may they set merchant pricing?
  canManagePricing?: boolean
  // For WAREHOUSE_ADMIN users: the warehouse they manage
  warehouseId?: string | null
  // For MERCHANT users: the merchant business they own
  merchantId?: string | null
  // For RIDER users: the rider profile they sign in as
  riderId?: string | null
  // Optional per-user password (set on self-registration; seeded users use shared demo passwords)
  password?: string
}

export interface Warehouse {
  id: string
  name: string
  address: string
  city: string
  managedBy: string | null
  isActive: boolean
}

export interface SecurityMoneyConfig {
  lowValueThreshold: number
  lowValueFlatFee: number
  highValuePercentage: number
  updatedAt: string
  updatedBy: string
}

export interface Merchant {
  id: string
  businessName: string
  // Owner (the merchant user) contact details captured at registration.
  ownerName: string
  email: string
  phone: string
  address: string
  status: MerchantStatus
  // Pricing — set by an Admin after approval. Defaults to 0 base rate.
  baseRate: number
  extraRatePerKg: number
  maxWeightKg: number
  freeWeightKg: number
  approvedBy: string | null
  approvedAt: string | null
  createdAt: string
}

export interface MerchantRegistrationInput {
  businessName: string
  ownerName: string
  email: string
  phone: string
  address: string
  password: string
}

export interface MerchantPricingInput {
  baseRate: number
  extraRatePerKg: number
  freeWeightKg: number
  maxWeightKg: number
}

export type DeliveryType = "STANDARD" | "FRAGILE"

export type OrderStatus =
  | "PENDING"
  | "APPROVED"
  | "PICKED_UP"
  | "IN_WAREHOUSE"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED_ATTEMPT"
  | "RETURNED"

export interface PickupLocation {
  id: string
  merchantId: string
  label: string
  address: string
}

// Riders either collect parcels from merchants (pickup riders, assigned by an
// Admin in Phase 4) or carry parcels from a warehouse to the recipient
// (delivery riders, assigned by a Warehouse Admin in Phase 7).
export interface Rider {
  id: string
  name: string
  phone: string
  // Service zone the rider primarily covers (helps match by area).
  zone: string
  isActive: boolean
  // Home warehouse for delivery riders. Pickup riders leave this null/undefined.
  // A Warehouse Admin can only dispatch parcels to delivery riders based at
  // their own warehouse.
  warehouseId?: string | null
}

export interface Order {
  id: string
  // Short human-friendly tracking code shown in tables.
  code: string
  merchantId: string
  pickupLocationId: string
  recipientName: string
  recipientPhone: string
  deliveryAddress: string
  deliveryCity: string
  parcelWeightKg: number
  deliveryType: DeliveryType
  productCost: number
  deliveryCharge: number
  securityMoney: number
  totalCollectible: number
  status: OrderStatus
  createdAt: string
  // --- Phase 4: approval & pickup assignment (Admin) ---
  // Set when an Admin verifies the order and moves it to APPROVED.
  approvedBy?: string | null
  approvedAt?: string | null
  // The pickup rider assigned to collect the parcel from the merchant.
  pickupRiderId?: string | null
  assignedAt?: string | null
  // --- Phase 5: pickup from merchant (Rider) ---
  // Set when the assigned rider collects the parcel and marks PICKED_UP.
  pickedUpAt?: string | null
  // --- Phase 6: parcel submitted to warehouse (Rider -> Warehouse) ---
  // The warehouse that received and logged the parcel.
  warehouseId?: string | null
  receivedAtWarehouseAt?: string | null
  // Name of the Warehouse Admin who logged the parcel in.
  receivedByWarehouse?: string | null
  // --- Phase 7: delivery rider assignment (Warehouse Admin) ---
  // The delivery rider dispatched to carry the parcel to the recipient.
  deliveryRiderId?: string | null
  dispatchedAt?: string | null
  // Name of the Warehouse Admin who dispatched the parcel.
  dispatchedBy?: string | null
  // --- Phase 8: delivery attempt (Delivery Rider -> Customer) ---
  // Set when the delivery rider heads out with the parcel.
  outForDeliveryAt?: string | null
  // Successful delivery: timestamp + optional proof reference (mock stand-in
  // for the uploaded proof image) and the amount collected from the customer.
  deliveredAt?: string | null
  deliveryProofRef?: string | null
  amountCollected?: number | null
  // Failed attempt: timestamp + required reason note. The parcel returns to
  // the warehouse queue for a Warehouse Admin to process (Phase 8B).
  failedAttemptAt?: string | null
  failureNote?: string | null
  // Number of delivery attempts made so far.
  deliveryAttempts?: number
  // --- Phase 8B: failed delivery resolution (Warehouse Admin) ---
  // When a Warehouse Admin processes a FAILED_ATTEMPT parcel, they either send
  // it back OUT_FOR_DELIVERY (re-attempt) or close it as RETURNED. These stamps
  // record who resolved the exception and when.
  failedResolvedAt?: string | null
  failedResolvedBy?: string | null
  // Set only when the parcel is closed as RETURNED. No COD is collected and no
  // merchant payout is issued for a returned parcel.
  returnedAt?: string | null
  returnReason?: string | null
  // --- Phase 9: COD reconciliation & merchant payout ----------------------
  // Set when the delivery rider settles the collected cash for this DELIVERED
  // parcel to the Warehouse Admin. Only settled orders become eligible for a
  // merchant payout. (Steps 44-46.)
  codSettledAt?: string | null
  codSettledBy?: string | null
  // The payout request this order is attached to. While set (and the request
  // is not REJECTED) the order is "locked" and cannot be added to another
  // request. Reject unlocks it again.
  payoutRequestId?: string | null
}

export type PayoutRequestStatus = "PENDING" | "APPROVED" | "PAID" | "REJECTED"

// A merchant's request to be paid out the product cost of one or more
// delivered, COD-settled orders (Phase 9). Delivery charge and security money
// are platform revenue and are never part of the payout.
export interface PayoutRequest {
  id: string
  code: string
  merchantId: string
  orderIds: string[]
  // Sum of product cost across the included orders — the amount owed to the
  // merchant.
  amount: number
  status: PayoutRequestStatus
  // Merchant-supplied payout destination (bank / mobile banking reference).
  payoutMethod: string
  payoutDetails: string
  requestedAt: string
  // Super Admin review stamps.
  reviewedBy?: string | null
  reviewedAt?: string | null
  rejectReason?: string | null
  // Set when the Super Admin marks the approved payout as paid out.
  paidAt?: string | null
}

export interface CreateOrderInput {
  pickupLocationId: string
  recipientName: string
  recipientPhone: string
  deliveryAddress: string
  deliveryCity: string
  parcelWeightKg: number
  deliveryType: DeliveryType
  productCost: number
}
