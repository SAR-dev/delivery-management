"use client"

import { useCallback, useState } from "react"
import useSWR from "swr"
import type { Rider, RiderTaskType } from "@/lib/types"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"

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

  // Search state lives here per the no-global-context rule. The base KEY
  // subscription above is untouched — mutations keep writing to it — while
  // search results live in a separate, parallel SWR entry.
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query)

  const trimmedQuery = debouncedQuery.trim()
  const searchKey =
    currentUser && trimmedQuery
      ? `${KEY}?q=${encodeURIComponent(trimmedQuery)}`
      : null
  const { data: searchData, isLoading: isSearchLoading } = useSWR<Rider[]>(
    searchKey,
    jsonFetcher,
    swrOptions,
  )

  const riders = trimmedQuery ? (searchData ?? []) : (data ?? [])
  const allRiders = data ?? []

  // The rider profile for the logged-in rider user (if any) — always derived
  // from the unfiltered list so it's never lost mid-search.
  const currentRider =
    currentUser?.role === "RIDER" && currentUser.riderId
      ? (allRiders.find((r) => r.id === currentUser.riderId) ?? null)
      : null

  // Every rider based at the logged-in admin's warehouse (any status / task
  // type) — used by the warehouse rider-management screen. Derived from the
  // unfiltered list; search narrows the page's own `riders`, not this.
  const warehouseRiders = currentWarehouse
    ? allRiders.filter((r) => r.warehouseId === currentWarehouse.id)
    : []

  // Active, delivery-capable riders at the admin's warehouse — the pool the
  // dispatch desk can assign parcels to.
  const warehouseDeliveryRiders = currentWarehouse
    ? allRiders.filter(
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
    allRiders,
    query,
    setQuery,
    currentRider,
    warehouseRiders,
    warehouseDeliveryRiders,
    isLoading: trimmedQuery ? isSearchLoading : isLoading,
    error,
    mutate,
    createRider,
    updateRider,
    toggleRiderActive,
  }
}
