"use client"

import { useCallback, useState } from "react"
import useSWR from "swr"
import type { AuditLog } from "@/lib/types"
import type { PaginatedResponse } from "@/lib/pagination"
import { useAuth } from "@/features/account/hooks/use-auth"
import { jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { DEFAULT_TABLE_ROWS_PER_PAGE } from "@/lib/constants"

const KEY = "/api/audit-logs"

function buildUrl(
  base: string,
  params: {
    limit?: number
    offset?: number
    q?: string
    sortId?: string
    sortDir?: string
  },
) {
  const sp = new URLSearchParams()
  if (params.limit != null) sp.set("limit", String(params.limit))
  if (params.offset != null) sp.set("offset", String(params.offset))
  if (params.q) sp.set("q", params.q)
  if (params.sortId) sp.set("sort", params.sortId)
  if (params.sortDir) sp.set("sortDir", params.sortDir)
  const qs = sp.toString()
  return qs ? `${base}?${qs}` : base
}

export function useAuditLogs() {
  const { currentUser } = useAuth()

  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_TABLE_ROWS_PER_PAGE)
  const [sortId, setSortId] = useState<string>("")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const debouncedQuery = useDebouncedValue(query)

  const trimmedQuery = debouncedQuery.trim()
  const offset = (page - 1) * limit
  const url = buildUrl(KEY, {
    limit,
    offset,
    q: trimmedQuery || undefined,
    sortId: sortId || undefined,
    sortDir: sortId ? sortDir : undefined,
  })

  const {
    data: response,
    error,
    isLoading,
    mutate,
  } = useSWR<PaginatedResponse<AuditLog>>(
    currentUser ? url : null,
    jsonFetcher,
    swrOptions,
  )

  const { data: allResponse } = useSWR<PaginatedResponse<AuditLog>>(
    currentUser ? KEY : null,
    jsonFetcher,
    swrOptions,
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
    auditLogs: response?.data ?? [],
    allAuditLogs: allResponse?.data ?? [],
    total: response?.total ?? 0,
    page,
    setPage,
    limit,
    setLimit,
    query,
    setQuery,
    sortId,
    sortDir,
    onSortChange,
    isLoading,
    error,
    mutate,
  }
}
