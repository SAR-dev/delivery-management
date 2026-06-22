"use client"

import { useCallback } from "react"
import useSWR from "swr"
import type { SecurityMoneyConfig } from "@/lib/types"
import { useAuth } from "@/features/account/hooks/use-auth"
import { jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"

const KEY = "/api/security-config"

// Security / money configuration (COD fee model) resource. A single row, so
// the cache holds one object rather than a list.
export function useSecurityConfig() {
  const { currentUser } = useAuth()
  const { data, error, isLoading, mutate } = useSWR<SecurityMoneyConfig>(
    currentUser ? KEY : null,
    jsonFetcher,
    swrOptions,
  )

  const securityConfig = data ?? null

  const updateSecurityConfig = useCallback(
    async (
      next: Pick<
        SecurityMoneyConfig,
        "lowValueThreshold" | "lowValueFlatFee" | "highValuePercentage"
      >,
    ) => {
      const res = await fetch(KEY, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      })
      if (!res.ok) return
      const updated = await res.json()
      await mutate(updated, { revalidate: false })
    },
    [mutate],
  )

  return {
    securityConfig,
    isLoading,
    error,
    mutate,
    updateSecurityConfig,
  }
}
