"use client"

import * as React from "react"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Download,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { toCsv, downloadCsv } from "@/lib/csv"
import { Button } from "@/components/ui/button"
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

/** Enables a "Download CSV" toolbar button. `parser` is required — CSV
 * export only activates when the caller supplies a way to flatten a row. */
export interface DataTableCsv<T> {
  /** Converts one row into an array of cell values, in column order. */
  parser: (row: T) => (string | number | null | undefined)[]
  /** Header row labels, in the same order as `parser`'s output. */
  headers?: string[]
  /** Filename without extension. Defaults to "export". */
  filename?: string
  /** Export all rows matching the current search/filter/sort ("all", the
   * default) or only the rows on the current page ("page"). */
  scope?: "all" | "page"
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
  /** Enables a "Download CSV" button in the toolbar. */
  csv?: DataTableCsv<T>
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
  csv,
}: DataTableProps<T>) {
  const [sortId, setSortId] = React.useState<string | null>(
    initialSortId ?? null,
  )
  const [sortDir, setSortDir] = React.useState<SortDir>(initialSortDir)
  const [size, setSize] = React.useState(pageSize)
  const [page, setPage] = React.useState(1)
  const paginated = size > 0

  const filtered = React.useMemo(() => data, [data])

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

  const totalPages = paginated
    ? Math.max(1, Math.ceil(sorted.length / size))
    : 1

  // Clamp page during render — avoids the extra render cycle that
  // setState-in-effect causes. Page resets to 1 when query/filters change
  // because totalPages changes, which clamps down naturally.
  const currentPage = Math.min(Math.max(1, page), totalPages)

  const visible = React.useMemo(() => {
    if (!paginated) return sorted
    const start = (currentPage - 1) * size
    return sorted.slice(start, start + size)
  }, [sorted, currentPage, size, paginated])

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

  function handleDownloadCsv() {
    if (!csv) return
    const rows = csv.scope === "page" ? visible : sorted
    const content = toCsv(rows.map(csv.parser), csv.headers)
    downloadCsv(csv.filename ?? "export", content)
  }

  const from = sorted.length === 0 ? 0 : (currentPage - 1) * size + 1
  const to = paginated
    ? Math.min(currentPage * size, sorted.length)
    : sorted.length

  return (
    <div className={cn("flex flex-col", className)}>
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
                        "hover:text-foreground inline-flex cursor-pointer items-center gap-1 rounded-sm font-medium transition-colors select-none",
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
                className="text-muted-foreground py-10 text-center text-sm"
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

      {paginated ? (
        <div className="border-border flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="text-muted-foreground flex items-center gap-3">
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
                  className="border-input bg-background text-foreground h-8 rounded-md border px-2 text-sm"
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
          <div className="flex items-center justify-center">
            {csv ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadCsv}
                className="gap-1.5"
              >
                <Download className="size-4" />
                Download CSV
              </Button>
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
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
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
