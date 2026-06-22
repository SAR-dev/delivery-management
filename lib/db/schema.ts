import {
  pgTable,
  text,
  boolean,
  timestamp,
  doublePrecision,
  integer,
  jsonb,
} from "drizzle-orm/pg-core"
import { createId } from "@paralleldrive/cuid2"

// =============================================================================
// Shared column helpers
// =============================================================================

// All timestamp columns use `mode: "string"` so Drizzle decodes them as ISO
// strings instead of `Date` objects. Inferred row types can be used directly
// as app-level types with no conversion layer — consistent with how dates are
// represented everywhere else (React state, server/client boundaries, etc.).
const ts = (name: string) =>
  timestamp(name, { mode: "string", withTimezone: true })

// =============================================================================
// Better Auth tables
//
// Better Auth manages its own migrations and talks to Postgres directly
// (see lib/auth.ts: `database: pool`), so it never reads these Drizzle
// definitions. They exist solely to give the app typed access for queries and
// joins. The SQL shape here MUST stay in sync with whatever Better Auth
// creates in the database — if Better Auth changes a column, update it here.
//
// Column names are camelCase because that is what Better Auth requires.
// Better Auth generates and injects its own IDs, so no $defaultFn is needed.
// =============================================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: ts("createdAt").notNull().defaultNow(),
  updatedAt: ts("updatedAt").notNull().defaultNow(),
  // Required by the better-auth admin plugin
  role: text("role"),
  banned: boolean("banned"),
  banReason: text("banReason"),
  banExpires: ts("banExpires"),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: ts("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: ts("createdAt").notNull().defaultNow(),
  updatedAt: ts("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

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
  accessTokenExpiresAt: ts("accessTokenExpiresAt"),
  refreshTokenExpiresAt: ts("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: ts("createdAt").notNull().defaultNow(),
  updatedAt: ts("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: ts("expiresAt").notNull(),
  createdAt: ts("createdAt").defaultNow(),
  updatedAt: ts("updatedAt").defaultNow(),
})

// =============================================================================
// Platform profile (extends a Better Auth user with role + domain links)
// userId is the PK and comes from Better Auth — no $defaultFn needed.
// =============================================================================

// `enum` here is a Drizzle-only hint — it narrows the inferred TypeScript type
// for `role` to this literal union instead of `string`. No Postgres enum type
// is created; the column remains plain `text` in the database and no migration
// is needed when this list changes. Runtime validation is the caller's job.
export const profileRoles = [
  "SUPER_ADMIN",
  "ADMIN",
  "WAREHOUSE_ADMIN",
  "MERCHANT",
  "RIDER",
] as const

export const profile = pgTable("profile", {
  userId: text("userId")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role", { enum: profileRoles }).notNull(),
  phone: text("phone").notNull().default(""),
  isActive: boolean("isActive").notNull().default(true),
  // Only meaningful for ADMIN users.
  canManagePricing: boolean("canManagePricing").notNull().default(false),
  // Domain entity references. Stored as plain text (no FK constraint) to avoid
  // circular dependencies between the profile table and its referents.
  // Only the field matching the user's role is expected to be populated.
  warehouseId: text("warehouseId"), // WAREHOUSE_ADMIN: the warehouse they manage
  merchantId: text("merchantId"), // MERCHANT: their merchant business
  riderId: text("riderId"), // RIDER: their rider profile
  createdAt: ts("createdAt").notNull().defaultNow(),
})

// =============================================================================
// Divisions (geographic regions, e.g. Bangladesh divisions)
//
// Managed by Super Admins. Every address-bearing entity (warehouse, merchant,
// pickup location, order receiver) references a division so parcels can be
// routed to the hub serving the division they are picked up from.
// =============================================================================

export const division = pgTable("division", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull().unique(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: ts("createdAt").notNull().defaultNow(),
})

// =============================================================================
// Warehouses
// =============================================================================

export const warehouse = pgTable("warehouse", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  // Division this hub serves. Soft reference (no FK) so divisions can be
  // managed independently. Nullable in the DB for backwards compatibility;
  // required at the validation/UI layer for new records.
  divisionId: text("divisionId"),
  // Soft reference to a WAREHOUSE_ADMIN user id; no FK to avoid tight coupling.
  managedBy: text("managedBy"),
  isActive: boolean("isActive").notNull().default(true),
})

// =============================================================================
// Riders (standalone entity — not tightly coupled to a user row)
// =============================================================================

// What a rider is allowed to do. Decoupled from the warehouse association so a
// rider can, e.g., be a PICKUP rider that still belongs to a hub, or handle
// BOTH legs. Drizzle-only `enum` hint — the column stays plain `text`.
export const riderTaskTypes = ["PICKUP", "DELIVERY", "BOTH"] as const

export const rider = pgTable("rider", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  // Service zone the rider primarily covers.
  zone: text("zone").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  // What the rider is allowed to do, independent of their home warehouse.
  taskType: text("taskType", { enum: riderTaskTypes })
    .notNull()
    .default("DELIVERY"),
  // Home warehouse this rider dispatches from. Every rider belongs to exactly
  // one warehouse. `restrict` prevents deleting a hub that still has riders.
  warehouseId: text("warehouseId")
    .notNull()
    .references(() => warehouse.id, { onDelete: "restrict" }),
})

// =============================================================================
// Merchants (standalone entity — owner contact info stored here directly)
// =============================================================================

export const merchantStatuses = ["PENDING", "ACTIVE", "SUSPENDED"] as const

export const merchant = pgTable("merchant", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  businessName: text("businessName").notNull(),
  // Owner contact details captured at registration.
  ownerName: text("ownerName").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  // Division the merchant's business address belongs to (soft reference).
  divisionId: text("divisionId"),
  status: text("status", { enum: merchantStatuses })
    .notNull()
    .default("PENDING"),
  // Delivery pricing — set by an Admin after approval.
  baseRate: doublePrecision("baseRate").notNull().default(0),
  extraRatePerKg: doublePrecision("extraRatePerKg").notNull().default(0),
  maxWeightKg: doublePrecision("maxWeightKg").notNull().default(3),
  freeWeightKg: doublePrecision("freeWeightKg").notNull().default(1),
  // Soft reference (user id) to the admin who approved this merchant.
  // Null until an admin acts on the PENDING application.
  approvedBy: text("approvedBy"),
  approvedAt: ts("approvedAt"),
  createdAt: ts("createdAt").notNull().defaultNow(),
})

// =============================================================================
// Pickup locations (simplified: no city, no is_default)
// =============================================================================

export const pickupLocation = pgTable("pickup_location", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  merchantId: text("merchantId")
    .notNull()
    .references(() => merchant.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  address: text("address").notNull(),
  // Division this pickup location is in. Drives which warehouse a parcel
  // collected here is routed to (soft reference).
  divisionId: text("divisionId"),
  // Optional map link (e.g. Google Maps URL) so riders can pinpoint the shop.
  mapLink: text("mapLink"),
  // Optional list of image URLs (shop front / landmark photos) to help riders
  // find the pickup location.
  imageLinks: text("imageLinks").array(),
})

// =============================================================================
// Security money config
//
// Single-row configuration table. The one row always has id = 'default' and
// is inserted by the seed script. No $defaultFn is used because the id value
// must be the literal string 'default', not a generated cuid.
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
  updatedAt: ts("updatedAt").notNull().defaultNow(),
  // Name (not id) of the admin who last updated, matching frontend display.
  updatedBy: text("updatedBy").notNull(),
})

// =============================================================================
// Payout requests
// =============================================================================

export const payoutRequestStatuses = [
  "PENDING",
  "APPROVED",
  "PAID",
  "REJECTED",
] as const

export const payoutRequest = pgTable("payout_request", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  // Short human-friendly reference shown in the UI (e.g. PR-0001).
  code: text("code").notNull().unique(),
  merchantId: text("merchantId")
    .notNull()
    .references(() => merchant.id),
  // Order IDs bundled into this payout request, stored as jsonb. The
  // .$type<string[]>() call tells Drizzle the inferred type without altering
  // the column — no manual JSON.stringify / JSON.parse is needed at runtime.
  orderIds: jsonb("orderIds").$type<string[]>().notNull(),
  amount: doublePrecision("amount").notNull(),
  status: text("status", { enum: payoutRequestStatuses })
    .notNull()
    .default("PENDING"),
  // Merchant-supplied payout destination.
  payoutMethod: text("payoutMethod").notNull(),
  payoutDetails: text("payoutDetails").notNull(),
  requestedAt: ts("requestedAt").notNull().defaultNow(),
  // Super Admin review stamps.
  reviewedBy: text("reviewedBy"),
  reviewedAt: ts("reviewedAt"),
  rejectReason: text("rejectReason"),
  paidAt: ts("paidAt"),
})

// =============================================================================
// Orders
//
// All lifecycle timestamps are embedded directly on the order row rather than
// in a separate audit log table. Fields are null until their stage is reached.
// =============================================================================

export const orderDeliveryTypes = ["STANDARD", "FRAGILE"] as const

export const orderStatuses = [
  "PENDING",
  "APPROVED",
  "PICKED_UP",
  "IN_WAREHOUSE",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED_ATTEMPT",
  "RETURNED",
] as const

export const order = pgTable("order", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
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
  // Division of the receiver address (soft reference).
  deliveryDivisionId: text("deliveryDivisionId"),
  // Optional map link (e.g. Google Maps URL) the merchant can share to pinpoint
  // the recipient location.
  deliveryMapLink: text("deliveryMapLink"),
  // Optional list of image URLs (location photos / landmarks) shared by the
  // merchant to help the rider find the address.
  deliveryImageLinks: text("deliveryImageLinks").array(),
  parcelWeightKg: doublePrecision("parcelWeightKg").notNull(),
  deliveryType: text("deliveryType", { enum: orderDeliveryTypes })
    .notNull()
    .default("STANDARD"),
  productCost: doublePrecision("productCost").notNull(),
  deliveryCharge: doublePrecision("deliveryCharge").notNull(),
  securityMoney: doublePrecision("securityMoney").notNull(),
  totalCollectible: doublePrecision("totalCollectible").notNull(),
  status: text("status", { enum: orderStatuses }).notNull().default("PENDING"),
  createdAt: ts("createdAt").notNull().defaultNow(),

  // Admin approval and pickup rider assignment.
  approvedBy: text("approvedBy"),
  approvedAt: ts("approvedAt"),
  pickupRiderId: text("pickupRiderId").references(() => rider.id),
  assignedAt: ts("assignedAt"),

  // Pickup rider collects parcel from merchant.
  pickedUpAt: ts("pickedUpAt"),
  // Photo(s) the pickup rider captures as proof of collection (shop front,
  // parcel in hand, etc). Multiple images allowed, same pattern as the
  // pickup-location reference photos above.
  pickupProofRefs: text("pickupProofRefs").array(),

  // Parcel received at warehouse.
  warehouseId: text("warehouseId").references(() => warehouse.id),
  receivedAtWarehouseAt: ts("receivedAtWarehouseAt"),
  // Name of the Warehouse Admin who logged the parcel in.
  receivedByWarehouse: text("receivedByWarehouse"),

  // Warehouse Admin assigns delivery rider and dispatches parcel.
  deliveryRiderId: text("deliveryRiderId").references(() => rider.id),
  dispatchedAt: ts("dispatchedAt"),
  // Name of the Warehouse Admin who dispatched.
  dispatchedBy: text("dispatchedBy"),

  // Delivery rider heads out and attempts delivery.
  outForDeliveryAt: ts("outForDeliveryAt"),
  // Successful delivery.
  deliveredAt: ts("deliveredAt"),
  // Soft reference to uploaded proof image (URL / storage key).
  deliveryProofRef: text("deliveryProofRef"),
  amountCollected: doublePrecision("amountCollected"),
  // Failed attempt.
  failedAttemptAt: ts("failedAttemptAt"),
  failureNote: text("failureNote"),
  deliveryAttempts: integer("deliveryAttempts").notNull().default(0),

  // Warehouse Admin resolves a failed delivery attempt.
  failedResolvedAt: ts("failedResolvedAt"),
  // Name of the Warehouse Admin who resolved the exception.
  failedResolvedBy: text("failedResolvedBy"),
  // Set only when parcel is closed as RETURNED.
  returnedAt: ts("returnedAt"),
  returnReason: text("returnReason"),

  // COD reconciliation — rider settles cash with Warehouse Admin.
  codSettledAt: ts("codSettledAt"),
  codSettledBy: text("codSettledBy"),
  // Payout request this order is attached to. Presence of this field (combined
  // with a non-REJECTED request status) locks the order so it cannot be
  // included in a second payout request.
  payoutRequestId: text("payoutRequestId").references(() => payoutRequest.id),
})
