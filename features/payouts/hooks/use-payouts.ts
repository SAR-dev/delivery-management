"use client"

import { useCallback, useEffect, useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import type { Order, PayoutRequest } from "@/lib/types"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"

const KEY = "/api/payouts"
const ORDERS_KEY = "/api/orders"

type Result = { ok: boolean; error?: string }

// Payout requests resource. Spans two caches: a merchant requesting a payout
// (or an admin rejecting one) also locks/unlocks the affected orders, so those
// mutations revalidate the orders cache too via the shared SWR config.
export function usePayouts() {
  const { currentUser } = useAuth()
  const { currentMerchant } = useMerchants()
  const { mutate: globalMutate } = useSWRConfig()
  const { data, error, isLoading, mutate } = useSWR<PayoutRequest[]>(
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
  const { data: searchData, isLoading: isSearchLoading } = useSWR<
    PayoutRequest[]
  >(searchKey, jsonFetcher, swrOptions)

  const payoutRequests = trimmedQuery ? (searchData ?? []) : (data ?? [])
  const allPayoutRequests = data ?? []

  // Derived from the unfiltered list — a merchant's own requests shouldn't
  // disappear just because an admin's search elsewhere narrowed the page.
  const merchantPayoutRequests = currentMerchant
    ? allPayoutRequests.filter((p) => p.merchantId === currentMerchant.id)
    : []

  const replaceOne = useCallback(
    (id: string, updated: PayoutRequest) =>
      mutate((prev) => (prev ?? []).map((p) => (p.id === id ? updated : p)), {
        revalidate: false,
      }),
    [mutate],
  )

  const requestPayout = useCallback(
    async (input: {
      payoutMethod: string
      payoutDetails: string
    }): Promise<{ ok: boolean; request?: PayoutRequest; error?: string }> => {
      const res = await fetch(KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const resData = await res.json()
      if (!res.ok) return { ok: false, error: resData.error }
      await mutate((prev) => [resData, ...(prev ?? [])], { revalidate: false })
      // Lock the orders attached to this request in the orders cache.
      const lockedIds = new Set<string>(resData.orderIds)
      await globalMutate<Order[]>(
        ORDERS_KEY,
        (prev) =>
          (prev ?? []).map((o) =>
            lockedIds.has(o.id) ? { ...o, payoutRequestId: resData.id } : o,
          ),
        { revalidate: false },
      )
      return { ok: true, request: resData }
    },
    [mutate, globalMutate],
  )

  const approvePayout = useCallback(
    async (requestId: string): Promise<Result> => {
      const res = await fetch(`${KEY}/${requestId}/approve`, {
        method: "PATCH",
      })
      const resData = await res.json()
      if (!res.ok) return { ok: false, error: resData.error }
      await replaceOne(requestId, resData)
      return { ok: true }
    },
    [replaceOne],
  )

  const rejectPayout = useCallback(
    async (requestId: string, reason: string): Promise<Result> => {
      const res = await fetch(`${KEY}/${requestId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      const resData = await res.json()
      if (!res.ok) return { ok: false, error: resData.error }
      await replaceOne(requestId, resData)
      // Unlock the request's orders so they can be requested again.
      const unlockedIds = new Set<string>(resData.orderIds)
      await globalMutate<Order[]>(
        ORDERS_KEY,
        (prev) =>
          (prev ?? []).map((o) =>
            unlockedIds.has(o.id) ? { ...o, payoutRequestId: null } : o,
          ),
        { revalidate: false },
      )
      return { ok: true }
    },
    [replaceOne, globalMutate],
  )

  const markPayoutPaid = useCallback(
    async (requestId: string): Promise<Result> => {
      const res = await fetch(`${KEY}/${requestId}/paid`, { method: "PATCH" })
      const resData = await res.json()
      if (!res.ok) return { ok: false, error: resData.error }
      await replaceOne(requestId, resData)
      return { ok: true }
    },
    [replaceOne],
  )

  return {
    payoutRequests,
    allPayoutRequests,
    query,
    setQuery,
    merchantPayoutRequests,
    isLoading: trimmedQuery ? isSearchLoading : isLoading,
    error,
    mutate,
    requestPayout,
    approvePayout,
    rejectPayout,
    markPayoutPaid,
  }
}
