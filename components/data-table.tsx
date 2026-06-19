"use client"

import * as React from "react"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Search,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Align = "left" | "right" | "center"

export interface DataTableColumn<T> {
  /** Stable identifier, also used as the sort key. */
  id: string
  /** Header label (string or custom node). */
  header: React.ReactNode
  /** Renders the cell body for a given row. */
  cell: (row: T) => React.ReactNode
  /** Enable click-to-sort on this column. Requires `sortValue` (or falls back to the cell value if it's primitive). */
  sortable?: boolean
  /** Value used when sorting this column. */
  sortValue?: (row: T) => string | number | boolean | null | undefined
  /** Text alignment for header + cells. Defaults to "left". */
  align?: Align
  /** Extra classes for the header cell. */
  headClassName?: string
  /** Extra classes for body cells. */
  cellClassName?: string
}

/** A faceted filter rendered as a select in the toolbar. */
export interface DataTableFilter<T> {
  /** Stable identifier for the filter. */
  id: string
  /** Accessible label / placeholder shown when nothing is selected. */
  label: string
  /** The selectable values (the "All" option is added automatically). */
  options: { label: string; value: string }[]
  /** Returns the row's value for this filter, compared against the option value. */
  getValue: (row: T) => string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  getRowKey: (row: T, index: number) => string
  /** Rows per page. Pass 0 to disable pagination. Defaults to 10. */
  pageSize?: number
  /** Selectable page sizes shown in the footer. */
  pageSizeOptions?: number[]
  /** Column id to sort by initially. */
  initialSortId?: string
  initialSortDir?: SortDir
  emptyMessage?: React.ReactNode
  onRowClick?: (row: T) => void
  className?: string
  /** Show a search box in the toolbar. Requires `getSearchText`. */
  searchable?: boolean
  /** Placeholder for the search box. */
  searchPlaceholder?: string
  /** Text used to match a row against the search query. */
  getSearchText?: (row: T) => string
  /** Faceted select filters rendered in the toolbar. */
  filters?: DataTableFilter<T>[]
  /** Extra controls rendered on the right of the toolbar (e.g. tabs, buttons). */
  toolbarActions?: React.ReactNode
}

type SortDir = "asc" | "desc"

const alignClass: Record<Align, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
}

const justifyClass: Record<Align, string> = {
  left: "justify-start",
  right: "justify-end",
  center: "justify-center",
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  pageSize = 10,
  pageSizeOptions,
  initialSortId,
  initialSortDir = "asc",
  emptyMessage = "No records to display.",
  onRowClick,
  className,
  searchable = false,
  searchPlaceholder = "Search…",
  getSearchText,
  filters,
  toolbarActions,
}: DataTableProps<T>) {
  const [sortId, setSortId] = React.useState<string | null>(initialSortId ?? null)
  const [sortDir, setSortDir] = React.useState<SortDir>(initialSortDir)
  const [size, setSize] = React.useState(pageSize)
  const [page, setPage] = React.useState(1)
  const [query, setQuery] = React.useState("")
  const [filterValues, setFilterValues] = React.useState<Record<string, string>>(
    {},
  )

  const paginated = size > 0

  const hasSearch = searchable && Boolean(getSearchText)
  const hasFilters = Boolean(filters && filters.length > 0)
  const showToolbar = hasSearch || hasFilters || Boolean(toolbarActions)

  // Apply text search + faceted filters before sorting.
  const filtered = React.useMemo(() => {
    let rows = data
    if (hasSearch && getSearchText) {
      const q = query.trim().toLowerCase()
      if (q) {
        rows = rows.filter((row) =>
          getSearchText(row).toLowerCase().includes(q),
        )
      }
    }
    if (hasFilters && filters) {
      for (const f of filters) {
        const selected = filterValues[f.id]
        if (selected && selected !== "__all__") {
          rows = rows.filter((row) => f.getValue(row) === selected)
        }
      }
    }
    return rows
  }, [data, getSearchText, query, hasFilters, filters, filterValues])

  const sorted = React.useMemo(() => {
    if (!sortId) return filtered
    const col = columns.find((c) => c.id === sortId)
    if (!col?.sortValue) return filtered
    const getVal = col.sortValue
    const copy = [...filtered]
    copy.sort((a, b) => {
      const av = getVal(a)
      const bv = getVal(b)
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      let result: number
      if (typeof av === "number" && typeof bv === "number") {
        result = av - bv
      } else {
        result = String(av).localeCompare(String(bv), undefined, {
          numeric: true,
          sensitivity: "base",
        })
      }
      return sortDir === "asc" ? result : -result
    })
    return copy
  }, [filtered, columns, sortId, sortDir])

  const totalPages = paginated ? Math.max(1, Math.ceil(sorted.length / size)) : 1

  // Keep the current page within range when data or page size changes.
  React.useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages))
  }, [totalPages])

  // Reset to the first page whenever the query or filters change.
  React.useEffect(() => {
    setPage(1)
  }, [query, filterValues])

  const visible = React.useMemo(() => {
    if (!paginated) return sorted
    const start = (page - 1) * size
    return sorted.slice(start, start + size)
  }, [sorted, page, size])

  function toggleSort(col: DataTableColumn<T>) {
    if (!col.sortable || !col.sortValue) return
    if (sortId !== col.id) {
      setSortId(col.id)
      setSortDir("asc")
      return
    }
    // Cycle: asc -> desc -> unsorted
    if (sortDir === "asc") {
      setSortDir("desc")
    } else {
      setSortId(null)
      setSortDir("asc")
    }
  }

  const from = sorted.length === 0 ? 0 : (page - 1) * size + 1
  const to = paginated ? Math.min(page * size, sorted.length) : sorted.length

  return (
    <div className={cn("flex flex-col", className)}>
      {showToolbar ? (
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {hasSearch ? (
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-9"
                />
              </div>
            ) : null}
            {hasFilters && filters
              ? filters.map((f) => (
                  <label key={f.id} className="flex items-center gap-1.5">
                    <span className="sr-only">{f.label}</span>
                    <select
                      value={filterValues[f.id] ?? "__all__"}
                      onChange={(e) =>
                        setFilterValues((prev) => ({
                          ...prev,
                          [f.id]: e.target.value,
                        }))
                      }
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                    >
                      <option value="__all__">{f.label}: All</option>
                      {f.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))
              : null}
          </div>
          {toolbarActions ? (
            <div className="flex items-center gap-2">{toolbarActions}</div>
          ) : null}
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => {
              const align = col.align ?? "left"
              const isSorted = sortId === col.id
              const canSort = Boolean(col.sortable && col.sortValue)
              return (
                <TableHead
                  key={col.id}
                  className={cn(alignClass[align], col.headClassName)}
                  aria-sort={
                    isSorted
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {canSort ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col)}
                      className={cn(
                        "inline-flex cursor-pointer select-none items-center gap-1 rounded-sm font-medium transition-colors hover:text-foreground",
                        isSorted ? "text-foreground" : "text-muted-foreground",
                        justifyClass[align],
                      )}
                    >
                      {col.header}
                      {isSorted ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="size-3.5" />
                        ) : (
                          <ChevronDown className="size-3.5" />
                        )
                      ) : (
                        <ChevronsUpDown className="size-3.5 opacity-50" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            visible.map((row, index) => (
              <TableRow
                key={getRowKey(row, index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
              >
                {columns.map((col) => {
                  const align = col.align ?? "left"
                  return (
                    <TableCell
                      key={col.id}
                      className={cn(alignClass[align], col.cellClassName)}
                    >
                      {col.cell(row)}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {paginated && sorted.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="tabular-nums">
              {from}–{to} of {sorted.length}
            </span>
            {pageSizeOptions && pageSizeOptions.length > 0 ? (
              <label className="flex items-center gap-1.5">
                <span className="sr-only">Rows per page</span>
                <select
                  value={size}
                  onChange={(e) => {
                    setSize(Number(e.target.value))
                    setPage(1)
                  }}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                >
                  {pageSizeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} / page
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
