import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"

// =============================================================================
// Shared column helpers
// =============================================================================

// All timestamp columns stored as ISO strings (text) in SQLite.
// SQLite has no timezone-aware timestamp type; storing as text preserves
// existing app behavior where timestamps are treated as ISO strings throughout.
const ts = (name: string) => text(name)

// SQLite has no native array type. Arrays are stored as JSON text and
// deserialized automatically by Drizzle's json mode.
const textArray = (name: string) =>
  text(name, { mode: "json" }).$type<string[] | null>()

// =============================================================================
// Better Auth tables
//
// Better Auth manages its own migrations; these definitions exist solely to
// give the app typed access for queries and joins. Column names are camelCase
// because that is what Better Auth requires.
// =============================================================================

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: ts("createdAt")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: ts("updatedAt")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  // Required by the better-auth admin plugin
  role: text("role"),
  banned: integer("banned", { mode: "boolean" }),
  banReason: text("banReason"),
  banExpires: ts("banExpires"),
})

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: ts("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: ts("createdAt")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: ts("updatedAt")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = sqliteTable("account", {
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
  createdAt: ts("createdAt")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: ts("updatedAt")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
})

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: ts("expiresAt").notNull(),
  createdAt: ts("createdAt").default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: ts("updatedAt").default(sql`(CURRENT_TIMESTAMP)`),
})

// =============================================================================
// Platform profile (extends a Better Auth user with role + domain links)
// =============================================================================

export const profileRoles = [
  "SUPER_ADMIN",
  "ADMIN",
  "WAREHOUSE_ADMIN",
  "MERCHANT",
  "RIDER",
] as const

export const profile = sqliteTable("profile", {
  userId: text("userId")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role", { enum: profileRoles }).notNull(),
  phone: text("phone").notNull().default(""),
  isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
  canManagePricing: integer("canManagePricing", { mode: "boolean" })
    .notNull()
    .default(false),
  tableRowsPerPage: integer("tableRowsPerPage").notNull().default(20),
  warehouseId: text("warehouseId"),
  merchantId: text("merchantId"),
  riderId: text("riderId"),
  createdAt: ts("createdAt")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
})

// =============================================================================
// Divisions
// =============================================================================

export const division = sqliteTable("division", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull().unique(),
  isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
  createdAt: ts("createdAt")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
})

// =============================================================================
// Warehouses
// =============================================================================

export const warehouse = sqliteTable("warehouse", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  divisionId: text("divisionId"),
  managedBy: text("managedBy"),
  isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
})

// =============================================================================
// Riders
// =============================================================================

export const riderTaskTypes = ["PICKUP", "DELIVERY", "BOTH"] as const

export const rider = sqliteTable("rider", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  zone: text("zone").notNull(),
  isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
  taskType: text("taskType", { enum: riderTaskTypes })
    .notNull()
    .default("DELIVERY"),
  warehouseId: text("warehouseId")
    .notNull()
    .references(() => warehouse.id, { onDelete: "restrict" }),
})

// =============================================================================
// Merchants
// =============================================================================

export const merchantStatuses = ["PENDING", "ACTIVE", "SUSPENDED"] as const

export const merchant = sqliteTable("merchant", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  businessName: text("businessName").notNull(),
  ownerName: text("ownerName").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  divisionId: text("divisionId"),
  status: text("status", { enum: merchantStatuses })
    .notNull()
    .default("PENDING"),
  baseRate: real("baseRate").notNull().default(0),
  extraRatePerKg: real("extraRatePerKg").notNull().default(0),
  maxWeightKg: real("maxWeightKg").notNull().default(3),
  freeWeightKg: real("freeWeightKg").notNull().default(1),
  approvedBy: text("approvedBy"),
  approvedAt: ts("approvedAt"),
  createdAt: ts("createdAt")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
})

// =============================================================================
// Pickup locations
// =============================================================================

export const pickupLocation = sqliteTable("pickup_location", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  merchantId: text("merchantId")
    .notNull()
    .references(() => merchant.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  address: text("address").notNull(),
  divisionId: text("divisionId"),
  mapLink: text("mapLink"),
  // SQLite has no array type — stored as JSON text, Drizzle handles
  // serialize/deserialize transparently via mode: "json".
  imageLinks: textArray("imageLinks"),
})

// =============================================================================
// Security money config
// =============================================================================

export const securityConfig = sqliteTable("security_config", {
  id: text("id").primaryKey(), // always 'default'
  lowValueThreshold: real("lowValueThreshold").notNull().default(1000),
  lowValueFlatFee: real("lowValueFlatFee").notNull().default(10),
  highValuePercentage: real("highValuePercentage").notNull().default(1),
  updatedAt: ts("updatedAt")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
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

export const payoutRequest = sqliteTable("payout_request", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  code: text("code").notNull().unique(),
  merchantId: text("merchantId")
    .notNull()
    .references(() => merchant.id),
  // Stored as JSON text (was jsonb in Postgres). Drizzle handles
  // serialize/deserialize transparently via mode: "json".
  orderIds: text("orderIds", { mode: "json" }).$type<string[]>().notNull(),
  amount: real("amount").notNull(),
  status: text("status", { enum: payoutRequestStatuses })
    .notNull()
    .default("PENDING"),
  payoutMethod: text("payoutMethod").notNull(),
  payoutDetails: text("payoutDetails").notNull(),
  requestedAt: ts("requestedAt")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  reviewedBy: text("reviewedBy"),
  reviewedAt: ts("reviewedAt"),
  rejectReason: text("rejectReason"),
  paidAt: ts("paidAt"),
})

// =============================================================================
// Orders
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
  "CANCELLED",
] as const

export const order = sqliteTable("order", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
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
  deliveryDivisionId: text("deliveryDivisionId"),
  deliveryMapLink: text("deliveryMapLink"),
  // Stored as JSON text (was text[]).
  deliveryImageLinks: textArray("deliveryImageLinks"),
  parcelWeightKg: real("parcelWeightKg").notNull(),
  deliveryType: text("deliveryType", { enum: orderDeliveryTypes })
    .notNull()
    .default("STANDARD"),
  productCost: real("productCost").notNull(),
  deliveryCharge: real("deliveryCharge").notNull(),
  securityMoney: real("securityMoney").notNull(),
  totalCollectible: real("totalCollectible").notNull(),
  status: text("status", { enum: orderStatuses }).notNull().default("PENDING"),
  createdAt: ts("createdAt")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),

  approvedBy: text("approvedBy"),
  approvedAt: ts("approvedAt"),
  pickupRiderId: text("pickupRiderId").references(() => rider.id),
  assignedAt: ts("assignedAt"),

  pickedUpAt: ts("pickedUpAt"),
  // Stored as JSON text (was text[]).
  pickupProofRefs: textArray("pickupProofRefs"),

  warehouseId: text("warehouseId").references(() => warehouse.id),
  receivedAtWarehouseAt: ts("receivedAtWarehouseAt"),
  receivedByWarehouse: text("receivedByWarehouse"),

  deliveryRiderId: text("deliveryRiderId").references(() => rider.id),
  dispatchedAt: ts("dispatchedAt"),
  dispatchedBy: text("dispatchedBy"),

  outForDeliveryAt: ts("outForDeliveryAt"),
  deliveredAt: ts("deliveredAt"),
  deliveryProofRef: text("deliveryProofRef"),
  amountCollected: real("amountCollected"),
  failedAttemptAt: ts("failedAttemptAt"),
  failureNote: text("failureNote"),
  deliveryAttempts: integer("deliveryAttempts").notNull().default(0),

  failedResolvedAt: ts("failedResolvedAt"),
  failedResolvedBy: text("failedResolvedBy"),
  returnedAt: ts("returnedAt"),
  returnReason: text("returnReason"),

  cancelledAt: ts("cancelledAt"),
  cancelledBy: text("cancelledBy"),
  cancelReason: text("cancelReason"),

  merchantNote: text("merchantNote"),
  receiverNote: text("receiverNote"),

  codSettledAt: ts("codSettledAt"),
  codSettledBy: text("codSettledBy"),
  payoutRequestId: text("payoutRequestId").references(() => payoutRequest.id),
})

// =============================================================================
// Failed mail log
// =============================================================================

export const failedMail = sqliteTable("failed_mail", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  html: text("html"),
  text: text("text"),
  error: text("error").notNull(),
  attempts: integer("attempts").notNull(),
  failedAt: ts("failedAt")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
})

// =============================================================================
// Email log
// =============================================================================

export const emailLogStatuses = ["SENT", "FAILED"] as const

export const emailLog = sqliteTable("email_log", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  status: text("status", { enum: emailLogStatuses }).notNull(),
  attempts: integer("attempts").notNull(),
  error: text("error"),
  createdAt: ts("createdAt")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  markedSentBy: text("markedSentBy"),
  markedSentAt: ts("markedSentAt"),
})

// =============================================================================
// Audit log
// =============================================================================

export const auditLog = sqliteTable("audit_log", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  actorId: text("actorId"),
  actorName: text("actorName").notNull(),
  actorRole: text("actorRole", { enum: profileRoles }).notNull(),
  action: text("action").notNull(),
  entityType: text("entityType").notNull(),
  entityId: text("entityId"),
  description: text("description").notNull(),
  // Stored as JSON text (was jsonb in Postgres).
  metadata: text("metadata", { mode: "json" }),
  createdAt: ts("createdAt")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
})
