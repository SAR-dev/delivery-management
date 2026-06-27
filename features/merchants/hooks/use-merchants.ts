"use client"

import { useCallback, useState } from "react"
import useSWR from "swr"
import type { Merchant, MerchantPricingInput } from "@/lib/types"
import type { PaginatedResponse } from "@/lib/pagination"
import { useAuth } from "@/features/account/hooks/use-auth"
import { jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { DEFAULT_TABLE_ROWS_PER_PAGE } from "@/lib/constants"

const KEY = "/api/merchants"

function buildUrl(
  base: string,
  params: {
    limit?: number
    offset?: number
    q?: string
    statuses?: string[]
    sortId?: string
    sortDir?: string
  },
) {
  const sp = new URLSearchParams()
  if (params.limit != null) sp.set("limit", String(params.limit))
  if (params.offset != null) sp.set("offset", String(params.offset))
  if (params.q) sp.set("q", params.q)
  if (params.statuses?.length) sp.set("status", params.statuses.join(","))
  if (params.sortId) sp.set("sort", params.sortId)
  if (params.sortDir) sp.set("sortDir", params.sortDir)
  const qs = sp.toString()
  return qs ? `${base}?${qs}` : base
}

export function useMerchants() {
  const { currentUser } = useAuth()

  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_TABLE_ROWS_PER_PAGE)
  const [statuses, setStatuses] = useState<string[] | undefined>(undefined)
  const [sortId, setSortId] = useState<string>("")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const debouncedQuery = useDebouncedValue(query)

  const trimmedQuery = debouncedQuery.trim()
  const offset = (page - 1) * limit
  const url = buildUrl(KEY, {
    limit,
    offset,
    q: trimmedQuery || undefined,
    statuses,
    sortId: sortId || undefined,
    sortDir: sortId ? sortDir : undefined,
  })

  const {
    data: response,
    error,
    isLoading,
    mutate,
  } = useSWR<PaginatedResponse<Merchant>>(
    currentUser ? url : null,
    jsonFetcher,
    swrOptions,
  )

  const merchants = response?.data ?? []
  const total = response?.total ?? 0

  const { data: allResponse } = useSWR<PaginatedResponse<Merchant>>(
    currentUser ? KEY : null,
    jsonFetcher,
    swrOptions,
  )
  const allMerchants = allResponse?.data ?? []

  const currentMerchant =
    currentUser?.role === "MERCHANT" && currentUser.merchantId
      ? (allMerchants.find((m) => m.id === currentUser.merchantId) ?? null)
      : null

  const _replaceOne = useCallback(
    (_id: string, _updated: Merchant) => {
      mutate()
    },
    [mutate],
  )

  const approveMerchant = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/merchants/${id}/approve`, {
        method: "PATCH",
      })
      if (!res.ok) return
      await mutate()
    },
    [mutate],
  )

  const suspendMerchant = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/merchants/${id}/suspend`, {
        method: "PATCH",
      })
      if (!res.ok) return
      await mutate()
    },
    [mutate],
  )

  const reactivateMerchant = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/merchants/${id}/reactivate`, {
        method: "PATCH",
      })
      if (!res.ok) return
      await mutate()
    },
    [mutate],
  )

  const setMerchantPricing = useCallback(
    async (id: string, pricing: MerchantPricingInput) => {
      const res = await fetch(`/api/merchants/${id}/pricing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricing),
      })
      if (!res.ok) return
      await mutate()
    },
    [mutate],
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
    merchants,
    allMerchants,
    total,
    page,
    setPage,
    limit,
    setLimit,
    query,
    setQuery,
    statuses,
    setStatuses,
    sortId,
    sortDir,
    onSortChange,
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
