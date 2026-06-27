import { requireSession } from "@/lib/api-auth"
import { unauthorized, forbidden, notFound } from "@/lib/api-response"
import { logAudit } from "@/lib/audit"
import { db } from "@/lib/db"
import {
  merchant,
  order,
  pickupLocation,
  rider,
  warehouse,
} from "@/lib/db/schema"
import {
  orderApproveSchema,
  orderCancelSchema,
  orderDeliveredSchema,
  orderDispatchSchema,
  orderFailedSchema,
  orderPickedUpSchema,
  orderReturnSchema,
  parseBody,
} from "@/lib/validation"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import type { z } from "zod"

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
  authorize: (session: Session) => boolean
  schema?: Schema
  guard: (
    ctx: TransitionContext<
      Schema extends z.ZodType ? z.infer<Schema> : undefined
    >,
  ) => Promise<GuardError> | GuardError
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

  cancel: defineTransition({
    authorize: (me) =>
      me.role === "SUPER_ADMIN" ||
      me.role === "ADMIN" ||
      me.role === "WAREHOUSE_ADMIN" ||
      me.role === "MERCHANT",
    schema: orderCancelSchema,
    guard: ({ order: o, session }) => {
      if (session.role === "MERCHANT") {
        if (o.merchantId !== session.merchantId) {
          return { error: "Forbidden", status: 403 }
        }
        const merchantAllowed = ["PENDING", "APPROVED"] as const
        if (!(merchantAllowed as readonly string[]).includes(o.status)) {
          return {
            error: "Orders can only be cancelled before they are picked up.",
            status: 400,
          }
        }
      } else {
        const adminAllowed = [
          "PENDING",
          "APPROVED",
          "PICKED_UP",
          "IN_WAREHOUSE",
          "IN_TRANSIT",
        ] as const
        if (!(adminAllowed as readonly string[]).includes(o.status)) {
          return {
            error: "Orders cannot be cancelled once they are out for delivery.",
            status: 400,
          }
        }
      }
      return null
    },
    buildUpdate: ({ session, body }) => ({
      status: "CANCELLED",
      cancelledAt: new Date().toISOString(),
      cancelledBy: session.name,
      cancelReason: body?.reason?.trim() ?? null,
    }),
  }),
} as const

export type TransitionName = keyof typeof ORDER_TRANSITIONS

const TRANSITION_LABELS: Record<TransitionName, string> = {
  approve: "Approved",
  dispatch: "Dispatched",
  "picked-up": "Marked picked up",
  "out-for-delivery": "Marked out for delivery",
  delivered: "Marked delivered",
  failed: "Marked failed delivery attempt",
  return: "Returned",
  reattempt: "Scheduled reattempt for",
  receive: "Received",
  "settle-cod": "Settled COD for",
  cancel: "Cancelled",
}

export async function applyOrderTransition(
  name: TransitionName,
  orderId: string,
  req: Request,
): Promise<NextResponse> {
  const def = ORDER_TRANSITIONS[name] as TransitionDef<z.ZodType | undefined>

  const me = await requireSession()
  if (!me) return unauthorized()
  if (!def.authorize(me)) {
    return forbidden()
  }

  let body: unknown = undefined
  if (def.schema) {
    const parsed = await parseBody(req, def.schema)
    if (parsed.error) return parsed.error
    body = parsed.data
  }

  const committed: { order: OrderRow | null } = { order: null }
  const response = await db.transaction(async (tx: any) => {
    const [orderRow] = await tx
      .select()
      .from(order)
      .where(eq(order.id, orderId))
      .for("update")
      .limit(1)
    if (!orderRow) {
      return notFound("Order not found")
    }

    const ctx = {
      order: orderRow,
      session: me,
      body,
    } as TransitionContext<never>

    const guardError = await def.guard(ctx)
    if (guardError) {
      return NextResponse.json(
        { error: guardError.error },
        { status: guardError.status },
      )
    }

    const updateValues = await def.buildUpdate(ctx)
    const [updated] = await tx
      .update(order)
      .set(updateValues)
      .where(eq(order.id, orderId))
      .returning()

    committed.order = updated
    return NextResponse.json(updated)
  })

  if (committed.order) {
    await logAudit({
      actor: { userId: me.userId, name: me.name, role: me.role },
      action: `ORDER_${name.toUpperCase().replace(/-/g, "_")}`,
      entityType: "order",
      entityId: committed.order.id,
      description: `${TRANSITION_LABELS[name]} order ${committed.order.code}`,
    })
  }

  return response
}
