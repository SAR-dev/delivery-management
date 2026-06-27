/**
 * lib/db/schema.ts
 *
 * Re-exports the correct schema based on DB_PROVIDER at runtime.
 * Both schema.postgres and schema.turso export the same names with the same
 * logical shape, so types are compatible across providers.
 *
 * TypeScript always sees the postgres types (the canonical shapes).
 */

import type * as pgExports from "./schema.postgres"

const provider = (process.env.DB_PROVIDER ?? "postgres").toLowerCase()

const mod: typeof pgExports =
  provider === "turso"
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require("./schema.turso") as typeof pgExports)
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require("./schema.postgres") as typeof pgExports)

export const {
  user,
  session,
  account,
  verification,
  profileRoles,
  profile,
  division,
  warehouse,
  riderTaskTypes,
  rider,
  merchantStatuses,
  merchant,
  pickupLocation,
  securityConfig,
  payoutRequestStatuses,
  payoutRequest,
  orderDeliveryTypes,
  orderStatuses,
  order,
  failedMail,
  emailLogStatuses,
  emailLog,
  auditLog,
  announcement,
} = mod
