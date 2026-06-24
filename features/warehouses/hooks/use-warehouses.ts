"use client"

import { useCallback, useEffect, useState } from "react"
import useSWR from "swr"
import type { Warehouse } from "@/lib/types"
import { useAuth } from "@/features/account/hooks/use-auth"
import { jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"

const KEY = "/api/warehouses"

const byName = (a: Warehouse, b: Warehouse) => a.name.localeCompare(b.name)

// Warehouses resource. Create/update/delete keep the cache sorted by name to
// match the old context, and expose the current Warehouse Admin's hub.
export function useWarehouses() {
  const { currentUser } = useAuth()
  const { data, error, isLoading, mutate } = useSWR<Warehouse[]>(
    currentUser ? KEY : null,
    jsonFetcher,
    swrOptions,
  )

  // Search state lives here per the no-global-context rule. The base KEY
  // subscription above is untouched — mutations keep writing to it — while
  // search results live in a separate, parallel SWR entry.
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const trimmedQuery = debouncedQuery.trim()
  const searchKey =
    currentUser && trimmedQuery
      ? `${KEY}?q=${encodeURIComponent(trimmedQuery)}`
      : null
  const { data: searchData, isLoading: isSearchLoading } = useSWR<Warehouse[]>(
    searchKey,
    jsonFetcher,
    swrOptions,
  )

  const warehouses = trimmedQuery ? (searchData ?? []) : (data ?? [])
  const allWarehouses = data ?? []

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
      await mutate((prev) => [...(prev ?? []), data].sort(byName), {
        revalidate: false,
      })
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
      await mutate(
        (prev) =>
          (prev ?? []).map((w) => (w.id === id ? data : w)).sort(byName),
        { revalidate: false },
      )
      return { ok: true }
    },
    [mutate],
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
      await mutate((prev) => (prev ?? []).filter((w) => w.id !== id), {
        revalidate: false,
      })
      return { ok: true }
    },
    [mutate],
  )

  return {
    warehouses,
    allWarehouses,
    query,
    setQuery,
    currentWarehouse,
    isLoading: trimmedQuery ? isSearchLoading : isLoading,
    error,
    mutate,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
  }
}
