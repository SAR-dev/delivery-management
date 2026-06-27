"use client"

import { useCallback, useState } from "react"
import useSWR from "swr"
import type { CreateOrderInput, Order } from "@/lib/types"
import type { PaginatedResponse } from "@/lib/pagination"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { ApiError, jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { DEFAULT_TABLE_ROWS_PER_PAGE } from "@/lib/constants"

const KEY = "/api/orders"

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
  cancel: "CANCELLED",
}

type Result = { ok: boolean; error?: string }

function buildUrl(
  base: string,
  params: {
    limit?: number
    offset?: number
    q?: string
    statuses?: string[]
  },
) {
  const sp = new URLSearchParams()
  if (params.limit != null) sp.set("limit", String(params.limit))
  if (params.offset != null) sp.set("offset", String(params.offset))
  if (params.q) sp.set("q", params.q)
  if (params.statuses?.length) sp.set("status", params.statuses.join(","))
  const qs = sp.toString()
  return qs ? `${base}?${qs}` : base
}

// Orders resource: the order list, merchant order creation, every rider/
// warehouse status transition (applied optimistically with rollback), and the
// warehouse/merchant-scoped views derived from the shared warehouses/merchants
// caches.
export function useOrders() {
  const { currentUser } = useAuth()
  const { currentWarehouse } = useWarehouses()
  const { currentMerchant } = useMerchants()

  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_TABLE_ROWS_PER_PAGE)
  const [statuses, setStatuses] = useState<string[] | undefined>(undefined)
  const debouncedQuery = useDebouncedValue(query)

  const trimmedQuery = debouncedQuery.trim()
  const offset = (page - 1) * limit
  const url = buildUrl(KEY, {
    limit,
    offset,
    q: trimmedQuery || undefined,
    statuses,
  })

  const {
    data: response,
    error,
    isLoading,
    mutate,
  } = useSWR<PaginatedResponse<Order>>(
    currentUser ? url : null,
    jsonFetcher,
    swrOptions,
  )

  const orders = response?.data ?? []
  const total = response?.total ?? 0

  const { data: allResponse } = useSWR<PaginatedResponse<Order>>(
    currentUser ? KEY : null,
    jsonFetcher,
    swrOptions,
  )
  const allOrders = allResponse?.data ?? []

  const warehouseFailedOrders = currentWarehouse
    ? allOrders.filter(
        (o) =>
          o.status === "FAILED_ATTEMPT" &&
          o.warehouseId === currentWarehouse.id,
      )
    : []

  const warehouseUnsettledOrders = currentWarehouse
    ? allOrders.filter(
        (o) =>
          o.status === "DELIVERED" &&
          o.warehouseId === currentWarehouse.id &&
          !o.codSettledAt,
      )
    : []

  const merchantPayableOrders = currentMerchant
    ? allOrders.filter(
        (o) =>
          o.merchantId === currentMerchant.id &&
          o.status === "DELIVERED" &&
          Boolean(o.codSettledAt) &&
          !o.payoutRequestId,
      )
    : []

  const patchOrder = useCallback(
    async (
      orderId: string,
      path: string,
      body?: Record<string, unknown>,
    ): Promise<Result> => {
      const optimisticStatus = OPTIMISTIC_STATUS[path]

      const applyOptimistic = (resp: PaginatedResponse<Order> | undefined) => {
        const list = resp?.data ?? []
        return {
          ...resp,
          data: list.map((o) => {
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
          }),
        } as PaginatedResponse<Order>
      }

      try {
        await mutate(
          async (current?: PaginatedResponse<Order>) => {
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
            return {
              ...current,
              data: (current?.data ?? []).map((o) =>
                o.id === orderId ? resData : o,
              ),
            } as PaginatedResponse<Order>
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
      await mutate()
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
      await mutate()
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
  const cancelOrder = useCallback(
    (orderId: string, reason?: string) =>
      patchOrder(orderId, "cancel", reason ? { reason } : undefined),
    [patchOrder],
  )

  // Public mutation — used from the tracking page without a session. Updates
  // receiverNote optimistically and reconciles with the server row.
  const updateReceiverNote = useCallback(
    async (orderId: string, receiverNote: string): Promise<Result> => {
      try {
        await mutate(
          async (current?: PaginatedResponse<Order>) => {
            const res = await fetch(`/api/orders/${orderId}/receiver-note`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ receiverNote }),
            })
            const resData = await res.json().catch(() => null)
            if (!res.ok) {
              throw new ApiError(resData?.error ?? "Failed to save note.")
            }
            return {
              ...current,
              data: (current?.data ?? []).map((o) =>
                o.id === orderId ? resData : o,
              ),
            } as PaginatedResponse<Order>
          },
          {
            optimisticData: (resp: PaginatedResponse<Order> | undefined) =>
              ({
                ...resp,
                data: (resp?.data ?? []).map((o) =>
                  o.id === orderId ? { ...o, receiverNote } : o,
                ),
              }) as PaginatedResponse<Order>,
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

  return {
    orders,
    allOrders,
    total,
    page,
    setPage,
    limit,
    setLimit,
    query,
    setQuery,
    statuses,
    setStatuses,
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
    cancelOrder,
    updateReceiverNote,
  }
}
