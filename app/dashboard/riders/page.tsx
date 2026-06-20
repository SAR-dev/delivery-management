"use client"

import { useState } from "react"
import {
  Bike,
  CheckCircle2,
  Users,
  Warehouse as WarehouseIcon,
} from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import type { Rider } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { CreateRiderDialog } from "@/components/dialog/create-rider-dialog"
import { EditRiderDialog } from "@/components/dialog/edit-rider-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { StatCardList } from "@/components/stat-card-list"
import { DataTable, type DataTableColumn } from "@/components/data-table"

export default function RidersPage() {
  const { riders, warehouses } = usePlatform()
  const [editingRider, setEditingRider] = useState<Rider | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  function warehouseName(id?: string | null) {
    if (!id) return null
    return warehouses.find((w) => w.id === id)?.name ?? "Unknown"
  }

  function handleRowClick(rider: Rider) {
    setEditingRider(rider)
    setEditOpen(true)
  }

  const activeCount = riders.filter((r) => r.isActive).length
  const deliveryCount = riders.filter((r) => r.warehouseId).length
  const pickupCount = riders.length - deliveryCount

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
      id: "assignment",
      header: "Assignment",
      sortable: true,
      sortValue: (r) => warehouseName(r.warehouseId) ?? "Pickup only",
      cell: (r) => {
        const name = warehouseName(r.warehouseId)
        return name ? (
          <Badge variant="secondary" className="font-normal">
            {name}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">Pickup only</span>
        )
      },
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
        title="Riders"
        description="Manage the rider roster. Pickup riders collect parcels from merchants; warehouse-based riders handle deliveries."
      >
        <CreateRiderDialog />
      </PageHeader>

      <StatCardList
        columns={4}
        items={[
          { label: "Total riders", value: riders.length, icon: Users },
          {
            label: "Active",
            value: activeCount,
            icon: CheckCircle2,
            tone: "bg-chart-2/15 text-chart-2",
          },
          {
            label: "Delivery riders",
            value: deliveryCount,
            icon: WarehouseIcon,
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

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={riders}
            getRowKey={(r) => r.id}
            initialSortId="name"
            searchable
            searchPlaceholder="Search name, zone, phone"
            getSearchText={(r) => `${r.name} ${r.zone} ${r.phone}`}
            emptyMessage="No riders yet. Add one to get started."
            onRowClick={handleRowClick}
          />
        </CardContent>
      </Card>

      <EditRiderDialog
        rider={editingRider}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  )
}
