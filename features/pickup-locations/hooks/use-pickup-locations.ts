"use client"

import { useCallback } from "react"
import useSWR from "swr"
import type { PickupLocation } from "@/lib/types"
import type { PaginatedResponse } from "@/lib/pagination"
import { useAuth } from "@/features/account/hooks/use-auth"
import { jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"

const KEY = "/api/pickup-locations"

interface PickupLocationInput {
  label: string
  address: string
  divisionId: string
  mapLink?: string
  imageLinks?: string[]
}

type Result = { ok: boolean; error?: string }

export function usePickupLocations() {
  const { currentUser } = useAuth()
  const {
    data: response,
    error,
    isLoading,
    mutate,
  } = useSWR<PaginatedResponse<PickupLocation>>(
    currentUser ? KEY : null,
    jsonFetcher,
    swrOptions,
  )

  const pickupLocations = response?.data ?? []

  const createPickupLocation = useCallback(
    async (input: PickupLocationInput): Promise<Result> => {
      const res = await fetch(KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return { ok: false, error: data?.error ?? "Could not add the shop." }
      }
      await mutate()
      return { ok: true }
    },
    [mutate],
  )

  const updatePickupLocation = useCallback(
    async (id: string, input: PickupLocationInput): Promise<Result> => {
      const res = await fetch(`${KEY}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return { ok: false, error: data?.error ?? "Could not update the shop." }
      }
      await mutate()
      return { ok: true }
    },
    [mutate],
  )

  const deletePickupLocation = useCallback(
    async (id: string): Promise<Result> => {
      const res = await fetch(`${KEY}/${id}`, { method: "DELETE" })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return { ok: false, error: data?.error ?? "Could not remove the shop." }
      }
      await mutate()
      return { ok: true }
    },
    [mutate],
  )

  return {
    pickupLocations,
    isLoading,
    error,
    mutate,
    createPickupLocation,
    updatePickupLocation,
    deletePickupLocation,
  }
}
