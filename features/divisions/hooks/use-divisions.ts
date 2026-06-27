"use client"

import { useCallback, useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import type { Division } from "@/lib/types"
import type { PaginatedResponse } from "@/lib/pagination"
import { useAuth } from "@/features/account/hooks/use-auth"
import { jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { DEFAULT_TABLE_ROWS_PER_PAGE } from "@/lib/constants"

const KEY = "/api/divisions"

const _byName = (a: Division, b: Division) => a.name.localeCompare(b.name)

type Result = { ok: boolean; error?: string }

function buildUrl(
  base: string,
  params: { limit?: number; offset?: number; q?: string },
) {
  const sp = new URLSearchParams()
  if (params.limit != null) sp.set("limit", String(params.limit))
  if (params.offset != null) sp.set("offset", String(params.offset))
  if (params.q) sp.set("q", params.q)
  const qs = sp.toString()
  return qs ? `${base}?${qs}` : base
}

export function useDivisions() {
  const { currentUser } = useAuth()
  const { mutate: _globalMutate } = useSWRConfig()

  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_TABLE_ROWS_PER_PAGE)
  const debouncedQuery = useDebouncedValue(query)

  const trimmedQuery = debouncedQuery.trim()
  const offset = (page - 1) * limit
  const url = buildUrl(KEY, {
    limit,
    offset,
    q: trimmedQuery || undefined,
  })

  const {
    data: response,
    error,
    isLoading,
    mutate,
  } = useSWR<PaginatedResponse<Division>>(
    currentUser ? url : null,
    jsonFetcher,
    swrOptions,
  )

  const divisions = response?.data ?? []
  const total = response?.total ?? 0

  // allDivisions: fetch full list (no pagination) for cross-resource lookups
  const { data: allResponse } = useSWR<PaginatedResponse<Division>>(
    currentUser ? KEY : null,
    jsonFetcher,
    swrOptions,
  )
  const allDivisions = allResponse?.data ?? []

  const createDivision = useCallback(
    async (name: string): Promise<Result> => {
      const res = await fetch(KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error ?? "Could not create the division.",
        }
      }
      await mutate()
      return { ok: true }
    },
    [mutate],
  )

  const updateDivision = useCallback(
    async (
      id: string,
      input: { name?: string; isActive?: boolean },
    ): Promise<Result> => {
      const isToggleActive = "isActive" in input && Object.keys(input).length === 1

      if (isToggleActive) {
        await mutate(
          async () => {
            const res = await fetch(`${KEY}/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(input),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok) {
              throw new Error(data?.error ?? "Could not update the division.")
            }
            return data
          },
          {
            optimisticData: (current) => ({
              ...(current ?? { data: [], total: 0 }),
              data: (current?.data ?? []).map((d) =>
                d.id === id ? { ...d, isActive: input.isActive! } : d,
              ),
            }),
            rollbackOnError: true,
            revalidate: true,
          },
        )
        _globalMutate((key: string) => key === KEY)
        return { ok: true }
      }

      const res = await fetch(`${KEY}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error ?? "Could not update the division.",
        }
      }
      await mutate()
      return { ok: true }
    },
    [mutate, _globalMutate],
  )

  const deleteDivision = useCallback(
    async (id: string): Promise<Result> => {
      const res = await fetch(`${KEY}/${id}`, { method: "DELETE" })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error ?? "Could not delete the division.",
        }
      }
      await mutate()
      return { ok: true }
    },
    [mutate],
  )

  return {
    divisions,
    allDivisions,
    total,
    page,
    setPage,
    limit,
    setLimit,
    query,
    setQuery,
    isLoading,
    error,
    mutate,
    createDivision,
    updateDivision,
    deleteDivision,
  }
}
