"use client"

import { useCallback } from "react"
import useSWR from "swr"
import type { CreateOrderInput, Order } from "@/lib/types"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { ApiError, jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"

const KEY = "/api/orders"

// Maps each order-lifecycle PATCH path to the status the order is expected to
// land in, so the UI can update optimistically before the server responds.
// Paths that don't change status (e.g. "settle-cod") are handled separately.
const OPTIMISTIC_STATUS: Record<string, Order["status"]> = {
  approve: "APPROVED",
  "picked-up": "PICKED_UP",
  receive: "IN_WAREHOUSE",
  dispatch: "IN_TRANSIT",
  "out-for-delivery": "OUT_FOR_DELIVERY",
  delivered: "DELIVERED",
  failed: "FAILED_ATTEMPT",
  reattempt: "OUT_FOR_DELIVERY",
  return: "RETURNED",
}

type Result = { ok: boolean; error?: string }

// Orders resource: the order list, merchant order creation, every rider/
// warehouse status transition (applied optimistically with rollback), and the
// warehouse/merchant-scoped views derived from the shared warehouses/merchants
// caches.
export function useOrders() {
  const { currentUser } = useAuth()
  const { currentWarehouse } = useWarehouses()
  const { currentMerchant } = useMerchants()
  const { data, error, isLoading, mutate } = useSWR<Order[]>(
    currentUser ? KEY : null,
    jsonFetcher,
    swrOptions,
  )

  const orders = data ?? []

  // FAILED_ATTEMPT parcels at the admin's warehouse awaiting a decision.
  const warehouseFailedOrders = currentWarehouse
    ? orders.filter(
        (o) =>
          o.status === "FAILED_ATTEMPT" &&
          o.warehouseId === currentWarehouse.id,
      )
    : []

  // DELIVERED parcels at the admin's warehouse whose COD is not yet settled.
  const warehouseUnsettledOrders = currentWarehouse
    ? orders.filter(
        (o) =>
          o.status === "DELIVERED" &&
          o.warehouseId === currentWarehouse.id &&
          !o.codSettledAt,
      )
    : []

  // Delivered, COD-settled orders not locked to an active payout request.
  const merchantPayableOrders = currentMerchant
    ? orders.filter(
        (o) =>
          o.merchantId === currentMerchant.id &&
          o.status === "DELIVERED" &&
          Boolean(o.codSettledAt) &&
          !o.payoutRequestId,
      )
    : []

  // Shared helper for every order-lifecycle PATCH. We optimistically apply the
  // expected status immediately so the UI feels instant, then reconcile with
  // the authoritative server row on success — or roll back on failure (handled
  // by SWR's rollbackOnError). The server still validates every transition.
  const patchOrder = useCallback(
    async (
      orderId: string,
      path: string,
      body?: Record<string, unknown>,
    ): Promise<Result> => {
      const optimisticStatus = OPTIMISTIC_STATUS[path]

      const applyOptimistic = (list: Order[] = []) =>
        list.map((o) => {
          if (o.id !== orderId) return o
          return {
            ...o,
            ...(optimisticStatus ? { status: optimisticStatus } : {}),
            ...(path === "settle-cod"
              ? { codSettledAt: new Date().toISOString() }
              : {}),
            ...(path === "approve" && body?.riderId
              ? { pickupRiderId: body.riderId as string }
              : {}),
            ...(path === "dispatch" && body?.riderId
              ? { deliveryRiderId: body.riderId as string }
              : {}),
          }
        })

      try {
        await mutate(
          async (current?: Order[]) => {
            const res = await fetch(`/api/orders/${orderId}/${path}`, {
              method: "PATCH",
              ...(body
                ? {
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                  }
                : {}),
            })
            const resData = await res.json().catch(() => null)
            if (!res.ok) {
              throw new ApiError(resData?.error ?? "Action failed.")
            }
            return (current ?? []).map((o) => (o.id === orderId ? resData : o))
          },
          {
            optimisticData: applyOptimistic,
            rollbackOnError: true,
            populateCache: true,
            revalidate: false,
          },
        )
        return { ok: true }
      } catch (err) {
        if (err instanceof ApiError) return { ok: false, error: err.message }
        return { ok: false, error: "Network error. Please try again." }
      }
    },
    [mutate],
  )

  const createOrder = useCallback(
    async (
      input: CreateOrderInput,
    ): Promise<{ ok: boolean; order?: Order; error?: string }> => {
      const res = await fetch(KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const resData = await res.json()
      if (!res.ok) {
        return { ok: false, error: resData.error ?? "Failed to create order." }
      }
      await mutate((prev) => [resData, ...(prev ?? [])], { revalidate: false })
      return { ok: true, order: resData }
    },
    [mutate],
  )

  const createOrders = useCallback(
    async (
      inputs: CreateOrderInput[],
    ): Promise<{ ok: boolean; orders?: Order[]; error?: string }> => {
      const res = await fetch("/api/orders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: inputs }),
      })
      const resData = await res.json()
      if (!res.ok) {
        return { ok: false, error: resData.error ?? "Failed to create orders." }
      }
      await mutate((prev) => [...resData, ...(prev ?? [])], {
        revalidate: false,
      })
      return { ok: true, orders: resData }
    },
    [mutate],
  )

  // --- Bound transitions (same signatures the old context exposed) ---------
  const approveAndAssignOrder = useCallback(
    (orderId: string, riderId: string) =>
      patchOrder(orderId, "approve", { riderId }),
    [patchOrder],
  )
  const markOrderPickedUp = useCallback(
    (orderId: string, proofRefs: string[]) =>
      patchOrder(orderId, "picked-up", { proofRefs }),
    [patchOrder],
  )
  const receiveOrderAtWarehouse = useCallback(
    (orderId: string) => patchOrder(orderId, "receive"),
    [patchOrder],
  )
  const assignDeliveryRider = useCallback(
    (orderId: string, riderId: string) =>
      patchOrder(orderId, "dispatch", { riderId }),
    [patchOrder],
  )
  const markOutForDelivery = useCallback(
    (orderId: string) => patchOrder(orderId, "out-for-delivery"),
    [patchOrder],
  )
  const markDelivered = useCallback(
    (orderId: string, proofRef?: string) =>
      patchOrder(orderId, "delivered", proofRef ? { proofRef } : undefined),
    [patchOrder],
  )
  const markDeliveryFailed = useCallback(
    (orderId: string, note: string) => patchOrder(orderId, "failed", { note }),
    [patchOrder],
  )
  const reattemptFailedOrder = useCallback(
    (orderId: string) => patchOrder(orderId, "reattempt"),
    [patchOrder],
  )
  const returnFailedOrder = useCallback(
    (orderId: string, reason: string) =>
      patchOrder(orderId, "return", { reason }),
    [patchOrder],
  )
  const settleOrderCod = useCallback(
    (orderId: string) => patchOrder(orderId, "settle-cod"),
    [patchOrder],
  )

  return {
    orders,
    warehouseFailedOrders,
    warehouseUnsettledOrders,
    merchantPayableOrders,
    isLoading,
    error,
    mutate,
    createOrder,
    createOrders,
    approveAndAssignOrder,
    markOrderPickedUp,
    receiveOrderAtWarehouse,
    assignDeliveryRider,
    markOutForDelivery,
    markDelivered,
    markDeliveryFailed,
    reattemptFailedOrder,
    returnFailedOrder,
    settleOrderCod,
  }
}
