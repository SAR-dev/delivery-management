"use client"

import { useCallback } from "react"
import useSWR from "swr"
import type { Rider, RiderTaskType } from "@/lib/types"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"

const KEY = "/api/riders"

interface RiderCreateInput {
  name: string
  email: string
  phone: string
  zone: string
  warehouseId: string
  taskType?: RiderTaskType
}

interface RiderUpdateInput {
  name?: string
  phone?: string
  zone?: string
  warehouseId?: string
  taskType?: RiderTaskType
  isActive?: boolean
}

// Riders that can run deliveries (DELIVERY or BOTH).
const canDeliver = (r: Rider) =>
  r.taskType === "DELIVERY" || r.taskType === "BOTH"

// Riders resource. Exposes the full roster, the current rider's own profile,
// and the delivery riders based at the current Warehouse Admin's hub (derived
// from the warehouses cache, shared via SWR — no extra fetch).
export function useRiders() {
  const { currentUser } = useAuth()
  const { currentWarehouse } = useWarehouses()
  const { data, error, isLoading, mutate } = useSWR<Rider[]>(
    currentUser ? KEY : null,
    jsonFetcher,
    swrOptions,
  )

  const riders = data ?? []

  // The rider profile for the logged-in rider user (if any).
  const currentRider =
    currentUser?.role === "RIDER" && currentUser.riderId
      ? (riders.find((r) => r.id === currentUser.riderId) ?? null)
      : null

  // Every rider based at the logged-in admin's warehouse (any status / task
  // type) — used by the warehouse rider-management screen.
  const warehouseRiders = currentWarehouse
    ? riders.filter((r) => r.warehouseId === currentWarehouse.id)
    : []

  // Active, delivery-capable riders at the admin's warehouse — the pool the
  // dispatch desk can assign parcels to.
  const warehouseDeliveryRiders = currentWarehouse
    ? riders.filter(
        (r) =>
          r.warehouseId === currentWarehouse.id && r.isActive && canDeliver(r),
      )
    : []

  const createRider = useCallback(
    async (input: RiderCreateInput) => {
      const res = await fetch(KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) return
      const newRider = await res.json()
      await mutate((prev) => [newRider, ...(prev ?? [])], { revalidate: false })
    },
    [mutate],
  )

  const updateRider = useCallback(
    async (id: string, input: RiderUpdateInput) => {
      const res = await fetch(`${KEY}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) return
      const updated = await res.json()
      await mutate(
        (prev) => (prev ?? []).map((r) => (r.id === id ? updated : r)),
        { revalidate: false },
      )
    },
    [mutate],
  )

  const toggleRiderActive = useCallback(
    async (id: string) => {
      const res = await fetch(`${KEY}/${id}/active`, { method: "PATCH" })
      if (!res.ok) return
      const updated = await res.json()
      await mutate(
        (prev) =>
          (prev ?? []).map((r) =>
            r.id === id ? { ...r, isActive: updated.isActive } : r,
          ),
        { revalidate: false },
      )
    },
    [mutate],
  )

  return {
    riders,
    currentRider,
    warehouseRiders,
    warehouseDeliveryRiders,
    isLoading,
    error,
    mutate,
    createRider,
    updateRider,
    toggleRiderActive,
  }
}
