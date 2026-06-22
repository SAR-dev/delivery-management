"use client"

import { useMemo, useState } from "react"
import { Boxes, CheckCircle2, Clock, Truck, X } from "lucide-react"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { useOrders } from "@/features/orders/hooks/use-orders"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { useRiders } from "@/features/riders/hooks/use-riders"
import type { Order, OrderStatus } from "@/lib/types"
import { formatTk } from "@/lib/pricing"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge"
import { AddressModal } from "@/features/orders/components/address-modal"
import { TrackingTimeline } from "@/features/orders/components/tracking-timeline"
import { FormDialog } from "@/components/form-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { StatCardList } from "@/components/stat-card-list"

type FilterTab = "ALL" | "IN_PROGRESS" | "DELIVERED" | "EXCEPTIONS"

const EXCEPTION_STATUSES: OrderStatus[] = ["FAILED_ATTEMPT", "RETURNED"]
const IN_PROGRESS_STATUSES: OrderStatus[] = [
  "PICKED_UP",
  "IN_WAREHOUSE",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
]

export default function WarehouseOrdersPage() {
  const { currentUser } = useAuth()
  const { currentWarehouse, warehouses } = useWarehouses()
  const { orders } = useOrders()
  const { merchants } = useMerchants()
  const { riders } = useRiders()
  const [tab, setTab] = useState<FilterTab>("ALL")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const merchantName = (id: string) => merchant(id)?.businessName ?? "Merchant"
  const rider = (id?: string | null) =>
    id ? riders.find((r) => r.id === id) : undefined

  // The orders API already scopes the list to this warehouse's parcels (plus
  // picked-up parcels incoming to any hub), so no extra hub filter is needed.
  const inProgress = useMemo(
    () => orders.filter((o) => IN_PROGRESS_STATUSES.includes(o.status)),
    [orders],
  )
  const delivered = useMemo(
    () => orders.filter((o) => o.status === "DELIVERED"),
    [orders],
  )
  const exceptions = useMemo(
    () => orders.filter((o) => EXCEPTION_STATUSES.includes(o.status)),
    [orders],
  )
  const inWarehouse = useMemo(
    () => orders.filter((o) => o.status === "IN_WAREHOUSE"),
    [orders],
  )

  const visible = useMemo(() => {
    switch (tab) {
      case "IN_PROGRESS":
        return inProgress
      case "DELIVERED":
        return delivered
      case "EXCEPTIONS":
        return exceptions
      default:
        return orders
    }
  }, [tab, orders, inProgress, delivered, exceptions])

  function openOrder(order: Order) {
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
      id: "destination",
      header: "Destination",
      sortable: true,
      sortValue: (o) => o.deliveryCity,
      cell: (o) => (
        <AddressModal order={o}>
          <div className="flex flex-col">
            <span className="underline decoration-dotted underline-offset-4">
              {o.deliveryCity}
            </span>
            <span className="text-muted-foreground text-xs">
              {o.recipientName} · {o.recipientPhone}
            </span>
          </div>
        </AddressModal>
      ),
    },
    {
      id: "rider",
      header: "Delivery rider",
      sortable: true,
      sortValue: (o) => rider(o.deliveryRiderId)?.name ?? "",
      cell: (o) =>
        o.deliveryRiderId ? (
          <span className="text-sm">{rider(o.deliveryRiderId)?.name}</span>
        ) : (
          <span className="text-muted-foreground text-sm">Unassigned</span>
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
  ]

  const activeMerchant = activeOrder
    ? merchant(activeOrder.merchantId)
    : undefined
  const activeWarehouse = activeOrder
    ? warehouses.find((w) => w.id === activeOrder.warehouseId)
    : undefined

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={pageContent.warehouse.orders.title(
          currentUser?.name.split(" ")[0] ?? "Admin",
        )}
        description={pageContent.warehouse.orders.description(
          currentWarehouse?.name ?? "your warehouse",
        )}
      />

      <StatCardList
        columns={4}
        items={[
          {
            label: "Held in warehouse",
            value: inWarehouse.length,
            icon: Boxes,
            tone: "bg-chart-1/15 text-chart-1",
          },
          {
            label: "In progress",
            value: inProgress.length,
            icon: Clock,
            tone: "bg-primary/10 text-primary",
          },
          {
            label: "Delivered",
            value: delivered.length,
            icon: CheckCircle2,
            tone: "bg-chart-2/15 text-chart-2",
          },
          {
            label: "Exceptions",
            value: exceptions.length,
            icon: Truck,
            tone: "bg-chart-4/15 text-chart-4",
          },
        ]}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="ALL">All ({orders.length})</TabsTrigger>
          <TabsTrigger value="IN_PROGRESS">
            In progress ({inProgress.length})
          </TabsTrigger>
          <TabsTrigger value="DELIVERED">
            Delivered ({delivered.length})
          </TabsTrigger>
          <TabsTrigger value="EXCEPTIONS">
            Exceptions ({exceptions.length})
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
            emptyMessage="No orders to show for this view."
            onRowClick={openOrder}
          />
        </CardContent>
      </Card>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        size="lg"
        title={activeOrder ? activeOrder.code : "Order"}
        description={
          activeOrder
            ? `${merchantName(activeOrder.merchantId)} · ${activeOrder.deliveryCity}`
            : undefined
        }
        footer={
          <Button
            type="button"
            variant="outline"
            onClick={() => setDialogOpen(false)}
            className="w-full sm:w-auto"
          >
            <X className="size-4" />
            Close
          </Button>
        }
      >
        {activeOrder ? (
          <TrackingTimeline
            order={activeOrder}
            pickupRider={rider(activeOrder.pickupRiderId)}
            warehouse={activeWarehouse}
            deliveryRider={rider(activeOrder.deliveryRiderId)}
            merchant={activeMerchant}
          />
        ) : null}
      </FormDialog>
    </div>
  )
}
