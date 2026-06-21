import { NextResponse } from "next/server"
import { z } from "zod"
import { MAX_BULK_ORDERS } from "@/lib/constants"

export async function parseBody<T extends z.ZodType>(
  req: Request,
  schema: T,
): Promise<
  { data: z.infer<T>; error: null } | { data: null; error: NextResponse }
> {
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

const requiredString = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)

// Accepts either an absolute URL (e.g. an externally hosted image) or a
// site-relative upload path served by app/uploads/[...path]/route.ts — the
// local storage driver returns paths like "/uploads/avatars/<id>/<uuid>.png",
// which z.url() alone would reject.
const imageUrl = (label: string) =>
  z
    .string({ error: `${label} must be a valid URL` })
    .trim()
    .refine((v) => v.startsWith("/") || z.url().safeParse(v).success, {
      error: `${label} must be a valid URL`,
    })

export const securityConfigSchema = z.object({
  lowValueThreshold: z.number().nonnegative(),
  lowValueFlatFee: z.number().nonnegative(),
  highValuePercentage: z.number().nonnegative(),
})

export const merchantRegisterSchema = z.object({
  businessName: requiredString("Business name"),
  ownerName: requiredString("Owner name"),
  email: z.email("A valid email is required"),
  phone: requiredString("Phone"),
  address: requiredString("Address"),
  divisionId: requiredString("Division"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const divisionCreateSchema = z.object({
  name: requiredString("Division name"),
})

export const divisionUpdateSchema = z
  .object({
    name: requiredString("Division name").optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => d.name !== undefined || d.isActive !== undefined, {
    error: "Provide a name or active state to update",
  })

export const warehouseCreateSchema = z.object({
  name: requiredString("Warehouse name"),
  address: requiredString("Address"),
  city: requiredString("City"),
  divisionId: requiredString("Division"),
})

export const warehouseUpdateSchema = z
  .object({
    name: requiredString("Warehouse name").optional(),
    address: requiredString("Address").optional(),
    city: requiredString("City").optional(),
    divisionId: requiredString("Division").optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.address !== undefined ||
      d.city !== undefined ||
      d.divisionId !== undefined ||
      d.isActive !== undefined,
    { error: "Provide at least one field to update" },
  )

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

export const orderCreateSchema = z.object({
  pickupLocationId: requiredString("Pickup location"),
  recipientName: requiredString("Recipient name"),
  recipientPhone: requiredString("Recipient phone"),
  deliveryAddress: requiredString("Delivery address"),
  deliveryCity: requiredString("Delivery city"),
  deliveryDivisionId: requiredString("Delivery division"),
  deliveryMapLink: z
    .url("Map link must be a valid URL")
    .or(z.literal(""))
    .nullish(),
  deliveryImageLinks: z
    .array(z.url("Each image link must be a valid URL"))
    .max(10, "You can add up to 10 image links")
    .nullish(),
  parcelWeightKg: z.number().positive("Parcel weight must be greater than 0"),
  deliveryType: z.enum(["STANDARD", "FRAGILE"]).optional(),
  productCost: z.number().nonnegative("Product cost cannot be negative"),
})

export const orderBulkCreateSchema = z.object({
  orders: z
    .array(orderCreateSchema)
    .min(1, "At least one order is required")
    .max(
      MAX_BULK_ORDERS,
      `You can create up to ${MAX_BULK_ORDERS} orders at a time`,
    ),
})

export const orderApproveSchema = z.object({
  riderId: requiredString("riderId"),
})

export const orderDispatchSchema = z.object({
  riderId: requiredString("riderId"),
})

export const orderPickedUpSchema = z.object({
  proofRefs: z
    .array(imageUrl("Each pickup proof photo"))
    .min(1, "At least one pickup proof photo is required")
    .max(10, "You can add up to 10 pickup proof photos"),
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

export const payoutCreateSchema = z.object({
  payoutMethod: requiredString("Payout method"),
  payoutDetails: requiredString("Account details"),
})

export const payoutRejectSchema = z.object({
  reason: requiredString("A rejection reason"),
})

export const riderCreateSchema = z.object({
  name: requiredString("Name"),
  email: z.email("A valid email is required"),
  phone: requiredString("Phone"),
  zone: requiredString("Zone"),
  // Home warehouse for delivery riders; null/omitted for pickup-only riders.
  warehouseId: z.string().nullish(),
})

export const profileUpdateSchema = z
  .object({
    name: requiredString("Name").optional(),
    // `null` clears the avatar; a string sets it; omitted leaves it unchanged.
    image: imageUrl("Avatar").nullish(),
  })
  .refine((d) => d.name !== undefined || d.image !== undefined, {
    error: "Provide a name or an image to update",
  })

export const pickupLocationSchema = z.object({
  label: requiredString("Shop name"),
  address: requiredString("Address"),
  divisionId: requiredString("Division"),
  mapLink: z.url("Map link must be a valid URL").optional().or(z.literal("")),
  imageLinks: z
    .array(imageUrl("Each image link"))
    .max(10, "You can add up to 10 image links")
    .optional(),
})

export const merchantProfileSchema = z.object({
  businessName: requiredString("Business name"),
  email: z.email("A valid email is required"),
  phone: requiredString("Phone"),
  address: requiredString("Address"),
  divisionId: requiredString("Division"),
})

export const teamCreateSchema = z.object({
  name: requiredString("Name"),
  email: z.email("A valid email is required"),
  phone: requiredString("Phone"),
  role: z.enum(["ADMIN", "WAREHOUSE_ADMIN"], { error: "Invalid role" }),
  warehouseId: z.string().nullish(),
  canManagePricing: z.boolean().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
})
