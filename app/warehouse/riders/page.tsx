"use client"

import { useState } from "react"
import { Bike, CheckCircle2, Truck, Users } from "lucide-react"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { useRiders } from "@/features/riders/hooks/use-riders"
import { useRiderColumns } from "@/features/riders/components/rider-table-columns"
import type { Rider } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { EditRiderDialog } from "@/features/riders/dialogs/edit-rider-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { StatCardList } from "@/components/stat-card-list"
import { DataTable } from "@/components/data-table"

export default function WarehouseRidersPage() {
  const { currentUser } = useAuth()
  const { currentWarehouse } = useWarehouses()
  const {
    riders,
    allRiders,
    total,
    page: _page,
    setPage,
    limit: _limit,
    setLimit,
    query,
    setQuery,
    isLoading,
  } = useRiders()
  const columns = useRiderColumns()
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

      <Card>
        <CardContent className="p-0">
          <DataTable
            serverPaginated
            id="warehouse-riders"
            searchable
            columns={columns}
            data={riders}
            total={total}
            loading={isLoading}
            query={query}
            onQueryChange={(q) => {
              setQuery(q)
              setPage(1)
            }}
            onPageChange={(p, l) => {
              setPage(p)
              setLimit(l)
            }}
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
