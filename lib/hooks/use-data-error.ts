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
  const { currentUser } = useAuth()
  const { mutate } = useSWRConfig()
  const enabled = Boolean(currentUser)

  // Subscribe to each resource key. Same key + same options as the resource
  // hooks, so SWR shares the cache entry rather than fetching twice.
  const results = RESOURCE_KEYS.map(
    // eslint-disable-next-line react-hooks/rules-of-hooks
    (key) => useSWR(enabled ? key : null, jsonFetcher, swrOptions),
  )

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
