"use client"

import { useMemo, useState } from "react"
import { PackageOpen, CheckCircle2, Clock, Navigation } from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { OrderStatusBadge } from "@/components/badge/order-status-badge"
import { DeliveryAttemptDialog } from "@/components/dialog/delivery-attempt-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { toast } from "sonner"
import { StatCardList } from "@/components/stat-card-list"

type FilterTab = "TO_DELIVER" | "COMPLETED"

export default function RiderDeliveryQueuePage() {
  const { currentUser, currentRider, orders, merchants, markOutForDelivery } =
    usePlatform()
  const [tab, setTab] = useState<FilterTab>("TO_DELIVER")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const merchantName = (id: string) => merchant(id)?.businessName ?? "Merchant"

  // All orders dispatched to this rider for delivery.
  const myDeliveries = useMemo(
    () =>
      currentRider
        ? orders.filter((o) => o.deliveryRiderId === currentRider.id)
        : [],
    [orders, currentRider],
  )

  const toDeliver = myDeliveries.filter((o) =>
    ["IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(o.status),
  )
  const completed = myDeliveries.filter((o) =>
    ["DELIVERED", "FAILED_ATTEMPT", "RETURNED"].includes(o.status),
  )

  const visible = tab === "TO_DELIVER" ? toDeliver : completed

  function openAttempt(order: Order) {
    setActiveOrder(order)
    setDialogOpen(true)
  }

  async function startDelivery(order: Order) {
    const result = await markOutForDelivery(order.id)
    if (result.ok) {
      toast.success(`${order.code} is now out for delivery.`)
    } else {
      toast.error(result.error ?? "Unable to start delivery.")
    }
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
      id: "recipient",
      header: "Recipient",
      sortable: true,
      sortValue: (o) => o.recipientName,
      cell: (o) => (
        <div className="flex flex-col">
          <span className="font-medium">{o.recipientName}</span>
          <span className="text-muted-foreground text-xs">
            {o.recipientPhone}
          </span>
        </div>
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
            {o.deliveryAddress}
          </span>
        </div>
      ),
    },
    {
      id: "parcel",
      header: "Parcel",
      cell: (o) => (
        <span className="text-muted-foreground text-sm">
          {o.parcelWeightKg} KG · {o.deliveryType}
        </span>
      ),
    },
    {
      id: "collectible",
      header: "Collect",
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
      cell: (o) => (
        <div className="flex flex-col gap-1">
          <OrderStatusBadge status={o.status} />
          {o.status === "FAILED_ATTEMPT" && o.failureNote ? (
            <span className="text-destructive max-w-48 text-xs">
              {o.failureNote}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      headClassName: "w-12",
      cell: (o) =>
        o.status === "IN_TRANSIT" ? (
          <Button size="sm" onClick={() => startDelivery(o)}>
            <Navigation className="size-4" />
            Out for delivery
          </Button>
        ) : o.status === "OUT_FOR_DELIVERY" ? (
          <Button size="sm" onClick={() => openAttempt(o)}>
            <CheckCircle2 className="size-4" />
            Record outcome
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Delivery queue, ${currentUser?.name.split(" ")[0] ?? "Rider"}`}
        description="Take dispatched parcels out for delivery and record the outcome."
      />

      <StatCardList
        items={[
          {
            label: "To deliver",
            value: toDeliver.length,
            icon: Clock,
            tone: "bg-chart-4/15 text-chart-4",
          },
          {
            label: "Completed",
            value: completed.length,
            icon: CheckCircle2,
            tone: "bg-chart-2/15 text-chart-2",
          },
          {
            label: "Total assigned",
            value: myDeliveries.length,
            icon: PackageOpen,
            tone: "bg-primary/10 text-primary",
          },
        ]}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="TO_DELIVER">
            To deliver ({toDeliver.length})
          </TabsTrigger>
          <TabsTrigger value="COMPLETED">
            Completed ({completed.length})
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
            searchPlaceholder="Search code, merchant, recipient, city"
            getSearchText={(o) =>
              `${o.code} ${merchantName(o.merchantId)} ${o.recipientName} ${o.deliveryCity} ${o.deliveryAddress}`
            }
            emptyMessage={
              tab === "TO_DELIVER"
                ? "No deliveries waiting. Parcels appear here once a Warehouse Admin dispatches them to you."
                : "Nothing completed yet."
            }
          />
        </CardContent>
      </Card>

      <DeliveryAttemptDialog
        order={activeOrder}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
