"use client"

import { useMemo, useState } from "react"
import {
  Ban,
  CheckCircle2,
  Clock,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react"
import { useOrders } from "@/features/orders/hooks/use-orders"
import { useOrderColumns } from "@/features/orders/components/order-table-columns"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { ApproveOrderDialog } from "@/features/orders/dialogs/approve-order-dialog"
import { CancelOrderDialog } from "@/features/orders/dialogs/cancel-order-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { SearchInput } from "@/components/search-input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatCardList } from "@/components/stat-card-list"

type FilterTab = "PENDING" | "APPROVED" | "ALL"

export default function OrdersPage() {
  const { orders, allOrders, query, setQuery } = useOrders()
  const baseColumns = useOrderColumns()
  const [tab, setTab] = useState<FilterTab>("PENDING")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)

  // Stats always reflect the full order set, not the current search.
  const counts = useMemo(
    () => ({
      pending: allOrders.filter((o) => o.status === "PENDING").length,
      approved: allOrders.filter((o) => o.status === "APPROVED").length,
      inProgress: allOrders.filter(
        (o) =>
          !["PENDING", "DELIVERED", "RETURNED", "CANCELLED"].includes(o.status),
      ).length,
      total: allOrders.length,
    }),
    [allOrders],
  )

  // Search is server-side now (see useOrders); the tab status filter stays
  // client-side, layered on top of the already-search-narrowed `orders`.
  const filtered = useMemo(
    () => orders.filter((o) => tab === "ALL" || o.status === tab),
    [orders, tab],
  )

  function openApprove(order: Order) {
    setActiveOrder(order)
    setDialogOpen(true)
  }

  const columns: DataTableColumn<Order>[] = [
    ...baseColumns,
    {
      id: "actions",
      header: "",
      align: "right",
      headClassName: "w-12",
      cell: (o) => {
        const canApprove = o.status === "PENDING"
        const canCancel = [
          "PENDING",
          "APPROVED",
          "PICKED_UP",
          "IN_WAREHOUSE",
          "IN_TRANSIT",
        ].includes(o.status)
        if (!canApprove && !canCancel) return null
        return (
          <div className="flex items-center justify-end gap-2">
            {canApprove && (
              <Button size="sm" onClick={() => openApprove(o)}>
                <ShieldCheck className="size-4" />
                Review
              </Button>
            )}
            {canCancel && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setCancelTarget(o)
                  setCancelOpen(true)
                }}
              >
                <Ban className="size-3.5" />
                Cancel
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={pageContent.dashboard.orders.title}
        description={pageContent.dashboard.orders.description}
      />

      {/* Stats */}
      <StatCardList
        columns={4}
        items={[
          {
            label: "Pending approval",
            value: counts.pending,
            icon: Clock,
            tone: "bg-chart-3/15 text-chart-3",
          },
          {
            label: "Approved",
            value: counts.approved,
            icon: CheckCircle2,
            tone: "bg-chart-1/15 text-chart-1",
          },
          {
            label: "In progress",
            value: counts.inProgress,
            icon: Truck,
            tone: "bg-chart-4/15 text-chart-4",
          },
          {
            label: "Total orders",
            value: counts.total,
            icon: Package,
          },
        ]}
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
          <TabsList>
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="APPROVED">Approved</TabsTrigger>
            <TabsTrigger value="ALL">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <SearchInput
          placeholder="Search code, recipient, phone, city, warehouse, merchant"
          value={query}
          onChange={setQuery}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filtered}
            getRowKey={(o) => o.id}
            initialSortId="order"
            emptyMessage="No orders match the current filters."
          />
        </CardContent>
      </Card>

      <ApproveOrderDialog
        order={activeOrder}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <CancelOrderDialog
        order={cancelTarget}
        open={cancelOpen}
        onOpenChange={(open) => {
          setCancelOpen(open)
          if (!open) setCancelTarget(null)
        }}
      />
    </div>
  )
}
