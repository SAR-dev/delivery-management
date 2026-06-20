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
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    offset: Number.isFinite(offset) && offset >= 0 ? offset : undefined,
  }
}
