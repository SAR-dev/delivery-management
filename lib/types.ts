import type {
  user,
  profile,
  warehouse,
  rider,
  merchant,
  pickupLocation,
  securityConfig,
  payoutRequest,
  order,
} from "@/lib/db/schema"

// =============================================================================
// All domain types below are *derived* from the Drizzle schema (lib/db/schema.ts)
// instead of hand-duplicated here. This is the single source of truth: add a
// column to a table and every type that uses it (mock data, context state,
// components) is updated automatically by the compiler — no more drift
// between what the DB actually stores and what the app thinks it stores.
// =============================================================================

// Drizzle's $inferSelect marks a nullable column as `T | null` but keeps the
// key required, since a real `SELECT *` always returns the column (with a
// possibly-null value). For in-memory/app-state objects that's noisier than
// we want (mock seed data and optimistic updates routinely omit columns that
// are simply null), so this utility makes any column whose type includes
// `null` optional too, while leaving every other column's shape untouched.
type NullableKeys<T> = {
  [K in keyof T]: null extends T[K] ? K : never
}[keyof T]
type Loosen<T> = Omit<T, NullableKeys<T>> & Partial<Pick<T, NullableKeys<T>>>

// --- Literal unions, derived from the schema's `enum`-hinted columns -------
// (see schema.ts: these are still plain `text` columns in Postgres — the
// `enum` option is a Drizzle/TypeScript-only hint, not a runtime check.)
export type Role = (typeof profile.$inferSelect)["role"]
export type MerchantStatus = (typeof merchant.$inferSelect)["status"]
export type DeliveryType = (typeof order.$inferSelect)["deliveryType"]
export type OrderStatus = (typeof order.$inferSelect)["status"]
export type PayoutRequestStatus = (typeof payoutRequest.$inferSelect)["status"]

// --- User: Better Auth's `user` row joined 1:1 with our `profile` row ------
// `userId` is just profile's PK/FK back to user.id, and profile.createdAt
// mirrors user.createdAt, so both are dropped from the profile side to avoid
// duplicate/conflicting keys.
type JoinedUser = typeof user.$inferSelect &
  Omit<typeof profile.$inferSelect, "userId" | "createdAt"> & {
    // Optional per-user password — only set on self-registered users (seeded
    // demo users authenticate with the shared demo passwords below). Not a
    // DB column: Better Auth's own `account` table owns real credentials.
    password?: string
  }

export type User = Loosen<JoinedUser>

export type Warehouse = Loosen<typeof warehouse.$inferSelect>
export type SecurityMoneyConfig = Loosen<typeof securityConfig.$inferSelect>
export type Merchant = Loosen<typeof merchant.$inferSelect>
export type PickupLocation = Loosen<typeof pickupLocation.$inferSelect>
export type Rider = Loosen<typeof rider.$inferSelect>
export type Order = Loosen<typeof order.$inferSelect>
export type PayoutRequest = Loosen<typeof payoutRequest.$inferSelect>

// =============================================================================
// App-only input shapes — request payloads, not DB rows, so there's no table
// to derive these from.
// =============================================================================

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

export interface CreateOrderInput {
  pickupLocationId: string
  recipientName: string
  recipientPhone: string
  deliveryAddress: string
  deliveryCity: string
  deliveryMapLink?: string | null
  deliveryImageLinks?: string[] | null
  parcelWeightKg: number
  deliveryType: DeliveryType
  productCost: number
}
