"use client"

import { useMemo, useState } from "react"
import { Truck, PackageOpen, Bike, Send } from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { OrderStatusBadge } from "@/components/badge/order-status-badge"
import { WarehouseDispatchDialog } from "@/components/dialog/warehouse-dispatch-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable, type DataTableColumn } from "@/components/data-table"

type FilterTab = "READY" | "DISPATCHED"

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  tone: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex size-11 items-center justify-center rounded-lg ${tone}`}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function WarehouseDispatchPage() {
  const {
    currentUser,
    currentWarehouse,
    orders,
    merchants,
    riders,
    warehouseDeliveryRiders,
  } = usePlatform()
  const [tab, setTab] = useState<FilterTab>("READY")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const merchantName = (id: string) => merchant(id)?.businessName ?? "Merchant"
  const rider = (id?: string | null) =>
    id ? riders.find((r) => r.id === id) : undefined

  // Parcels held in this warehouse, awaiting a delivery rider.
  const ready = useMemo(
    () =>
      currentWarehouse
        ? orders.filter(
            (o) =>
              o.status === "IN_WAREHOUSE" &&
              o.warehouseId === currentWarehouse.id,
          )
        : [],
    [orders, currentWarehouse],
  )

  // Parcels this warehouse has already dispatched for delivery.
  const dispatched = useMemo(
    () =>
      currentWarehouse
        ? orders.filter(
            (o) =>
              o.warehouseId === currentWarehouse.id &&
              o.deliveryRiderId != null &&
              ["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(o.status),
          )
        : [],
    [orders, currentWarehouse],
  )

  const visible = tab === "READY" ? ready : dispatched

  function openDispatch(order: Order) {
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
          <span className="font-mono text-xs text-muted-foreground">
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
      cell: (o) =>
        o.deliveryRiderId ? (
          <span className="flex items-center gap-1.5 text-sm">
            <Bike className="size-4 text-muted-foreground" />
            {rider(o.deliveryRiderId)?.name ?? "—"}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Unassigned</span>
        ),
    },
    {
      id: "parcel",
      header: "Parcel",
      cell: (o) => (
        <span className="text-sm text-muted-foreground">
          {o.parcelWeightKg} KG · {o.deliveryType}
        </span>
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
          <span className="text-xs text-muted-foreground">
            {o.recipientName} · {o.recipientPhone}
          </span>
        </div>
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
        o.status === "IN_WAREHOUSE" ? (
          <Button size="sm" onClick={() => openDispatch(o)}>
            <Send className="size-4" />
            Assign rider
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Dispatch desk, ${currentUser?.name.split(" ")[0] ?? "Admin"}`}
        description={`Assign delivery riders to parcels held in ${
          currentWarehouse?.name ?? "your warehouse"
        } and send them out for delivery.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Ready to dispatch"
          value={ready.length}
          icon={PackageOpen}
          tone="bg-chart-1/15 text-chart-1"
        />
        <StatCard
          label="Dispatched"
          value={dispatched.length}
          icon={Truck}
          tone="bg-chart-4/15 text-chart-4"
        />
        <StatCard
          label="Available riders"
          value={warehouseDeliveryRiders.length}
          icon={Bike}
          tone="bg-chart-2/15 text-chart-2"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="READY">
            Ready to dispatch ({ready.length})
          </TabsTrigger>
          <TabsTrigger value="DISPATCHED">
            Dispatched ({dispatched.length})
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
              tab === "READY"
                ? "Nothing ready to dispatch. Parcels appear here once they're received into the warehouse."
                : "Nothing dispatched yet."
            }
          />
        </CardContent>
      </Card>

      <WarehouseDispatchDialog
        order={activeOrder}
        merchantName={
          activeOrder
            ? (merchant(activeOrder.merchantId)?.businessName ?? "Merchant")
            : ""
        }
        warehouseName={currentWarehouse?.name ?? "your warehouse"}
        deliveryRiders={warehouseDeliveryRiders}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
