export const MAX_LIMIT = 100

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit?: number
  offset?: number
}

export function parsePagination(req: Request): {
  limit?: number
  offset?: number
} {
  const url = new URL(req.url)
  const limitRaw = url.searchParams.get("limit")
  const offsetRaw = url.searchParams.get("offset")

  const limit = limitRaw !== null ? Number.parseInt(limitRaw, 10) : Number.NaN
  const offset =
    offsetRaw !== null ? Number.parseInt(offsetRaw, 10) : Number.NaN

  return {
    limit:
      Number.isFinite(limit) && limit > 0
        ? Math.min(limit, MAX_LIMIT)
        : undefined,
    offset: Number.isFinite(offset) && offset >= 0 ? offset : undefined,
  }
}

/**
 * Parse a `?status=` query parameter that may contain comma-separated values.
 * Returns a deduplicated array of trimmed, upper-cased status strings, or an
 * empty array when the parameter is absent / empty.
 */
export function parseStatusFilter(req: Request): string[] {
  const raw = new URL(req.url).searchParams.get("status")
  if (!raw) return []
  const statuses = [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  ]
  return statuses
}

/**
 * Wrap a paginated result set into the standard API response envelope.
 * Use this after running a COUNT + SELECT in parallel.
 */
export function paginateResponse<T>(
  data: T[],
  total: number,
  limit?: number,
  offset?: number,
): PaginatedResponse<T> {
  return { data, total, limit, offset }
}
