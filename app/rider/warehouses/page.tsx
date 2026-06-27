"use client"

import { useMemo } from "react"
import { Warehouse as WarehouseIcon } from "lucide-react"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { useDivisions } from "@/features/divisions/hooks/use-divisions"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { DataTable, type DataTableColumn } from "@/components/data-table"

interface WarehouseRow {
  id: string
  name: string
  address: string
  city: string
  isActive: boolean
  divisionName: string
}

export default function WarehouseAdminWarehousesPage() {
  const { currentUser } = useAuth()
  const {
    warehouses,
    total,
    page: _page,
    setPage,
    limit: _limit,
    setLimit,
    query,
    setQuery,
    sortId,
    sortDir,
    onSortChange,
    isLoading,
  } = useWarehouses()
  const { divisions } = useDivisions()

  const rows = useMemo<WarehouseRow[]>(
    () =>
      warehouses.map((w) => ({
        ...w,
        divisionName: divisions.find((d) => d.id === w.divisionId)?.name ?? "—",
      })),
    [warehouses, divisions],
  )

  const columns: DataTableColumn<WarehouseRow>[] = [
    {
      id: "name",
      header: "Warehouse",
      sortable: true,
      sortValue: (w) => w.name,
      cell: (w) => (
        <div className="flex items-center gap-2 font-medium">
          <WarehouseIcon className="text-muted-foreground size-4" aria-hidden />
          <div className="leading-tight">
            <div>{w.name}</div>
            <div className="text-muted-foreground text-xs font-normal">
              {w.address}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "city",
      header: "City",
      sortable: true,
      sortValue: (w) => w.city,
      headClassName: "hidden sm:table-cell",
      cellClassName: "hidden sm:table-cell",
      cell: (w) => <span className="text-sm">{w.city}</span>,
    },
    {
      id: "division",
      header: "Division",
      headClassName: "hidden md:table-cell",
      cellClassName: "hidden md:table-cell",
      cell: (w) => (
        <span className="text-muted-foreground text-sm">{w.divisionName}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      sortValue: (w) => (w.isActive ? 1 : 0),
      cell: (w) => (
        <Badge variant={w.isActive ? "default" : "secondary"}>
          {w.isActive ? "Active" : "Disabled"}
        </Badge>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={pageContent.dashboard.warehouses.title}
        description={pageContent.dashboard.warehouses.description}
      />

      <Card>
        <CardContent className="p-0">
          <DataTable
            id="rider-warehouses"
            searchable
            columns={columns}
            data={rows}
            getRowKey={(w) => w.id}
            initialSortId="name"
            emptyMessage="No warehouses found."
            loading={isLoading}
            serverPaginated
            total={total}
            query={query}
            onQueryChange={setQuery}
            onPageChange={(p, l) => {
              setPage(p)
              setLimit(l)
            }}
            serverSortId={sortId}
            serverSortDir={sortDir}
            onSortChange={onSortChange}
          />
        </CardContent>
      </Card>
    </div>
  )
}
