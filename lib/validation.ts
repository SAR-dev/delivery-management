import { NextResponse } from "next/server"
import { z } from "zod"

/**
 * Parse and validate a request JSON body against a zod schema.
 *
 * On success returns `{ data }` with the typed, parsed value.
 * On failure (bad JSON or schema mismatch) returns `{ error }`, a ready-to-send
 * 400 NextResponse including per-field issues. Routes should do:
 *
 *   const parsed = await parseBody(req, someSchema)
 *   if (parsed.error) return parsed.error
 *   const { ... } = parsed.data
 */
export async function parseBody<T extends z.ZodType>(
  req: Request,
  schema: T,
): Promise<{ data: z.infer<T>; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    raw = undefined
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    return {
      data: null,
      error: NextResponse.json(
        {
          error: "Invalid request body",
          issues: z.flattenError(result.error).fieldErrors,
        },
        { status: 400 },
      ),
    }
  }

  return { data: result.data, error: null }
}

// --- Shared field helpers ---------------------------------------------------

const requiredString = (label: string) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`)

// --- Security config --------------------------------------------------------

export const securityConfigSchema = z.object({
  lowValueThreshold: z.number().nonnegative(),
  lowValueFlatFee: z.number().nonnegative(),
  highValuePercentage: z.number().nonnegative(),
})

// --- Merchants --------------------------------------------------------------

export const merchantRegisterSchema = z.object({
  businessName: requiredString("Business name"),
  ownerName: requiredString("Owner name"),
  email: z.email("A valid email is required"),
  phone: requiredString("Phone"),
  address: requiredString("Address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const merchantPricingSchema = z
  .object({
    baseRate: z.number().nonnegative(),
    extraRatePerKg: z.number().nonnegative(),
    freeWeightKg: z.number().nonnegative(),
    maxWeightKg: z.number().positive(),
  })
  .refine((d) => d.freeWeightKg <= d.maxWeightKg, {
    error: "freeWeightKg cannot exceed maxWeightKg",
    path: ["freeWeightKg"],
  })

// --- Orders -----------------------------------------------------------------

export const orderCreateSchema = z.object({
  pickupLocationId: requiredString("Pickup location"),
  recipientName: requiredString("Recipient name"),
  recipientPhone: requiredString("Recipient phone"),
  deliveryAddress: requiredString("Delivery address"),
  deliveryCity: requiredString("Delivery city"),
  parcelWeightKg: z.number().positive("Parcel weight must be greater than 0"),
  deliveryType: z.enum(["STANDARD", "FRAGILE"]).optional(),
  productCost: z.number().nonnegative("Product cost cannot be negative"),
})

export const orderBulkCreateSchema = z.object({
  orders: z
    .array(orderCreateSchema)
    .min(1, "At least one order is required")
    .max(50, "You can create up to 50 orders at a time"),
})

export const orderApproveSchema = z.object({
  riderId: requiredString("riderId"),
})

export const orderDispatchSchema = z.object({
  riderId: requiredString("riderId"),
})

export const orderDeliveredSchema = z.object({
  proofRef: z.string().trim().min(1).optional(),
})

export const orderFailedSchema = z.object({
  note: requiredString("A reason note"),
})

export const orderReturnSchema = z.object({
  reason: requiredString("A return reason"),
})

// --- Payouts ----------------------------------------------------------------

export const payoutCreateSchema = z.object({
  payoutMethod: requiredString("Payout method"),
  payoutDetails: requiredString("Account details"),
})

export const payoutRejectSchema = z.object({
  reason: requiredString("A rejection reason"),
})

// --- Team -------------------------------------------------------------------

export const teamCreateSchema = z.object({
  name: requiredString("Name"),
  email: z.email("A valid email is required"),
  phone: requiredString("Phone"),
  role: z.enum(["ADMIN", "WAREHOUSE_ADMIN"], { error: "Invalid role" }),
  warehouseId: z.string().nullish(),
  canManagePricing: z.boolean().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
})
