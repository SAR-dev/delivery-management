"use client"

import { useCallback, useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import type { Role, User } from "@/lib/types"
import type { PaginatedResponse } from "@/lib/pagination"
import { useAuth } from "@/features/account/hooks/use-auth"
import { jsonFetcher, swrOptions } from "@/lib/hooks/fetcher"
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"
import { DEFAULT_TABLE_ROWS_PER_PAGE } from "@/lib/constants"

const KEY = "/api/team"
const _WAREHOUSES_KEY = "/api/warehouses"

interface NewAccountInput {
  name: string
  email: string
  phone: string
  role: Extract<Role, "ADMIN" | "WAREHOUSE_ADMIN">
  warehouseId?: string | null
  canManagePricing?: boolean
}

function buildUrl(
  base: string,
  params: {
    limit?: number
    offset?: number
    q?: string
    role?: string
    sortId?: string
    sortDir?: string
  },
) {
  const sp = new URLSearchParams()
  if (params.limit != null) sp.set("limit", String(params.limit))
  if (params.offset != null) sp.set("offset", String(params.offset))
  if (params.q) sp.set("q", params.q)
  if (params.role) sp.set("role", params.role)
  if (params.sortId) sp.set("sort", params.sortId)
  if (params.sortDir) sp.set("sortDir", params.sortDir)
  const qs = sp.toString()
  return qs ? `${base}?${qs}` : base
}

// Team (staff accounts) resource. Creating/reassigning a Warehouse Admin also
// updates the warehouses cache's managedBy field, so both views stay
// consistent without a global reload — mirrors the old context exactly.
export function useTeam() {
  const { currentUser } = useAuth()
  const { mutate: _globalMutate } = useSWRConfig()

  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_TABLE_ROWS_PER_PAGE)
  const [role, setRole] = useState<string | undefined>(undefined)
  const [sortId, setSortId] = useState<string>("")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const debouncedQuery = useDebouncedValue(query)

  const trimmedQuery = debouncedQuery.trim()
  const offset = (page - 1) * limit
  const url = buildUrl(KEY, {
    limit,
    offset,
    q: trimmedQuery || undefined,
    role,
    sortId: sortId || undefined,
    sortDir: sortId ? sortDir : undefined,
  })

  const {
    data: response,
    error,
    isLoading,
    mutate,
  } = useSWR<PaginatedResponse<User>>(
    currentUser ? url : null,
    jsonFetcher,
    swrOptions,
  )

  const team = response?.data ?? []
  const total = response?.total ?? 0

  // allTeam: fetch full list (no pagination) for stats
  const { data: allResponse } = useSWR<PaginatedResponse<User>>(
    currentUser ? KEY : null,
    jsonFetcher,
    swrOptions,
  )
  const allTeam = allResponse?.data ?? []

  const createAccount = useCallback(
    async (input: NewAccountInput & { password: string }) => {
      const res = await fetch(KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) return
      await mutate()
    },
    [mutate],
  )
  const toggleAccountActive = useCallback(
    async (id: string) => {
      const res = await fetch(`${KEY}/${id}/active`, { method: "PATCH" })
      if (!res.ok) return
      await mutate()
      _globalMutate((key: string) => key === KEY)
    },
    [mutate, _globalMutate],
  )

  const togglePricingPermission = useCallback(
    async (id: string) => {
      const res = await fetch(`${KEY}/${id}/pricing`, { method: "PATCH" })
      if (!res.ok) return
      await mutate()
      _globalMutate((key: string) => key === KEY)
    },
    [mutate, _globalMutate],
  )
  const updateAccountWarehouse = useCallback(
    async (id: string, warehouseId: string | null) => {
      const res = await fetch(`${KEY}/${id}/warehouse`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouseId }),
      })
      if (!res.ok) return
      await mutate()
      _globalMutate(KEY)
    },
    [mutate, _globalMutate],
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
    team,
    allTeam,
    total,
    page,
    setPage,
    limit,
    setLimit,
    query,
    setQuery,
    role,
    setRole,
    sortId,
    sortDir,
    onSortChange,
    isLoading,
    error,
    mutate,
    createAccount,
    toggleAccountActive,
    togglePricingPermission,
    updateAccountWarehouse,
  }
}
