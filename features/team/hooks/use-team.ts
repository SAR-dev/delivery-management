"use client"

import { useCallback } from "react"
import useSWR, { useSWRConfig } from "swr"
import type { Role, User, Warehouse } from "@/lib/types"
import { useAuth } from "@/features/account/hooks/use-auth"
import { jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"

const KEY = "/api/team"
const WAREHOUSES_KEY = "/api/warehouses"

interface NewAccountInput {
  name: string
  email: string
  phone: string
  role: Extract<Role, "ADMIN" | "WAREHOUSE_ADMIN">
  warehouseId?: string | null
  canManagePricing?: boolean
}

// Team (staff accounts) resource. Creating/reassigning a Warehouse Admin also
// updates the warehouses cache's managedBy field, so both views stay
// consistent without a global reload — mirrors the old context exactly.
export function useTeam() {
  const { currentUser } = useAuth()
  const { mutate: globalMutate } = useSWRConfig()
  const { data, error, isLoading, mutate } = useSWR<User[]>(
    currentUser ? KEY : null,
    jsonFetcher,
    swrOptions,
  )

  const team = data ?? []

  const createAccount = useCallback(
    async (input: NewAccountInput & { password: string }) => {
      const res = await fetch(KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) return
      const newUser = await res.json()
      await mutate((prev) => [newUser, ...(prev ?? [])], { revalidate: false })
      // Keep the cached warehouse list in sync with the new manager assignment.
      if (newUser.role === "WAREHOUSE_ADMIN" && newUser.warehouseId) {
        await globalMutate<Warehouse[]>(
          WAREHOUSES_KEY,
          (prev) =>
            (prev ?? []).map((w) =>
              w.id === newUser.warehouseId
                ? { ...w, managedBy: newUser.id }
                : w,
            ),
          { revalidate: false },
        )
      }
    },
    [mutate, globalMutate],
  )

  const toggleAccountActive = useCallback(
    async (id: string) => {
      const res = await fetch(`${KEY}/${id}/active`, { method: "PATCH" })
      if (!res.ok) return
      const updatedProfile = await res.json()
      await mutate(
        (prev) =>
          (prev ?? []).map((u) =>
            u.id === id ? { ...u, isActive: updatedProfile.isActive } : u,
          ),
        { revalidate: false },
      )
    },
    [mutate],
  )

  const togglePricingPermission = useCallback(
    async (id: string) => {
      const res = await fetch(`${KEY}/${id}/pricing`, { method: "PATCH" })
      if (!res.ok) return
      const updatedProfile = await res.json()
      await mutate(
        (prev) =>
          (prev ?? []).map((u) =>
            u.id === id
              ? { ...u, canManagePricing: updatedProfile.canManagePricing }
              : u,
          ),
        { revalidate: false },
      )
    },
    [mutate],
  )

  const updateAccountWarehouse = useCallback(
    async (id: string, warehouseId: string | null) => {
      const res = await fetch(`${KEY}/${id}/warehouse`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouseId }),
      })
      if (!res.ok) return
      const updatedProfile = await res.json()
      await mutate(
        (prev) =>
          (prev ?? []).map((u) =>
            u.id === id ? { ...u, warehouseId: updatedProfile.warehouseId } : u,
          ),
        { revalidate: false },
      )
      // Reflect the managedBy change on the cached warehouse list.
      await globalMutate<Warehouse[]>(
        WAREHOUSES_KEY,
        (prev) =>
          (prev ?? []).map((w) => {
            if (w.managedBy === id) return { ...w, managedBy: null }
            if (warehouseId && w.id === warehouseId)
              return { ...w, managedBy: id }
            return w
          }),
        { revalidate: false },
      )
    },
    [mutate, globalMutate],
  )

  return {
    team,
    isLoading,
    error,
    mutate,
    createAccount,
    toggleAccountActive,
    togglePricingPermission,
    updateAccountWarehouse,
  }
}
