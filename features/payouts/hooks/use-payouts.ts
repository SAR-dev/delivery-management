"use client"

import { useCallback, useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import type { PayoutRequest } from "@/lib/types"
import type { PaginatedResponse } from "@/lib/pagination"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { DEFAULT_TABLE_ROWS_PER_PAGE } from "@/lib/constants"

const KEY = "/api/payouts"

type Result = { ok: boolean; error?: string }

function buildUrl(
  base: string,
  params: {
    limit?: number
    offset?: number
    q?: string
    statuses?: string[]
  },
) {
  const sp = new URLSearchParams()
  if (params.limit != null) sp.set("limit", String(params.limit))
  if (params.offset != null) sp.set("offset", String(params.offset))
  if (params.q) sp.set("q", params.q)
  if (params.statuses?.length) sp.set("status", params.statuses.join(","))
  const qs = sp.toString()
  return qs ? `${base}?${qs}` : base
}

// Payout requests resource. Spans two caches: a merchant requesting a payout
// (or an admin rejecting one) also locks/unlocks the affected orders, so those
// mutations revalidate the orders cache too via the shared SWR config.
export function usePayouts() {
  const { currentUser } = useAuth()
  const { currentMerchant } = useMerchants()
  const { mutate: _globalMutate } = useSWRConfig()

  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_TABLE_ROWS_PER_PAGE)
  const [statuses, setStatuses] = useState<string[] | undefined>(undefined)
  const debouncedQuery = useDebouncedValue(query)

  const trimmedQuery = debouncedQuery.trim()
  const offset = (page - 1) * limit
  const url = buildUrl(KEY, {
    limit,
    offset,
    q: trimmedQuery || undefined,
    statuses,
  })

  const {
    data: response,
    error,
    isLoading,
    mutate,
  } = useSWR<PaginatedResponse<PayoutRequest>>(
    currentUser ? url : null,
    jsonFetcher,
    swrOptions,
  )

  const payoutRequests = response?.data ?? []
  const total = response?.total ?? 0

  // allPayoutRequests: fetch full list (no pagination) for cross-resource lookups
  const { data: allResponse } = useSWR<PaginatedResponse<PayoutRequest>>(
    currentUser ? KEY : null,
    jsonFetcher,
    swrOptions,
  )
  const allPayoutRequests = allResponse?.data ?? []

  // Derived from the unfiltered list — a merchant's own requests shouldn't
  // disappear just because an admin's search elsewhere narrowed the page.
  const merchantPayoutRequests = currentMerchant
    ? allPayoutRequests.filter((p) => p.merchantId === currentMerchant.id)
    : []

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
      await mutate()
      return { ok: true, request: resData }
    },
    [mutate],
  )

  const approvePayout = useCallback(
    async (requestId: string): Promise<Result> => {
      const res = await fetch(`${KEY}/${requestId}/approve`, {
        method: "PATCH",
      })
      const resData = await res.json()
      if (!res.ok) return { ok: false, error: resData.error }
      await mutate()
      return { ok: true }
    },
    [mutate],
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
      await mutate()
      return { ok: true }
    },
    [mutate],
  )

  const markPayoutPaid = useCallback(
    async (requestId: string): Promise<Result> => {
      const res = await fetch(`${KEY}/${requestId}/paid`, { method: "PATCH" })
      const resData = await res.json()
      if (!res.ok) return { ok: false, error: resData.error }
      await mutate()
      return { ok: true }
    },
    [mutate],
  )

  return {
    payoutRequests,
    allPayoutRequests,
    total,
    page,
    setPage,
    limit,
    setLimit,
    query,
    setQuery,
    statuses,
    setStatuses,
    merchantPayoutRequests,
    isLoading,
    error,
    mutate,
    requestPayout,
    approvePayout,
    rejectPayout,
    markPayoutPaid,
  }
}
