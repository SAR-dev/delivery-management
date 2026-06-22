"use client"

import { useCallback } from "react"
import useSWR from "swr"
import type { Merchant, MerchantPricingInput } from "@/lib/types"
import { useAuth } from "@/features/account/hooks/use-auth"
import { jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"

const KEY = "/api/merchants"

// Merchants resource: the merchant directory plus the admin/merchant mutations
// that act on it. Reads are SWR-cached; each mutation writes the authoritative
// server row straight back into the cache (no global reload).
export function useMerchants() {
  const { currentUser } = useAuth()
  const { data, error, isLoading, mutate } = useSWR<Merchant[]>(
    currentUser ? KEY : null,
    jsonFetcher,
    swrOptions,
  )

  const merchants = data ?? []

  // The merchant business owned by the logged-in merchant user (if any).
  const currentMerchant =
    currentUser?.role === "MERCHANT" && currentUser.merchantId
      ? (merchants.find((m) => m.id === currentUser.merchantId) ?? null)
      : null

  const replaceOne = useCallback(
    (id: string, updated: Merchant) =>
      mutate((prev) => (prev ?? []).map((m) => (m.id === id ? updated : m)), {
        revalidate: false,
      }),
    [mutate],
  )

  const approveMerchant = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/merchants/${id}/approve`, {
        method: "PATCH",
      })
      if (!res.ok) return
      await replaceOne(id, await res.json())
    },
    [replaceOne],
  )

  const suspendMerchant = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/merchants/${id}/suspend`, {
        method: "PATCH",
      })
      if (!res.ok) return
      await replaceOne(id, await res.json())
    },
    [replaceOne],
  )

  const reactivateMerchant = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/merchants/${id}/reactivate`, {
        method: "PATCH",
      })
      if (!res.ok) return
      await replaceOne(id, await res.json())
    },
    [replaceOne],
  )

  const setMerchantPricing = useCallback(
    async (id: string, pricing: MerchantPricingInput) => {
      const res = await fetch(`/api/merchants/${id}/pricing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricing),
      })
      if (!res.ok) return
      await replaceOne(id, await res.json())
    },
    [replaceOne],
  )

  const updateMerchantProfile = useCallback(
    async (
      id: string,
      input: {
        businessName: string
        email: string
        phone: string
        address: string
        divisionId: string
      },
    ): Promise<{ ok: boolean; error?: string }> => {
      const res = await fetch(`/api/merchants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error ?? "Could not update your business details.",
        }
      }
      await replaceOne(id, data)
      return { ok: true }
    },
    [replaceOne],
  )

  return {
    merchants,
    currentMerchant,
    isLoading,
    error,
    mutate,
    approveMerchant,
    suspendMerchant,
    reactivateMerchant,
    setMerchantPricing,
    updateMerchantProfile,
  }
}
