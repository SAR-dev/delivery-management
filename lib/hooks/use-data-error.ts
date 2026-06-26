"use client"

import { useCallback } from "react"
import useSWR, { useSWRConfig } from "swr"
import { useAuth } from "@/features/account/hooks/use-auth"
import { jsonFetcher, RESOURCE_KEYS, swrOptions } from "@/lib/hooks/fetcher"

// Aggregates the load state of every platform resource into the single
// dataError / refreshData surface the old context exposed. The old loadAll()
// fetched all of these together and flagged an error if any failed; subscribing
// to the same shared SWR keys here reproduces that behavior (and dedupes with
// the resource hooks, so it triggers no extra requests). Consumed by
// <DataErrorBanner />.
export function useDataError() {
  // Compile-time guard: if RESOURCE_KEYS' length ever changes, this line
  // fails to typecheck instead of silently misaligning the fixed hook calls
  // below (TS only allows assigning a tuple to a same-length tuple type).
  const _lengthGuard: readonly [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ] = RESOURCE_KEYS
  void _lengthGuard

  const { currentUser } = useAuth()
  const { mutate } = useSWRConfig()
  const enabled = Boolean(currentUser)

  // One fixed hook call per resource key — no loop, so this can't violate
  // react-hooks/rules-of-hooks even if RESOURCE_KEYS' order or length ever
  // changes. Same key + same options as the resource hooks, so SWR shares
  // the cache entry rather than fetching twice.
  const r0 = useSWR(enabled ? RESOURCE_KEYS[0] : null, jsonFetcher, swrOptions)
  const r1 = useSWR(enabled ? RESOURCE_KEYS[1] : null, jsonFetcher, swrOptions)
  const r2 = useSWR(enabled ? RESOURCE_KEYS[2] : null, jsonFetcher, swrOptions)
  const r3 = useSWR(enabled ? RESOURCE_KEYS[3] : null, jsonFetcher, swrOptions)
  const r4 = useSWR(enabled ? RESOURCE_KEYS[4] : null, jsonFetcher, swrOptions)
  const r5 = useSWR(enabled ? RESOURCE_KEYS[5] : null, jsonFetcher, swrOptions)
  const r6 = useSWR(enabled ? RESOURCE_KEYS[6] : null, jsonFetcher, swrOptions)
  const r7 = useSWR(enabled ? RESOURCE_KEYS[7] : null, jsonFetcher, swrOptions)
  const r8 = useSWR(enabled ? RESOURCE_KEYS[8] : null, jsonFetcher, swrOptions)
  const r9 = useSWR(enabled ? RESOURCE_KEYS[9] : null, jsonFetcher, swrOptions)
  const r10 = useSWR(
    enabled ? RESOURCE_KEYS[10] : null,
    jsonFetcher,
    swrOptions,
  )
  const results = [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10]

  // Mirror the old loadAll(): any failed resource surfaces this single message.
  const hasError = results.some((r) => r.error)
  const dataError = hasError
    ? "One or more platform resources failed to load."
    : null

  const refreshData = useCallback(() => {
    for (const key of RESOURCE_KEYS) void mutate(key)
  }, [mutate])

  return { dataError, refreshData }
}
