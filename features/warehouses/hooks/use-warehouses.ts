"use client"

import { useCallback } from "react"
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

  const warehouses = data ?? []

  // The warehouse managed by the logged-in Warehouse Admin (if any).
  const currentWarehouse =
    currentUser?.role === "WAREHOUSE_ADMIN" && currentUser.warehouseId
      ? (warehouses.find((w) => w.id === currentUser.warehouseId) ?? null)
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
    currentWarehouse,
    isLoading,
    error,
    mutate,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
  }
}
