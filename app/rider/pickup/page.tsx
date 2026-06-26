"use client"

import { useMemo, useState } from "react"
import { PackageCheck } from "lucide-react"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useRiders } from "@/features/riders/hooks/use-riders"
import { useOrders } from "@/features/orders/hooks/use-orders"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { usePickupLocations } from "@/features/pickup-locations/hooks/use-pickup-locations"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge"
import { TrackingCell } from "@/features/orders/components/tracking-cell"
import { PickupConfirmDialog } from "@/features/orders/dialogs/pickup-confirm-dialog"
import { PickupLocationModal } from "@/features/pickup-locations/components/pickup-location-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable, type DataTableColumn } from "@/components/data-table"

const COLLECTED_STATUSES = [
  "PICKED_UP",
  "IN_WAREHOUSE",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
]

type FilterTab = "TO_COLLECT" | "COLLECTED"

export default function RiderPickupQueuePage() {
  const { currentUser } = useAuth()
  const { currentRider } = useRiders()
  const { orders, allOrders } = useOrders()
  const { merchants } = useMerchants()
  const { pickupLocations } = usePickupLocations()
  const { warehouses } = useWarehouses()
  const [tab, setTab] = useState<FilterTab>("TO_COLLECT")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const merchantName = (id: string) => merchant(id)?.businessName ?? "Merchant"
  const pickup = (id: string) => pickupLocations.find((p) => p.id === id)
  const warehouseName = (id?: string | null) =>
    id ? (warehouses.find((w) => w.id === id)?.name ?? "—") : "—"

  // All orders assigned to this rider for pickup. Tab counts use the
  // unfiltered list; the table-facing versions below use the
  // search-narrowed `orders`.
  const myPickups = useMemo(
    () =>
      currentRider
        ? allOrders.filter((o) => o.pickupRiderId === currentRider.id)
        : [],
    [allOrders, currentRider],
  )

  const toCollect = myPickups.filter((o) => o.status === "APPROVED")
  const collected = myPickups.filter((o) =>
    COLLECTED_STATUSES.includes(o.status),
  )

  const visibleMyPickups = useMemo(
    () =>
      currentRider
        ? orders.filter((o) => o.pickupRiderId === currentRider.id)
        : [],
    [orders, currentRider],
  )
  const visibleToCollect = visibleMyPickups.filter(
    (o) => o.status === "APPROVED",
  )
  const visibleCollected = visibleMyPickups.filter((o) =>
    COLLECTED_STATUSES.includes(o.status),
  )

  const visible = tab === "TO_COLLECT" ? visibleToCollect : visibleCollected

  function openConfirm(order: Order) {
    setActiveOrder(order)
    setDialogOpen(true)
  }

  // Pickup is a merchant-facing step — the rider only needs to know who
  // they're collecting from and where. Recipient/delivery details aren't
  // relevant yet, so they're left off this view entirely.
  const columns: DataTableColumn<Order>[] = [
    {
      id: "order",
      header: "Order",
      sortable: true,
      sortValue: (o) => o.code,
      cell: (o) => <TrackingCell code={o.code} />,
    },
    {
      id: "merchant",
      header: "Merchant",
      sortable: true,
      sortValue: (o) => merchantName(o.merchantId),
      cell: (o) => {
        const m = merchant(o.merchantId)
        return (
          <div className="flex flex-col">
            <span className="font-medium">{m?.businessName ?? "Merchant"}</span>
            <span className="text-muted-foreground text-xs">{m?.phone}</span>
          </div>
        )
      },
    },
    {
      id: "pickup",
      header: "Pickup from",
      sortable: true,
      sortValue: (o) => pickup(o.pickupLocationId)?.label ?? "",
      cell: (o) => {
        const p = pickup(o.pickupLocationId)
        return (
          <PickupLocationModal location={p ?? null}>
            <div className="flex flex-col">
              <span className="font-medium underline decoration-dotted underline-offset-4">
                {p?.label ?? "—"}
              </span>
              <span className="text-muted-foreground text-xs">
                {p?.address ?? "—"}
              </span>
            </div>
          </PickupLocationModal>
        )
      },
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
      id: "warehouse",
      header: "Warehouse",
      sortable: true,
      sortValue: (o) => warehouseName(o.warehouseId),
      cell: (o) => (
        <span className="text-sm">{warehouseName(o.warehouseId)}</span>
      ),
    },
    {
      id: "city",
      header: "City",
      sortable: true,
      sortValue: (o) => o.deliveryCity,
      cell: (o) => <span className="text-sm">{o.deliveryCity}</span>,
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
        title={pageContent.rider.pickup.title(
          currentUser?.name.split(" ")[0] ?? "Rider",
        )}
        description={pageContent.rider.pickup.description}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            id="rider-pickup"
            searchable
            columns={columns}
            data={visible}
            getRowKey={(o) => o.id}
            initialSortId="order"
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
        pickupLocation={
          activeOrder ? (pickup(activeOrder.pickupLocationId) ?? null) : null
        }
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
