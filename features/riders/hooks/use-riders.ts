"use client"

import { useCallback, useState } from "react"
import useSWR from "swr"
import type { Rider, RiderTaskType } from "@/lib/types"
import type { PaginatedResponse } from "@/lib/pagination"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { DEFAULT_TABLE_ROWS_PER_PAGE } from "@/lib/constants"

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

const canDeliver = (r: Rider) =>
  r.taskType === "DELIVERY" || r.taskType === "BOTH"

function buildUrl(
  base: string,
  params: { limit?: number; offset?: number; q?: string },
) {
  const sp = new URLSearchParams()
  if (params.limit != null) sp.set("limit", String(params.limit))
  if (params.offset != null) sp.set("offset", String(params.offset))
  if (params.q) sp.set("q", params.q)
  const qs = sp.toString()
  return qs ? `${base}?${qs}` : base
}

export function useRiders() {
  const { currentUser } = useAuth()
  const { currentWarehouse } = useWarehouses()

  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_TABLE_ROWS_PER_PAGE)
  const debouncedQuery = useDebouncedValue(query)

  const trimmedQuery = debouncedQuery.trim()
  const offset = (page - 1) * limit
  const url = buildUrl(KEY, {
    limit,
    offset,
    q: trimmedQuery || undefined,
  })

  const {
    data: response,
    error,
    isLoading,
    mutate,
  } = useSWR<PaginatedResponse<Rider>>(
    currentUser ? url : null,
    jsonFetcher,
    swrOptions,
  )

  const riders = response?.data ?? []
  const total = response?.total ?? 0

  const { data: allResponse } = useSWR<PaginatedResponse<Rider>>(
    currentUser ? KEY : null,
    jsonFetcher,
    swrOptions,
  )
  const allRiders = allResponse?.data ?? []

  const currentRider =
    currentUser?.role === "RIDER" && currentUser.riderId
      ? (allRiders.find((r) => r.id === currentUser.riderId) ?? null)
      : null

  const warehouseRiders = currentWarehouse
    ? allRiders.filter((r) => r.warehouseId === currentWarehouse.id)
    : []

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
      await mutate()
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
      await mutate()
    },
    [mutate],
  )

  const toggleRiderActive = useCallback(
    async (id: string) => {
      const res = await fetch(`${KEY}/${id}/active`, { method: "PATCH" })
      if (!res.ok) return
      await mutate()
    },
    [mutate],
  )

  return {
    riders,
    allRiders,
    total,
    page,
    setPage,
    limit,
    setLimit,
    query,
    setQuery,
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
