"use client"

import { useCallback, useState } from "react"
import useSWR from "swr"
import type { EmailLog } from "@/lib/types"
import { useAuth } from "@/features/account/hooks/use-auth"
import { jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"

const KEY = "/api/email-logs"

type Result = { ok: true } | { ok: false; error?: string }

// Email log resource. Read-only except for markAsSent, which lets an Admin /
// Super Admin manually flip a FAILED entry to SENT.
export function useEmailLogs() {
  const { currentUser } = useAuth()
  const { data, error, isLoading, mutate } = useSWR<EmailLog[]>(
    currentUser ? KEY : null,
    jsonFetcher,
    swrOptions,
  )

  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query)

  const trimmedQuery = debouncedQuery.trim()
  const searchKey =
    currentUser && trimmedQuery
      ? `${KEY}?q=${encodeURIComponent(trimmedQuery)}`
      : null
  const { data: searchData, isLoading: isSearchLoading } = useSWR<EmailLog[]>(
    searchKey,
    jsonFetcher,
    swrOptions,
  )

  const emailLogs = trimmedQuery ? (searchData ?? []) : (data ?? [])
  const allEmailLogs = data ?? []

  const markAsSent = useCallback(
    async (id: string): Promise<Result> => {
      const res = await fetch(`${KEY}/${id}`, { method: "PATCH" })
      const resData = await res.json()
      if (!res.ok) return { ok: false, error: resData.error }
      await mutate(
        (prev) => (prev ?? []).map((l) => (l.id === id ? resData : l)),
        { revalidate: false },
      )
      return { ok: true }
    },
    [mutate],
  )

  return {
    emailLogs,
    allEmailLogs,
    query,
    setQuery,
    isLoading: trimmedQuery ? isSearchLoading : isLoading,
    error,
    mutate,
    markAsSent,
  }
}
