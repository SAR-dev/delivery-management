import {
  pgTable,
  text,
  boolean,
  timestamp,
  doublePrecision,
  integer,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// =============================================================================
// Better Auth tables (camelCase column names required by Better Auth)
// Better Auth generates and passes its own IDs — no $defaultFn needed here.
// =============================================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow(),
});

// =============================================================================
// Platform profile (extends a Better Auth user with role + domain links)
// userId is the PK and comes from Better Auth — no $defaultFn needed.
// =============================================================================

// role values: SUPER_ADMIN | ADMIN | WAREHOUSE_ADMIN | MERCHANT | RIDER
export const profile = pgTable("profile", {
  userId: text("userId")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  phone: text("phone").notNull().default(""),
  isActive: boolean("isActive").notNull().default(true),
  // Only meaningful for ADMIN users.
  canManagePricing: boolean("canManagePricing").notNull().default(false),
  // FK-like references; kept as plain text to avoid circular deps.
  warehouseId: text("warehouseId"), // WAREHOUSE_ADMIN: the warehouse they manage
  merchantId: text("merchantId"),   // MERCHANT: their merchant business
  riderId: text("riderId"),         // RIDER: their rider profile
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// =============================================================================
// Warehouses
// =============================================================================

export const warehouse = pgTable("warehouse", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  // Soft reference to a WAREHOUSE_ADMIN user id; no FK to avoid tight coupling.
  managedBy: text("managedBy"),
  isActive: boolean("isActive").notNull().default(true),
});

// =============================================================================
// Riders (standalone entity — not tightly coupled to a user row)
// =============================================================================

export const rider = pgTable("rider", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  // Service zone the rider primarily covers.
  zone: text("zone").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  // Home warehouse for delivery riders; null for pickup-only riders.
  warehouseId: text("warehouseId").references(() => warehouse.id, {
    onDelete: "set null",
  }),
});

// =============================================================================
// Merchants (standalone entity — owner contact info stored here directly)
// =============================================================================

// status values: PENDING | ACTIVE | SUSPENDED
export const merchant = pgTable("merchant", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  businessName: text("businessName").notNull(),
  // Owner contact details captured at registration.
  ownerName: text("ownerName").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  status: text("status").notNull().default("PENDING"),
  // Delivery pricing — set by an Admin after approval.
  baseRate: doublePrecision("baseRate").notNull().default(0),
  extraRatePerKg: doublePrecision("extraRatePerKg").notNull().default(0),
  maxWeightKg: doublePrecision("maxWeightKg").notNull().default(3),
  freeWeightKg: doublePrecision("freeWeightKg").notNull().default(1),
  // Soft reference to the admin user who approved this merchant.
  approvedBy: text("approvedBy"),
  approvedAt: timestamp("approvedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// =============================================================================
// Pickup locations (simplified: no city, no is_default)
// =============================================================================

export const pickupLocation = pgTable("pickup_location", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  merchantId: text("merchantId")
    .notNull()
    .references(() => merchant.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  address: text("address").notNull(),
});

// =============================================================================
// Security money config (single-row table; row id = 'default')
// No $defaultFn — the seed always inserts with id = 'default' explicitly.
// =============================================================================

export const securityConfig = pgTable("security_config", {
  id: text("id").primaryKey(), // always 'default'
  lowValueThreshold: doublePrecision("lowValueThreshold")
    .notNull()
    .default(1000),
  lowValueFlatFee: doublePrecision("lowValueFlatFee").notNull().default(10),
  highValuePercentage: doublePrecision("highValuePercentage")
    .notNull()
    .default(1),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Name (not id) of the admin who last updated, matching frontend display.
  updatedBy: text("updatedBy").notNull(),
});

// =============================================================================
// Payout requests
// =============================================================================

// status values: PENDING | APPROVED | PAID | REJECTED
export const payoutRequest = pgTable("payout_request", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  // Short human-friendly reference shown in the UI (e.g. PR-0001).
  code: text("code").notNull().unique(),
  merchantId: text("merchantId")
    .notNull()
    .references(() => merchant.id),
  // JSON-encoded array of order ids included in this request.
  // Stored as text to keep the schema simple; parse in application code.
  orderIds: text("orderIds").notNull(),
  amount: doublePrecision("amount").notNull(),
  status: text("status").notNull().default("PENDING"),
  // Merchant-supplied payout destination.
  payoutMethod: text("payoutMethod").notNull(),
  payoutDetails: text("payoutDetails").notNull(),
  requestedAt: timestamp("requestedAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Super Admin review stamps.
  reviewedBy: text("reviewedBy"),
  reviewedAt: timestamp("reviewedAt", { withTimezone: true }),
  rejectReason: text("rejectReason"),
  paidAt: timestamp("paidAt", { withTimezone: true }),
});

// =============================================================================
// Orders (lifecycle timestamps embedded; replaces separate audit log)
// =============================================================================

// deliveryType values: STANDARD | FRAGILE
// status values: PENDING | APPROVED | PICKED_UP | IN_WAREHOUSE | IN_TRANSIT |
//                OUT_FOR_DELIVERY | DELIVERED | FAILED_ATTEMPT | RETURNED
export const order = pgTable("order", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  // Short human-friendly tracking code (e.g. PF-000123).
  code: text("code").notNull().unique(),
  merchantId: text("merchantId")
    .notNull()
    .references(() => merchant.id),
  pickupLocationId: text("pickupLocationId")
    .notNull()
    .references(() => pickupLocation.id),
  recipientName: text("recipientName").notNull(),
  recipientPhone: text("recipientPhone").notNull(),
  deliveryAddress: text("deliveryAddress").notNull(),
  deliveryCity: text("deliveryCity").notNull(),
  parcelWeightKg: doublePrecision("parcelWeightKg").notNull(),
  deliveryType: text("deliveryType").notNull().default("STANDARD"),
  productCost: doublePrecision("productCost").notNull(),
  deliveryCharge: doublePrecision("deliveryCharge").notNull(),
  securityMoney: doublePrecision("securityMoney").notNull(),
  totalCollectible: doublePrecision("totalCollectible").notNull(),
  status: text("status").notNull().default("PENDING"),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),

  // Phase 4: Admin approves order and assigns pickup rider.
  approvedBy: text("approvedBy"),
  approvedAt: timestamp("approvedAt", { withTimezone: true }),
  pickupRiderId: text("pickupRiderId").references(() => rider.id),
  assignedAt: timestamp("assignedAt", { withTimezone: true }),

  // Phase 5: Pickup rider collects parcel from merchant.
  pickedUpAt: timestamp("pickedUpAt", { withTimezone: true }),

  // Phase 6: Parcel received at warehouse.
  warehouseId: text("warehouseId").references(() => warehouse.id),
  receivedAtWarehouseAt: timestamp("receivedAtWarehouseAt", {
    withTimezone: true,
  }),
  // Name of the Warehouse Admin who logged the parcel in.
  receivedByWarehouse: text("receivedByWarehouse"),

  // Phase 7: Warehouse Admin assigns delivery rider and dispatches parcel.
  deliveryRiderId: text("deliveryRiderId").references(() => rider.id),
  dispatchedAt: timestamp("dispatchedAt", { withTimezone: true }),
  // Name of the Warehouse Admin who dispatched.
  dispatchedBy: text("dispatchedBy"),

  // Phase 8: Delivery rider heads out and attempts delivery.
  outForDeliveryAt: timestamp("outForDeliveryAt", { withTimezone: true }),
  // Successful delivery.
  deliveredAt: timestamp("deliveredAt", { withTimezone: true }),
  // Soft reference to uploaded proof image (URL / storage key).
  deliveryProofRef: text("deliveryProofRef"),
  amountCollected: doublePrecision("amountCollected"),
  // Failed attempt.
  failedAttemptAt: timestamp("failedAttemptAt", { withTimezone: true }),
  failureNote: text("failureNote"),
  deliveryAttempts: integer("deliveryAttempts").notNull().default(0),

  // Phase 8B: Warehouse Admin resolves a failed attempt.
  failedResolvedAt: timestamp("failedResolvedAt", { withTimezone: true }),
  // Name of the Warehouse Admin who resolved the exception.
  failedResolvedBy: text("failedResolvedBy"),
  // Set only when parcel is closed as RETURNED.
  returnedAt: timestamp("returnedAt", { withTimezone: true }),
  returnReason: text("returnReason"),

  // Phase 9: COD reconciliation — rider settles cash with Warehouse Admin.
  codSettledAt: timestamp("codSettledAt", { withTimezone: true }),
  codSettledBy: text("codSettledBy"),
  // Payout request this order is attached to. While set (and not REJECTED)
  // the order is locked and cannot be added to another request.
  payoutRequestId: text("payoutRequestId").references(() => payoutRequest.id),
});
