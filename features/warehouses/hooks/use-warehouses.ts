"use client"

import { useCallback, useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import type { Warehouse } from "@/lib/types"
import type { PaginatedResponse } from "@/lib/pagination"
import { useAuth } from "@/features/account/hooks/use-auth"
import { jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { DEFAULT_TABLE_ROWS_PER_PAGE } from "@/lib/constants"

const KEY = "/api/warehouses"

const _byName = (a: Warehouse, b: Warehouse) => a.name.localeCompare(b.name)

function buildUrl(
  base: string,
  params: {
    limit?: number
    offset?: number
    q?: string
    sortId?: string
    sortDir?: string
  },
) {
  const sp = new URLSearchParams()
  if (params.limit != null) sp.set("limit", String(params.limit))
  if (params.offset != null) sp.set("offset", String(params.offset))
  if (params.q) sp.set("q", params.q)
  if (params.sortId) sp.set("sort", params.sortId)
  if (params.sortDir) sp.set("sortDir", params.sortDir)
  const qs = sp.toString()
  return qs ? `${base}?${qs}` : base
}

// Warehouses resource. Create/update/delete keep the cache sorted by name to
// match the old context, and expose the current Warehouse Admin's hub.
export function useWarehouses() {
  const { currentUser } = useAuth()
  const { mutate: _globalMutate } = useSWRConfig()

  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_TABLE_ROWS_PER_PAGE)
  const [sortId, setSortId] = useState<string>("")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const debouncedQuery = useDebouncedValue(query)

  const trimmedQuery = debouncedQuery.trim()
  const offset = (page - 1) * limit
  const url = buildUrl(KEY, {
    limit,
    offset,
    q: trimmedQuery || undefined,
    sortId: sortId || undefined,
    sortDir: sortId ? sortDir : undefined,
  })

  const {
    data: response,
    error,
    isLoading,
    mutate,
  } = useSWR<PaginatedResponse<Warehouse>>(
    currentUser ? url : null,
    jsonFetcher,
    swrOptions,
  )

  const warehouses = response?.data ?? []
  const total = response?.total ?? 0

  // allWarehouses: fetch full list (no pagination) for cross-resource lookups
  const { data: allResponse } = useSWR<PaginatedResponse<Warehouse>>(
    currentUser ? KEY : null,
    jsonFetcher,
    swrOptions,
  )
  const allWarehouses = allResponse?.data ?? []

  // The warehouse managed by the logged-in Warehouse Admin (if any) — always
  // derived from the unfiltered list, since many other hooks depend on this
  // staying stable regardless of any search happening on the warehouses page.
  const currentWarehouse =
    currentUser?.role === "WAREHOUSE_ADMIN" && currentUser.warehouseId
      ? (allWarehouses.find((w) => w.id === currentUser.warehouseId) ?? null)
      : null

  const createWarehouse = useCallback(
    async (input: {
      name: string
      address: string
      city: string
      divisionId: string
    }): Promise<{ ok: boolean; error?: string }> => {
      const res = await fetch(KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error ?? "Could not create the warehouse.",
        }
      }
      await mutate()
      return { ok: true }
    },
    [mutate],
  )

  const updateWarehouse = useCallback(
    async (
      id: string,
      input: {
        name?: string
        address?: string
        city?: string
        divisionId?: string
        isActive?: boolean
      },
    ): Promise<{ ok: boolean; error?: string }> => {
      const res = await fetch(`${KEY}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error ?? "Could not update the warehouse.",
        }
      }
      await mutate()
      _globalMutate((key: string) => key === KEY)
      return { ok: true }
    },
    [mutate, _globalMutate],
  )

  const deleteWarehouse = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const res = await fetch(`${KEY}/${id}`, { method: "DELETE" })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error ?? "Could not delete the warehouse.",
        }
      }
      await mutate()
      return { ok: true }
    },
    [mutate],
  )

  const onSortChange = useCallback(
    (newSortId: string, newSortDir: "asc" | "desc") => {
      setSortId(newSortId)
      setSortDir(newSortDir)
      setPage(1)
    },
    [],
  )

  return {
    warehouses,
    allWarehouses,
    total,
    page,
    setPage,
    limit,
    setLimit,
    query,
    setQuery,
    sortId,
    sortDir,
    onSortChange,
    currentWarehouse,
    isLoading,
    error,
    mutate,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
  }
}
