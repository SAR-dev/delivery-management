"use client"

import { MapPin } from "lucide-react"
import { useDivisions } from "@/features/divisions/hooks/use-divisions"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import type { Division } from "@/lib/types"

export default function WarehouseAdminDivisionsPage() {
  const {
    divisions,
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
  } = useDivisions()

  const columns: DataTableColumn<Division>[] = [
    {
      id: "name",
      header: "Division",
      sortable: true,
      sortValue: (d) => d.name,
      cell: (d) => (
        <div className="flex items-center gap-2 font-medium">
          <MapPin className="text-muted-foreground size-4" aria-hidden />
          {d.name}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      sortValue: (d) => (d.isActive ? 1 : 0),
      cell: (d) => (
        <Badge variant={d.isActive ? "default" : "secondary"}>
          {d.isActive ? "Active" : "Disabled"}
        </Badge>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={pageContent.dashboard.divisions.title}
        description={pageContent.dashboard.divisions.description}
      />

      <Card>
        <CardContent className="p-0">
          <DataTable
            id="warehouse-admin-divisions"
            searchable
            columns={columns}
            data={divisions}
            getRowKey={(d) => d.id}
            initialSortId="name"
            emptyMessage="No divisions found."
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
