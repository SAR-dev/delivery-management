"use client"

import { useMemo, useState } from "react"
import {
  PackageCheck,
  PackageOpen,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { OrderStatusBadge } from "@/components/badge/order-status-badge"
import { PickupConfirmDialog } from "@/components/dialog/pickup-confirm-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable, type DataTableColumn } from "@/components/data-table"

type FilterTab = "TO_COLLECT" | "COLLECTED"

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

export default function RiderPickupQueuePage() {
  const { currentUser, currentRider, orders, merchants, pickupLocations } =
    usePlatform()
  const [tab, setTab] = useState<FilterTab>("TO_COLLECT")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const merchantName = (id: string) => merchant(id)?.businessName ?? "Merchant"
  const pickup = (id: string) => pickupLocations.find((p) => p.id === id)

  // All orders assigned to this rider for pickup.
  const myPickups = useMemo(
    () =>
      currentRider
        ? orders.filter((o) => o.pickupRiderId === currentRider.id)
        : [],
    [orders, currentRider],
  )

  const toCollect = myPickups.filter((o) => o.status === "APPROVED")
  const collected = myPickups.filter((o) =>
    ["PICKED_UP", "IN_WAREHOUSE", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
      o.status,
    ),
  )

  const visible = tab === "TO_COLLECT" ? toCollect : collected

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
      id: "pickup",
      header: "Pickup from",
      sortable: true,
      sortValue: (o) => pickup(o.pickupLocationId)?.label ?? "",
      cell: (o) => {
        const p = pickup(o.pickupLocationId)
        return (
          <div className="flex flex-col">
            <span className="font-medium">{p?.label ?? "—"}</span>
            <span className="text-xs text-muted-foreground">
              {p?.address ?? "—"}
            </span>
          </div>
        )
      },
    },
    {
      id: "parcel",
      header: "Parcel",
      cell: (o) => (
        <span className="text-sm text-muted-foreground">
          {o.parcelWeightKg} KG · {o.deliveryType} · to {o.deliveryCity}
        </span>
      ),
    },
    {
      id: "recipient",
      header: "Recipient",
      sortable: true,
      sortValue: (o) => o.recipientName,
      cell: (o) => (
        <div className="flex flex-col">
          <span>{o.recipientName}</span>
          <span className="text-xs text-muted-foreground">
            {o.recipientPhone}
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
        o.status === "APPROVED" ? (
          <Button size="sm" onClick={() => openConfirm(o)}>
            <PackageCheck className="size-4" />
            Mark picked up
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Pickup queue, ${currentUser?.name.split(" ")[0] ?? "Rider"}`}
        description="Collect approved parcels from merchants and mark them picked up."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="To collect"
          value={toCollect.length}
          icon={Clock}
          tone="bg-chart-1/15 text-chart-1"
        />
        <StatCard
          label="Collected"
          value={collected.length}
          icon={CheckCircle2}
          tone="bg-chart-2/15 text-chart-2"
        />
        <StatCard
          label="Total assigned"
          value={myPickups.length}
          icon={PackageOpen}
          tone="bg-primary/10 text-primary"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="TO_COLLECT">
            To collect ({toCollect.length})
          </TabsTrigger>
          <TabsTrigger value="COLLECTED">
            Collected ({collected.length})
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
            searchPlaceholder="Search code, merchant, recipient, pickup"
            getSearchText={(o) =>
              `${o.code} ${merchantName(o.merchantId)} ${o.recipientName} ${
                pickup(o.pickupLocationId)?.label ?? ""
              } ${o.deliveryCity}`
            }
            emptyMessage={
              tab === "TO_COLLECT"
                ? "No pickups waiting. New pickups appear here once an Admin assigns them to you."
                : "Nothing collected yet."
            }
          />
        </CardContent>
      </Card>

      <PickupConfirmDialog
        order={activeOrder}
        merchantName={
          activeOrder
            ? (merchant(activeOrder.merchantId)?.businessName ?? "Merchant")
            : ""
        }
        pickupLabel={
          activeOrder ? (pickup(activeOrder.pickupLocationId)?.label ?? "—") : ""
        }
        pickupAddress={
          activeOrder
            ? (pickup(activeOrder.pickupLocationId)?.address ?? "—")
            : ""
        }
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
