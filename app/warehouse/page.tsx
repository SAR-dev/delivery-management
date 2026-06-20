"use client"

import { useMemo, useState } from "react"
import {
  PackagePlus,
  PackageOpen,
  Bike,
  Boxes,
  Clock,
} from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { OrderStatusBadge } from "@/components/badge/order-status-badge"
import { WarehouseReceiveDialog } from "@/components/dialog/warehouse-receive-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable, type DataTableColumn } from "@/components/data-table"

type FilterTab = "INCOMING" | "RECEIVED"

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

export default function WarehouseIntakePage() {
  const { currentUser, currentWarehouse, orders, merchants, riders } =
    usePlatform()
  const [tab, setTab] = useState<FilterTab>("INCOMING")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const merchantName = (id: string) => merchant(id)?.businessName ?? "Merchant"
  const rider = (id?: string | null) =>
    id ? riders.find((r) => r.id === id) : undefined

  // Parcels that have been picked up and are heading to a warehouse. In this
  // mock, all PICKED_UP parcels are incoming to whichever warehouse logs them.
  const incoming = useMemo(
    () => orders.filter((o) => o.status === "PICKED_UP"),
    [orders],
  )

  // Parcels this warehouse has already received.
  const received = useMemo(
    () =>
      currentWarehouse
        ? orders.filter(
            (o) =>
              o.warehouseId === currentWarehouse.id &&
              ["IN_WAREHOUSE", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
                o.status,
              ),
          )
        : [],
    [orders, currentWarehouse],
  )

  const visible = tab === "INCOMING" ? incoming : received

  function openConfirm(order: Order) {
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
      header: "Brought by",
      sortable: true,
      sortValue: (o) => rider(o.pickupRiderId)?.name ?? "",
      cell: (o) => (
        <span className="flex items-center gap-1.5 text-sm">
          <Bike className="size-4 text-muted-foreground" />
          {rider(o.pickupRiderId)?.name ?? "—"}
        </span>
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
        o.status === "PICKED_UP" ? (
          <Button size="sm" onClick={() => openConfirm(o)}>
            <PackagePlus className="size-4" />
            Receive
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Warehouse intake, ${currentUser?.name.split(" ")[0] ?? "Admin"}`}
        description={`Receive picked-up parcels into ${
          currentWarehouse?.name ?? "your warehouse"
        } and log them in.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Incoming"
          value={incoming.length}
          icon={Clock}
          tone="bg-chart-1/15 text-chart-1"
        />
        <StatCard
          label="Received"
          value={received.length}
          icon={Boxes}
          tone="bg-chart-2/15 text-chart-2"
        />
        <StatCard
          label="Held in warehouse"
          value={received.filter((o) => o.status === "IN_WAREHOUSE").length}
          icon={PackageOpen}
          tone="bg-primary/10 text-primary"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="INCOMING">
            Incoming ({incoming.length})
          </TabsTrigger>
          <TabsTrigger value="RECEIVED">
            Received ({received.length})
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
                rider(o.pickupRiderId)?.name ?? ""
              } ${o.deliveryCity} ${o.recipientName}`
            }
            emptyMessage={
              tab === "INCOMING"
                ? "No parcels incoming. Parcels appear here once a rider marks them picked up."
                : "Nothing received yet."
            }
          />
        </CardContent>
      </Card>

      <WarehouseReceiveDialog
        order={activeOrder}
        merchantName={
          activeOrder
            ? (merchant(activeOrder.merchantId)?.businessName ?? "Merchant")
            : ""
        }
        riderName={
          activeOrder ? (rider(activeOrder.pickupRiderId)?.name ?? "—") : ""
        }
        warehouseName={currentWarehouse?.name ?? "your warehouse"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
