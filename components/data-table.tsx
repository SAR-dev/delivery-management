"use client"

import * as React from "react"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Download,
  Filter,
  Search,
  Settings,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { downloadCsv, toCsv } from "@/lib/csv"
import {
  DEFAULT_TABLE_ROWS_PER_PAGE,
  MAX_TABLE_ROWS_PER_PAGE,
} from "@/lib/constants"
import { useAuth } from "@/features/account/hooks/use-auth"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"

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
  /** Unique table identifier. When provided, column visibility is persisted
   * in localStorage and a settings button appears in the toolbar. */
  id?: string
  /** Enables client-side search within the table. When true, a search input
   * and column picker appear in the toolbar. Requires `getSearchValue`. */
  searchable?: boolean
  /** Function to extract searchable text from a row for a given column.
   * Required when `searchable` is true. Return null/undefined to skip. */
  getSearchValue?: (row: T, columnId: string) => string | null | undefined
  /** Rows per page. Pass 0 to disable pagination. Defaults to the signed-in
   * account's saved rows-per-page preference (Account settings), or 20 if
   * unset/unauthenticated. An explicit prop always wins over the account
   * default. Clamped to 1-250 regardless of source. */
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

const MIN_VISIBLE_COLUMNS = 2

function storageKey(id: string) {
  return `datatable-columns:${id}`
}

function readVisibleFromStorage(id: string): string[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(storageKey(id))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) {
      return parsed
    }
  } catch {
    // corrupted value — ignore
  }
  return null
}

function writeVisibleToStorage(id: string, visible: string[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(storageKey(id), JSON.stringify(visible))
  } catch {
    // storage full — silently ignore
  }
}

function searchColumnsKey(id: string) {
  return `datatable-search-columns:${id}`
}

function readSearchColumnsFromStorage(id: string): string[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(searchColumnsKey(id))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) {
      return parsed
    }
  } catch {
    // corrupted — ignore
  }
  return null
}

function writeSearchColumnsToStorage(id: string, columns: string[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(searchColumnsKey(id), JSON.stringify(columns))
  } catch {
    // storage full — silently ignore
  }
}

/** Clamps a possibly-missing/invalid rows-per-page value to [1, 250],
 * falling back to `fallback` (itself assumed already in range) when the
 * input is missing, not an integer, or out of bounds. `0` is left as-is
 * since it's the documented "disable pagination" sentinel, not a clamp
 * target. */
function clampPageSize(value: number | undefined | null, fallback: number) {
  if (value === 0) return 0
  if (
    value === undefined ||
    value === null ||
    !Number.isInteger(value) ||
    value < 1
  ) {
    return fallback
  }
  return Math.min(value, MAX_TABLE_ROWS_PER_PAGE)
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  id,
  searchable,
  getSearchValue,
  pageSize,
  pageSizeOptions,
  initialSortId,
  initialSortDir = "asc",
  emptyMessage = "No records to display.",
  onRowClick,
  className,
  csv,
}: DataTableProps<T>) {
  const { currentUser } = useAuth()

  // Effective default when the caller doesn't pass an explicit `pageSize`:
  // the signed-in account's saved preference, clamped to 1-250, falling back
  // to DEFAULT_TABLE_ROWS_PER_PAGE (20) if unset or out of range.
  const accountDefault = clampPageSize(
    currentUser?.tableRowsPerPage,
    DEFAULT_TABLE_ROWS_PER_PAGE,
  )
  const effectivePageSize =
    pageSize !== undefined
      ? clampPageSize(pageSize, accountDefault)
      : accountDefault

  const [sortId, setSortId] = React.useState<string | null>(
    initialSortId ?? null,
  )
  const [sortDir, setSortDir] = React.useState<SortDir>(initialSortDir)
  const [size, setSize] = React.useState(effectivePageSize)
  const [page, setPage] = React.useState(1)
  const paginated = size > 0

  // ---- Column visibility ----
  const allColumnIds = React.useMemo(() => columns.map((c) => c.id), [columns])

  const [visibleColumnIds, setVisibleColumnIds] = React.useState<string[]>(
    () => {
      if (!id) return allColumnIds
      const saved = readVisibleFromStorage(id)
      if (saved) {
        // Filter to only IDs that still exist in the current columns array.
        const valid = saved.filter((cid) => allColumnIds.includes(cid))
        // Ensure at least MIN_VISIBLE_COLUMNS are present.
        if (valid.length >= MIN_VISIBLE_COLUMNS) return valid
      }
      return allColumnIds
    },
  )

  const [settingsOpen, setSettingsOpen] = React.useState(false)

  // Validate visible IDs against current columns — handles added/removed
  // columns without needing a setState-in-effect.
  const filteredColumns = React.useMemo(() => {
    const valid = visibleColumnIds.filter((cid) => allColumnIds.includes(cid))
    if (valid.length >= MIN_VISIBLE_COLUMNS) {
      return columns.filter((c) => valid.includes(c.id))
    }
    // Fallback: columns changed drastically, show all.
    return columns
  }, [columns, visibleColumnIds, allColumnIds])

  function toggleColumn(columnId: string) {
    setVisibleColumnIds((prev) => {
      const isOn = prev.includes(columnId)
      if (isOn && prev.length <= MIN_VISIBLE_COLUMNS) return prev
      const next = isOn
        ? prev.filter((cid) => cid !== columnId)
        : [...prev, columnId]
      if (id) writeVisibleToStorage(id, next)
      return next
    })
  }

  // ---- Client-side search ----
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterOpen, setFilterOpen] = React.useState(false)

  // All searchable column IDs (columns that have no explicit header or are text)
  const allSearchableIds = React.useMemo(
    () => columns.map((c) => c.id),
    [columns],
  )

  const [searchColumnIds, setSearchColumnIds] = React.useState<string[]>(() => {
    if (!id || !searchable) return allSearchableIds
    const saved = readSearchColumnsFromStorage(id)
    if (saved) {
      const valid = saved.filter((cid) => allSearchableIds.includes(cid))
      if (valid.length > 0) return valid
    }
    return allSearchableIds
  })

  function toggleSearchColumn(columnId: string) {
    setSearchColumnIds((prev) => {
      const isOn = prev.includes(columnId)
      if (isOn && prev.length <= 1) return prev
      const next = isOn
        ? prev.filter((cid) => cid !== columnId)
        : [...prev, columnId]
      if (id) writeSearchColumnsToStorage(id, next)
      return next
    })
  }

  const trimmedSearch = searchQuery.trim().toLowerCase()

  // The account's preference loads asynchronously (it comes from the same
  // session bootstrap as `currentUser`), so it's often not ready yet on first
  // render. Adopt it once it arrives — but only when the caller didn't pass
  // an explicit `pageSize` and the person hasn't already changed the page
  // size in this table (via the selector below), so we never clobber either
  // an explicit prop or a deliberate in-session choice.
  const userChangedSize = React.useRef(false)
  React.useEffect(() => {
    if (pageSize === undefined && !userChangedSize.current) {
      setSize(effectivePageSize)
    }
  }, [effectivePageSize, pageSize])

  const filtered = React.useMemo(() => {
    if (!trimmedSearch || !searchable || !getSearchValue) return data
    return data.filter((row) =>
      searchColumnIds.some((cid) => {
        const val = getSearchValue(row, cid)
        return val != null && String(val).toLowerCase().includes(trimmedSearch)
      }),
    )
  }, [data, trimmedSearch, searchable, getSearchValue, searchColumnIds])

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
            {filteredColumns.map((col) => {
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
                colSpan={filteredColumns.length}
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
                {filteredColumns.map((col) => {
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

      {paginated || id ? (
        <div className="border-border flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {paginated ? (
              <>
                <span className="text-muted-foreground tabular-nums">
                  {from}–{to} of {sorted.length}
                </span>
                {pageSizeOptions && pageSizeOptions.length > 0 ? (
                  <label className="flex items-center gap-1.5">
                    <span className="sr-only">Rows per page</span>
                    <select
                      value={size}
                      onChange={(e) => {
                        userChangedSize.current = true
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
              </>
            ) : (
              <span className="text-muted-foreground tabular-nums">
                {sorted.length} record{sorted.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {searchable ? (
              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1)
                  }}
                  className="h-8 w-48 pl-9 text-sm sm:w-64"
                />
              </div>
            ) : null}
            {searchable && id ? (
              <Button
                type="button"
                variant={
                  searchColumnIds.length < allSearchableIds.length
                    ? "secondary"
                    : "outline"
                }
                size="icon"
                className="size-8"
                onClick={() => setFilterOpen(true)}
                aria-label="Filter search columns"
              >
                <Filter className="size-4" />
              </Button>
            ) : null}
            {id ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setSettingsOpen(true)}
                aria-label="Table settings"
              >
                <Settings className="size-4" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadCsv}
              disabled={!csv}
              className="gap-1.5"
            >
              <Download className="size-4" />
              Download CSV
            </Button>
          </div>
        </div>
      ) : null}

      {id ? (
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Table columns</DialogTitle>
              <DialogDescription>
                Choose which columns to display. At least {MIN_VISIBLE_COLUMNS}{" "}
                must remain visible.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1">
              {columns.map((col) => {
                const isVisible = visibleColumnIds.includes(col.id)
                const isDisabled =
                  isVisible && visibleColumnIds.length <= MIN_VISIBLE_COLUMNS
                return (
                  <label
                    key={col.id}
                    className={cn(
                      "flex items-center justify-between gap-4 rounded-md px-2 py-1.5 text-sm",
                      isDisabled
                        ? "cursor-not-allowed opacity-50"
                        : "hover:bg-muted/50 cursor-pointer",
                    )}
                  >
                    <span className="truncate">
                      {typeof col.header === "string" ? col.header : col.id}
                    </span>
                    <Switch
                      size="sm"
                      checked={isVisible}
                      disabled={isDisabled}
                      onCheckedChange={() => toggleColumn(col.id)}
                    />
                  </label>
                )
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {searchable && id ? (
        <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Search columns</DialogTitle>
              <DialogDescription>
                Choose which columns to search. At least 1 must remain selected.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1">
              {columns.map((col) => {
                const isSearchable = searchColumnIds.includes(col.id)
                const isDisabled = isSearchable && searchColumnIds.length <= 1
                return (
                  <label
                    key={col.id}
                    className={cn(
                      "flex items-center justify-between gap-4 rounded-md px-2 py-1.5 text-sm",
                      isDisabled
                        ? "cursor-not-allowed opacity-50"
                        : "hover:bg-muted/50 cursor-pointer",
                    )}
                  >
                    <span className="truncate">
                      {typeof col.header === "string" ? col.header : col.id}
                    </span>
                    <Switch
                      size="sm"
                      checked={isSearchable}
                      disabled={isDisabled}
                      onCheckedChange={() => toggleSearchColumn(col.id)}
                    />
                  </label>
                )
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFilterOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}
