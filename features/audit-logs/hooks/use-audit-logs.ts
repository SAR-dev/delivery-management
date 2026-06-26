"use client"

import { useState } from "react"
import useSWR from "swr"
import type { AuditLog } from "@/lib/types"
import { useAuth } from "@/features/account/hooks/use-auth"
import { jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"

const KEY = "/api/audit-logs"

// Audit log resource. Read-only — there is no create/update/delete, only the
// list + search, so this hook is simpler than the full CRUD resources.
export function useAuditLogs() {
  const { currentUser } = useAuth()
  const { data, error, isLoading, mutate } = useSWR<AuditLog[]>(
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
  const { data: searchData, isLoading: isSearchLoading } = useSWR<AuditLog[]>(
    searchKey,
    jsonFetcher,
    swrOptions,
  )

  const auditLogs = trimmedQuery ? (searchData ?? []) : (data ?? [])
  const allAuditLogs = data ?? []

  return {
    auditLogs,
    allAuditLogs,
    query,
    setQuery,
    isLoading: trimmedQuery ? isSearchLoading : isLoading,
    error,
    mutate,
  }
}
