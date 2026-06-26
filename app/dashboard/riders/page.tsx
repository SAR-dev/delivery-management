"use client"

import { useState } from "react"
import {
  Bike,
  CheckCircle2,
  Users,
  Warehouse as WarehouseIcon,
} from "lucide-react"
import { useRiders } from "@/features/riders/hooks/use-riders"
import { useRiderColumns } from "@/features/riders/components/rider-table-columns"
import type { Rider } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { CreateRiderDialog } from "@/features/riders/dialogs/create-rider-dialog"
import { EditRiderDialog } from "@/features/riders/dialogs/edit-rider-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { StatCardList } from "@/components/stat-card-list"
import { SearchInput } from "@/components/search-input"
import { DataTable } from "@/components/data-table"

export default function RidersPage() {
  const { riders, allRiders, query, setQuery } = useRiders()
  const columns = useRiderColumns({ showWarehouse: true })
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={pageContent.dashboard.riders.title}
        description={pageContent.dashboard.riders.description}
      >
        <CreateRiderDialog />
      </PageHeader>

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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <SearchInput
          placeholder="Search name, phone, zone, task type, warehouse"
          value={query}
          onChange={setQuery}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={riders}
            getRowKey={(r) => r.id}
            initialSortId="name"
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
