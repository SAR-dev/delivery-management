"use client"

import { useCallback, useState } from "react"
import useSWR from "swr"
import type { Announcement } from "@/lib/types"
import type { PaginatedResponse } from "@/lib/pagination"
import { useAuth } from "@/features/account/hooks/use-auth"
import { jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { DEFAULT_TABLE_ROWS_PER_PAGE } from "@/lib/constants"

const KEY = "/api/announcements"

type Result = { ok: boolean; error?: string }

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

export interface AnnouncementInput {
  title: string
  content: string
  publishedAt?: string | null
  expiresAt?: string | null
  isActive?: boolean
  targetRoles: string[]
}

export function useAnnouncements() {
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
  } = useSWR<PaginatedResponse<Announcement>>(
    currentUser ? url : null,
    jsonFetcher,
    swrOptions,
  )

  const announcements = response?.data ?? []
  const total = response?.total ?? 0

  const createAnnouncement = useCallback(
    async (input: AnnouncementInput): Promise<Result> => {
      const res = await fetch(KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error ?? "Could not create the announcement.",
        }
      }
      await mutate()
      return { ok: true }
    },
    [mutate],
  )

  const updateAnnouncement = useCallback(
    async (id: string, input: Partial<AnnouncementInput>): Promise<Result> => {
      const res = await fetch(`${KEY}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error ?? "Could not update the announcement.",
        }
      }
      await mutate()
      return { ok: true }
    },
    [mutate],
  )

  const deleteAnnouncement = useCallback(
    async (id: string): Promise<Result> => {
      const res = await fetch(`${KEY}/${id}`, { method: "DELETE" })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error ?? "Could not delete the announcement.",
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
    announcements,
    total,
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
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
  }
}
