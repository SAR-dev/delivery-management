"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Navigation } from "lucide-react"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useRiders } from "@/features/riders/hooks/use-riders"
import { useOrders } from "@/features/orders/hooks/use-orders"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge"
import { TrackingCell } from "@/features/orders/components/tracking-cell"
import { AddressModal } from "@/features/orders/components/address-modal"
import { DeliveryAttemptDialog } from "@/features/orders/dialogs/delivery-attempt-dialog"
import { OutForDeliveryDialog } from "@/features/orders/dialogs/out-for-delivery-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable, type DataTableColumn } from "@/components/data-table"

const TO_DELIVER_STATUSES = ["IN_TRANSIT", "OUT_FOR_DELIVERY"]
const COMPLETED_STATUSES = [
  "DELIVERED",
  "FAILED_ATTEMPT",
  "RETURNED",
  "CANCELLED",
]

type FilterTab = "TO_DELIVER" | "COMPLETED"

export default function RiderDeliveryQueuePage() {
  const { currentUser } = useAuth()
  const { currentRider } = useRiders()
  const {
    orders,
    allOrders,
    statuses: _statuses,
    setStatuses,
    total,
    page: _page,
    setPage,
    limit: _limit,
    setLimit,
    query,
    setQuery,
    sortId,
    sortDir,
    onSortChange,
    isLoading,
  } = useOrders()
  const { warehouses } = useWarehouses()
  const [tab, setTab] = useState<FilterTab>("TO_DELIVER")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [startTarget, setStartTarget] = useState<Order | null>(null)
  const [startDialogOpen, setStartDialogOpen] = useState(false)

  useEffect(() => {
    if (tab === "TO_DELIVER") {
      setStatuses(TO_DELIVER_STATUSES)
    } else {
      setStatuses(COMPLETED_STATUSES)
    }
    setPage(1)
  }, [tab, setStatuses, setPage])

  const warehouseName = (id?: string | null) =>
    id ? (warehouses.find((w) => w.id === id)?.name ?? "—") : "—"

  // All orders dispatched to this rider for delivery. Tab counts use the
  // unfiltered list; the table-facing versions below use the
  // search-narrowed `orders`.
  const myDeliveries = useMemo(
    () =>
      currentRider
        ? allOrders.filter((o) => o.deliveryRiderId === currentRider.id)
        : [],
    [allOrders, currentRider],
  )

  const toDeliver = myDeliveries.filter((o) =>
    TO_DELIVER_STATUSES.includes(o.status),
  )
  const completed = myDeliveries.filter((o) =>
    COMPLETED_STATUSES.includes(o.status),
  )

  function openAttempt(order: Order) {
    setActiveOrder(order)
    setDialogOpen(true)
  }

  function openStartDelivery(order: Order) {
    setStartTarget(order)
    setStartDialogOpen(true)
  }

  // Delivery is a recipient-facing step — the rider only needs to know who
  // they're delivering to and where. Merchant/pickup details aren't
  // relevant anymore, so they're left off this view entirely.
  const columns: DataTableColumn<Order>[] = [
    {
      id: "order",
      header: "Order",
      sortable: true,
      sortValue: (o) => o.code,
      cell: (o) => <TrackingCell code={o.code} />,
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
      id: "warehouse",
      header: "Warehouse",
      cell: (o) => (
        <span className="text-sm">{warehouseName(o.warehouseId)}</span>
      ),
    },
    {
      id: "city",
      header: "City",
      sortable: true,
      sortValue: (o) => o.deliveryCity,
      cell: (o) => (
        <AddressModal order={o}>
          <div className="flex flex-col">
            <span className="underline decoration-dotted underline-offset-4">
              {o.deliveryCity}
            </span>
            <span className="text-muted-foreground text-xs">
              {o.deliveryAddress}
            </span>
          </div>
        </AddressModal>
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
      cell: (o) => <OrderStatusBadge status={o.status} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      headClassName: "w-12",
      cell: (o) =>
        o.status === "IN_TRANSIT" ? (
          <Button size="sm" onClick={() => openStartDelivery(o)}>
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
        title={pageContent.rider.delivery.title(
          currentUser?.name.split(" ")[0] ?? "Rider",
        )}
        description={pageContent.rider.delivery.description}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            id="rider-delivery"
            searchable
            columns={columns}
            data={orders}
            getRowKey={(o) => o.id}
            initialSortId="order"
            loading={isLoading}
            emptyMessage={
              tab === "TO_DELIVER"
                ? "No deliveries waiting. Parcels appear here once a Warehouse Admin dispatches them to you."
                : "Nothing completed yet."
            }
            serverPaginated
            total={total}
            query={query}
            onQueryChange={setQuery}
            onPageChange={(p, l) => {
              setPage(p)
              setLimit(l)
            }}
            serverSortId={sortId}
            serverSortDir={sortDir}
            onSortChange={onSortChange}
          />
        </CardContent>
      </Card>

      <OutForDeliveryDialog
        order={startTarget}
        open={startDialogOpen}
        onOpenChange={setStartDialogOpen}
      />

      <DeliveryAttemptDialog
        order={activeOrder}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
