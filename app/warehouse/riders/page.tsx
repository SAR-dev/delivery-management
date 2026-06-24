"use client"

import { useState } from "react"
import { Bike, CheckCircle2, Search, Truck, Users } from "lucide-react"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { useRiders } from "@/features/riders/hooks/use-riders"
import type { Rider } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { EditRiderDialog } from "@/features/riders/dialogs/edit-rider-dialog"
import { taskTypeLabel } from "@/features/riders/dialogs/task-type"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { StatCardList } from "@/components/stat-card-list"
import { DataTable, type DataTableColumn } from "@/components/data-table"

export default function WarehouseRidersPage() {
  const { currentUser } = useAuth()
  const { currentWarehouse } = useWarehouses()
  // The riders API already scopes the roster to the signed-in Warehouse
  // Admin's hub (search composes with that scope server-side too), so
  // `riders`/`allRiders` here only ever contain this warehouse's riders.
  const { riders, allRiders, query, setQuery } = useRiders()
  const [editingRider, setEditingRider] = useState<Rider | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  function handleRowClick(rider: Rider) {
    setEditingRider(rider)
    setEditOpen(true)
  }

  // Stats always reflect the full roster, not the current search.
  const activeCount = allRiders.filter((r) => r.isActive).length
  const deliveryCount = allRiders.filter(
    (r) => r.taskType === "DELIVERY" || r.taskType === "BOTH",
  ).length
  const pickupCount = allRiders.filter(
    (r) => r.taskType === "PICKUP" || r.taskType === "BOTH",
  ).length

  const columns: DataTableColumn<Rider>[] = [
    {
      id: "name",
      header: "Name",
      sortable: true,
      sortValue: (r) => r.name,
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-medium">{r.name}</span>
          <span className="text-muted-foreground text-xs sm:hidden">
            {r.phone}
          </span>
        </div>
      ),
    },
    {
      id: "phone",
      header: "Phone",
      sortable: true,
      sortValue: (r) => r.phone,
      headClassName: "hidden sm:table-cell",
      cellClassName: "hidden sm:table-cell",
      cell: (r) => <span className="text-sm tabular-nums">{r.phone}</span>,
    },
    {
      id: "zone",
      header: "Zone",
      sortable: true,
      sortValue: (r) => r.zone,
      cell: (r) => <span className="text-sm">{r.zone}</span>,
    },
    {
      id: "taskType",
      header: "Task type",
      sortable: true,
      sortValue: (r) => r.taskType,
      cell: (r) => (
        <Badge variant="outline" className="font-normal">
          {taskTypeLabel(r.taskType)}
        </Badge>
      ),
    },
    {
      id: "status",
      header: "Status",
      align: "right",
      sortable: true,
      sortValue: (r) => (r.isActive ? 1 : 0),
      cell: (r) => (
        <Switch
          checked={r.isActive}
          disabled
          className="data-[state=checked]:bg-chart-2 disabled:opacity-100"
          aria-label={r.isActive ? "Active" : "Disabled"}
        />
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={pageContent.warehouse.riders.title(
          currentUser?.name.split(" ")[0] ?? "Admin",
        )}
        description={pageContent.warehouse.riders.description(
          currentWarehouse?.name ?? "your warehouse",
        )}
      />

      <StatCardList
        columns={4}
        items={[
          { label: "Total riders", value: allRiders.length, icon: Users },
          {
            label: "Active",
            value: activeCount,
            icon: CheckCircle2,
            tone: "bg-chart-2/15 text-chart-2",
          },
          {
            label: "Delivery riders",
            value: deliveryCount,
            icon: Truck,
            tone: "bg-chart-1/15 text-chart-1",
          },
          {
            label: "Pickup riders",
            value: pickupCount,
            icon: Bike,
            tone: "bg-chart-4/15 text-chart-4",
          },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search name, phone, zone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={riders}
            getRowKey={(r) => r.id}
            initialSortId="name"
            emptyMessage="No riders are based at this warehouse yet."
            onRowClick={handleRowClick}
          />
        </CardContent>
      </Card>

      <EditRiderDialog
        rider={editingRider}
        open={editOpen}
        onOpenChange={setEditOpen}
        canReassignWarehouse={false}
      />
    </div>
  )
}
