"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, RotateCcw, Undo2, Wrench } from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { OrderStatusBadge } from "@/components/badge/order-status-badge"
import { FailedDeliveryDialog } from "@/components/dialog/failed-delivery-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { StatCardList } from "@/components/stat-card-list"

type FilterTab = "NEEDS_ACTION" | "RESOLVED"

export default function WarehouseExceptionsPage() {
  const {
    currentUser,
    currentWarehouse,
    orders,
    merchants,
    riders,
    warehouseFailedOrders,
  } = usePlatform()
  const [tab, setTab] = useState<FilterTab>("NEEDS_ACTION")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const merchantName = (id: string) => merchant(id)?.businessName ?? "Merchant"
  const rider = (id?: string | null) =>
    id ? riders.find((r) => r.id === id) : undefined

  // FAILED_ATTEMPT parcels at this warehouse awaiting a decision.
  const needsAction = warehouseFailedOrders

  // Parcels this warehouse has already resolved as returned.
  const resolved = useMemo(
    () =>
      currentWarehouse
        ? orders.filter(
            (o) =>
              o.warehouseId === currentWarehouse.id && o.status === "RETURNED",
          )
        : [],
    [orders, currentWarehouse],
  )

  const visible = tab === "NEEDS_ACTION" ? needsAction : resolved

  function openResolve(order: Order) {
    setActiveOrder(order)
    setDialogOpen(true)
  }

  const columns: DataTableColumn<Order>[] = [
    {
      id: "order",
      header: "Order",
      sortable: true,
      sortValue: (o) => o.code,
      cell: (o) => (
        <div className="flex flex-col">
          <span className="text-muted-foreground font-mono text-xs">
            {o.code}
          </span>
          <span className="font-medium">{merchantName(o.merchantId)}</span>
        </div>
      ),
    },
    {
      id: "rider",
      header: "Delivery rider",
      sortable: true,
      sortValue: (o) => rider(o.deliveryRiderId)?.name ?? "",
      cell: (o) => (
        <span className="text-sm">{rider(o.deliveryRiderId)?.name ?? "—"}</span>
      ),
    },
    {
      id: "destination",
      header: "Destination",
      sortable: true,
      sortValue: (o) => o.deliveryCity,
      cell: (o) => (
        <div className="flex flex-col">
          <span>{o.deliveryCity}</span>
          <span className="text-muted-foreground text-xs">
            {o.recipientName} · {o.recipientPhone}
          </span>
        </div>
      ),
    },
    {
      id: "attempts",
      header: "Attempts",
      align: "center",
      sortable: true,
      sortValue: (o) => o.deliveryAttempts ?? 1,
      cell: (o) => (
        <span className="tabular-nums">{o.deliveryAttempts ?? 1}</span>
      ),
    },
    {
      id: "note",
      header: "Note",
      cellClassName: "whitespace-normal align-top",
      cell: (o) =>
        o.status === "FAILED_ATTEMPT" && o.failureNote ? (
          <span className="text-destructive block w-56 text-xs break-words whitespace-normal">
            {o.failureNote}
          </span>
        ) : o.status === "RETURNED" ? (
          <span className="text-muted-foreground block w-56 text-xs break-words whitespace-normal">
            Returned by {o.failedResolvedBy ?? "Warehouse Admin"}
            {o.returnReason ? ` — ${o.returnReason}` : ""}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      id: "collectible",
      header: "Collectible",
      align: "right",
      sortable: true,
      sortValue: (o) => o.totalCollectible,
      cell: (o) => (
        <span className="tabular-nums">{formatTk(o.totalCollectible)}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      sortValue: (o) => o.status,
      cell: (o) => <OrderStatusBadge status={o.status} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      headClassName: "w-12",
      cell: (o) =>
        o.status === "FAILED_ATTEMPT" ? (
          <Button size="sm" onClick={() => openResolve(o)}>
            <RotateCcw className="size-4" />
            Resolve
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Exceptions desk, ${currentUser?.name.split(" ")[0] ?? "Admin"}`}
        description={`Resolve failed delivery attempts at ${
          currentWarehouse?.name ?? "your warehouse"
        } — re-attempt delivery or close the parcel as returned.`}
      />

      <StatCardList
        items={[
          {
            label: "Needs action",
            value: needsAction.length,
            icon: AlertTriangle,
            tone: "bg-destructive/10 text-destructive",
          },
          {
            label: "Returned",
            value: resolved.length,
            icon: Undo2,
            tone: "bg-muted text-muted-foreground",
          },
          {
            label: "Total exceptions",
            value: needsAction.length + resolved.length,
            icon: Wrench,
            tone: "bg-chart-4/15 text-chart-4",
          },
        ]}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="NEEDS_ACTION">
            Needs action ({needsAction.length})
          </TabsTrigger>
          <TabsTrigger value="RESOLVED">
            Returned ({resolved.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={visible}
            getRowKey={(o) => o.id}
            initialSortId="order"
            searchable
            searchPlaceholder="Search code, merchant, rider, city"
            getSearchText={(o) =>
              `${o.code} ${merchantName(o.merchantId)} ${
                rider(o.deliveryRiderId)?.name ?? ""
              } ${o.deliveryCity} ${o.recipientName}`
            }
            emptyMessage={
              tab === "NEEDS_ACTION"
                ? "No failed deliveries. Parcels appear here when a delivery rider records a failed attempt."
                : "Nothing returned yet."
            }
          />
        </CardContent>
      </Card>

      <FailedDeliveryDialog
        order={activeOrder}
        merchantName={
          activeOrder
            ? (merchant(activeOrder.merchantId)?.businessName ?? "Merchant")
            : ""
        }
        riderName={
          activeOrder ? (rider(activeOrder.deliveryRiderId)?.name ?? "—") : ""
        }
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
