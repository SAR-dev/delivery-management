"use client"

import { useCallback, useEffect, useState } from "react"
import useSWR from "swr"
import type { Division } from "@/lib/types"
import { useAuth } from "@/features/account/hooks/use-auth"
import { jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"

const KEY = "/api/divisions"

const byName = (a: Division, b: Division) => a.name.localeCompare(b.name)

type Result = { ok: boolean; error?: string }

// Divisions (geographic regions) resource. The cache is kept sorted by name on
// every create/update to match the old context.
export function useDivisions() {
  const { currentUser } = useAuth()
  const { data, error, isLoading, mutate } = useSWR<Division[]>(
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
  const { data: searchData, isLoading: isSearchLoading } = useSWR<Division[]>(
    searchKey,
    jsonFetcher,
    swrOptions,
  )

  const divisions = trimmedQuery ? (searchData ?? []) : (data ?? [])
  const allDivisions = data ?? []

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
      await mutate((prev) => [...(prev ?? []), data].sort(byName), {
        revalidate: false,
      })
      return { ok: true }
    },
    [mutate],
  )

  const updateDivision = useCallback(
    async (
      id: string,
      input: { name?: string; isActive?: boolean },
    ): Promise<Result> => {
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
      await mutate(
        (prev) =>
          (prev ?? []).map((d) => (d.id === id ? data : d)).sort(byName),
        { revalidate: false },
      )
      return { ok: true }
    },
    [mutate],
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
      await mutate((prev) => (prev ?? []).filter((d) => d.id !== id), {
        revalidate: false,
      })
      return { ok: true }
    },
    [mutate],
  )

  return {
    divisions,
    allDivisions,
    query,
    setQuery,
    isLoading: trimmedQuery ? isSearchLoading : isLoading,
    error,
    mutate,
    createDivision,
    updateDivision,
    deleteDivision,
  }
}
