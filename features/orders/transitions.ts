import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import {
  merchant,
  order,
  pickupLocation,
  rider,
  warehouse,
} from "@/lib/db/schema"
import { parseBody } from "@/lib/validation"
import {
  orderApproveSchema,
  orderDeliveredSchema,
  orderDispatchSchema,
  orderFailedSchema,
  orderPickedUpSchema,
  orderReturnSchema,
} from "@/lib/validation"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import type { z } from "zod"

// ---------------------------------------------------------------------------
// Declarative order state machine.
//
// Every order-lifecycle PATCH route used to repeat the same skeleton:
//   requireSession → role/ownership gate → fetch order → status guard →
//   business rules → db.update(...).set(...) → return the row.
//
// This module captures each transition declaratively so the 10 route files
// become thin wrappers. Behavior is intentionally identical to the original
// routes — including the exact order in which checks run and the exact error
// messages/status codes — so Phase 0's spec tests pass unmodified.
// ---------------------------------------------------------------------------

type Session = NonNullable<Awaited<ReturnType<typeof requireSession>>>
type OrderRow = typeof order.$inferSelect

// A short-circuit error (mapped to a NextResponse) or null to continue.
type GuardError = { error: string; status: number } | null

interface TransitionContext<Body> {
  order: OrderRow
  session: Session
  body: Body
}

interface TransitionDef<Schema extends z.ZodType | undefined = undefined> {
  // Role/precondition gate. Returns true when the session may attempt this
  // transition at all (mirrors each route's `me.role !== ...` check).
  authorize: (session: Session) => boolean
  // Optional Zod schema; when present the body is parsed BEFORE the order is
  // fetched, exactly as the original routes did (invalid body → 400, not 404).
  schema?: Schema
  // Ownership + status + business-rule checks, run in the original per-route
  // order. Returns an error to short-circuit, or null to proceed.
  guard: (
    ctx: TransitionContext<
      Schema extends z.ZodType ? z.infer<Schema> : undefined
    >,
  ) => Promise<GuardError> | GuardError
  // Computes the `db.update(order).set(...)` payload for a valid transition.
  buildUpdate: (
    ctx: TransitionContext<
      Schema extends z.ZodType ? z.infer<Schema> : undefined
    >,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>
}

function defineTransition<Schema extends z.ZodType | undefined>(
  def: TransitionDef<Schema>,
): TransitionDef<Schema> {
  return def
}

export const ORDER_TRANSITIONS = {
  // -------------------------------------------------------------------------
  approve: defineTransition({
    authorize: (me) => me.role === "SUPER_ADMIN" || me.role === "ADMIN",
    schema: orderApproveSchema,
    guard: async ({ order: o, body }) => {
      if (o.status !== "PENDING") {
        return { error: "Only PENDING orders can be approved", status: 400 }
      }
      const [riderRow] = await db
        .select()
        .from(rider)
        .where(eq(rider.id, body.riderId))
        .limit(1)
      if (!riderRow || !riderRow.isActive) {
        return { error: "Select an active pickup rider.", status: 400 }
      }
      if (riderRow.taskType === "DELIVERY") {
        return {
          error:
            "Select a pickup rider — this rider is a warehouse delivery rider.",
          status: 400,
        }
      }
      // Weight compliance against the merchant's current pricing settings.
      const [merchantRow] = await db
        .select({ maxWeightKg: merchant.maxWeightKg })
        .from(merchant)
        .where(eq(merchant.id, o.merchantId))
        .limit(1)
      if (merchantRow && o.parcelWeightKg > merchantRow.maxWeightKg) {
        return {
          error: `Parcel weight exceeds the ${merchantRow.maxWeightKg} KG limit and cannot be approved.`,
          status: 400,
        }
      }
      return null
    },
    buildUpdate: ({ session, body }) => {
      const now = new Date().toISOString()
      return {
        status: "APPROVED",
        approvedBy: session.name,
        approvedAt: now,
        pickupRiderId: body.riderId,
        assignedAt: now,
      }
    },
  }),

  // -------------------------------------------------------------------------
  dispatch: defineTransition({
    authorize: (me) => me.role === "WAREHOUSE_ADMIN" && Boolean(me.warehouseId),
    schema: orderDispatchSchema,
    guard: async ({ order: o, session, body }) => {
      if (o.status !== "IN_WAREHOUSE") {
        return {
          error: "Only IN_WAREHOUSE parcels can be dispatched.",
          status: 400,
        }
      }
      if (o.warehouseId !== session.warehouseId) {
        return {
          error: "This parcel is held at a different warehouse.",
          status: 400,
        }
      }
      const [riderRow] = await db
        .select()
        .from(rider)
        .where(eq(rider.id, body.riderId))
        .limit(1)
      if (!riderRow || !riderRow.isActive) {
        return { error: "Select an active delivery rider.", status: 400 }
      }
      if (riderRow.warehouseId !== session.warehouseId) {
        return {
          error: "Select a delivery rider based at this warehouse.",
          status: 400,
        }
      }
      if (riderRow.taskType === "PICKUP") {
        return {
          error: "Select a delivery rider — this rider is a pickup rider.",
          status: 400,
        }
      }
      return null
    },
    buildUpdate: ({ session, body }) => ({
      status: "IN_TRANSIT",
      deliveryRiderId: body.riderId,
      dispatchedAt: new Date().toISOString(),
      dispatchedBy: session.name,
    }),
  }),

  // -------------------------------------------------------------------------
  "picked-up": defineTransition({
    authorize: (me) => me.role === "RIDER" && Boolean(me.riderId),
    schema: orderPickedUpSchema,
    guard: ({ order: o, session }) => {
      if (o.pickupRiderId !== session.riderId) {
        return { error: "This pickup is not assigned to you.", status: 403 }
      }
      if (o.status !== "APPROVED") {
        return { error: "Only APPROVED orders can be picked up.", status: 400 }
      }
      return null
    },
    buildUpdate: async ({ order: o, body }) => {
      // Route the parcel to an active hub in the SAME division it was picked
      // up from. If the division has no active hub, leave warehouseId null so
      // the order stays in the shared incoming queue and never disappears.
      let destinationWarehouseId: string | null = null
      const [pickup] = await db
        .select({ divisionId: pickupLocation.divisionId })
        .from(pickupLocation)
        .where(eq(pickupLocation.id, o.pickupLocationId))
        .limit(1)
      if (pickup?.divisionId) {
        const [hub] = await db
          .select({ id: warehouse.id })
          .from(warehouse)
          .where(
            and(
              eq(warehouse.isActive, true),
              eq(warehouse.divisionId, pickup.divisionId),
            ),
          )
          .limit(1)
        destinationWarehouseId = hub?.id ?? null
      }
      return {
        status: "PICKED_UP",
        pickedUpAt: new Date().toISOString(),
        warehouseId: destinationWarehouseId,
        pickupProofRefs: body.proofRefs,
      }
    },
  }),

  // -------------------------------------------------------------------------
  receive: defineTransition({
    authorize: (me) => me.role === "WAREHOUSE_ADMIN" && Boolean(me.warehouseId),
    guard: ({ order: o }) => {
      if (o.status !== "PICKED_UP") {
        return {
          error: "Only PICKED_UP parcels can be received.",
          status: 400,
        }
      }
      return null
    },
    buildUpdate: ({ session }) => ({
      status: "IN_WAREHOUSE",
      warehouseId: session.warehouseId,
      receivedAtWarehouseAt: new Date().toISOString(),
      receivedByWarehouse: session.name,
    }),
  }),

  // -------------------------------------------------------------------------
  "out-for-delivery": defineTransition({
    authorize: (me) => me.role === "RIDER" && Boolean(me.riderId),
    guard: ({ order: o, session }) => {
      if (o.deliveryRiderId !== session.riderId) {
        return { error: "This delivery is not assigned to you.", status: 403 }
      }
      if (o.status !== "IN_TRANSIT") {
        return {
          error: "Only IN_TRANSIT parcels can go out for delivery.",
          status: 400,
        }
      }
      return null
    },
    buildUpdate: ({ order: o }) => ({
      status: "OUT_FOR_DELIVERY",
      outForDeliveryAt: new Date().toISOString(),
      deliveryAttempts: (o.deliveryAttempts ?? 0) + 1,
    }),
  }),

  // -------------------------------------------------------------------------
  delivered: defineTransition({
    authorize: (me) => me.role === "RIDER" && Boolean(me.riderId),
    schema: orderDeliveredSchema,
    guard: ({ order: o, session }) => {
      if (o.deliveryRiderId !== session.riderId) {
        return { error: "This delivery is not assigned to you.", status: 403 }
      }
      if (o.status !== "OUT_FOR_DELIVERY") {
        return {
          error: "Only OUT_FOR_DELIVERY parcels can be marked delivered.",
          status: 400,
        }
      }
      return null
    },
    buildUpdate: ({ order: o, body }) => ({
      status: "DELIVERED",
      deliveredAt: new Date().toISOString(),
      deliveryProofRef: body.proofRef ?? `proof_${o.code.toLowerCase()}.jpg`,
      amountCollected: o.totalCollectible,
    }),
  }),

  // -------------------------------------------------------------------------
  failed: defineTransition({
    authorize: (me) => me.role === "RIDER" && Boolean(me.riderId),
    schema: orderFailedSchema,
    guard: ({ order: o, session }) => {
      if (o.deliveryRiderId !== session.riderId) {
        return { error: "This delivery is not assigned to you.", status: 403 }
      }
      if (o.status !== "OUT_FOR_DELIVERY") {
        return {
          error: "Only OUT_FOR_DELIVERY parcels can be marked failed.",
          status: 400,
        }
      }
      return null
    },
    buildUpdate: ({ body }) => ({
      status: "FAILED_ATTEMPT",
      failedAttemptAt: new Date().toISOString(),
      failureNote: body.note.trim(),
    }),
  }),

  // -------------------------------------------------------------------------
  reattempt: defineTransition({
    authorize: (me) => me.role === "WAREHOUSE_ADMIN" && Boolean(me.warehouseId),
    guard: ({ order: o, session }) => {
      if (o.status !== "FAILED_ATTEMPT") {
        return {
          error: "Only FAILED_ATTEMPT parcels can be reattempted.",
          status: 400,
        }
      }
      if (o.warehouseId !== session.warehouseId) {
        return {
          error: "This parcel is held at a different warehouse.",
          status: 400,
        }
      }
      return null
    },
    buildUpdate: ({ order: o, session }) => {
      const now = new Date().toISOString()
      return {
        status: "OUT_FOR_DELIVERY",
        failureNote: null,
        failedAttemptAt: null,
        failedResolvedAt: now,
        failedResolvedBy: session.name,
        outForDeliveryAt: now,
        deliveryAttempts: (o.deliveryAttempts ?? 0) + 1,
      }
    },
  }),

  // -------------------------------------------------------------------------
  return: defineTransition({
    authorize: (me) => me.role === "WAREHOUSE_ADMIN" && Boolean(me.warehouseId),
    schema: orderReturnSchema,
    guard: ({ order: o, session }) => {
      if (o.status !== "FAILED_ATTEMPT") {
        return {
          error: "Only FAILED_ATTEMPT parcels can be returned.",
          status: 400,
        }
      }
      if (o.warehouseId !== session.warehouseId) {
        return {
          error: "This parcel is held at a different warehouse.",
          status: 400,
        }
      }
      return null
    },
    buildUpdate: ({ session, body }) => {
      const now = new Date().toISOString()
      return {
        status: "RETURNED",
        failedResolvedAt: now,
        failedResolvedBy: session.name,
        returnedAt: now,
        returnReason: body.reason.trim(),
      }
    },
  }),

  // -------------------------------------------------------------------------
  "settle-cod": defineTransition({
    authorize: (me) => me.role === "WAREHOUSE_ADMIN" && Boolean(me.warehouseId),
    guard: ({ order: o, session }) => {
      if (o.status !== "DELIVERED") {
        return { error: "Only DELIVERED parcels can be settled.", status: 400 }
      }
      if (o.warehouseId !== session.warehouseId) {
        return {
          error: "This parcel belongs to a different warehouse.",
          status: 400,
        }
      }
      if (o.codSettledAt) {
        return {
          error: "This parcel's COD is already settled.",
          status: 400,
        }
      }
      return null
    },
    buildUpdate: ({ session }) => ({
      codSettledAt: new Date().toISOString(),
      codSettledBy: session.name,
    }),
  }),
} as const

export type TransitionName = keyof typeof ORDER_TRANSITIONS

// ---------------------------------------------------------------------------
// Shared runner. Every transition route delegates to this. The control flow
// mirrors the original routes exactly:
//   session → role gate → (parse body) → fetch order → guard → update.
// ---------------------------------------------------------------------------
export async function applyOrderTransition(
  name: TransitionName,
  orderId: string,
  req: Request,
): Promise<NextResponse> {
  const def = ORDER_TRANSITIONS[name] as TransitionDef<z.ZodType | undefined>

  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (!def.authorize(me)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Body is parsed before the order is fetched (invalid body → 400, not 404).
  let body: unknown = undefined
  if (def.schema) {
    const parsed = await parseBody(req, def.schema)
    if (parsed.error) return parsed.error
    body = parsed.data
  }

  const [orderRow] = await db
    .select()
    .from(order)
    .where(eq(order.id, orderId))
    .limit(1)
  if (!orderRow) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  const ctx = { order: orderRow, session: me, body } as TransitionContext<never>

  const guardError = await def.guard(ctx)
  if (guardError) {
    return NextResponse.json(
      { error: guardError.error },
      { status: guardError.status },
    )
  }

  const updateValues = await def.buildUpdate(ctx)
  const [updated] = await db
    .update(order)
    .set(updateValues)
    .where(eq(order.id, orderId))
    .returning()

  return NextResponse.json(updated)
}
