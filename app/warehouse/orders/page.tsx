"use client"

import { useMemo, useState } from "react"
import { Ban, Boxes, CheckCircle2, Clock, Truck, X } from "lucide-react"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { useOrders } from "@/features/orders/hooks/use-orders"
import { useOrderColumns } from "@/features/orders/components/order-table-columns"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { useRiders } from "@/features/riders/hooks/use-riders"
import type { Order, OrderStatus } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { TrackingTimeline } from "@/features/orders/components/tracking-timeline"
import { CancelOrderDialog } from "@/features/orders/dialogs/cancel-order-dialog"
import { FormDialog } from "@/components/form-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchInput } from "@/components/search-input"
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
  const { orders, allOrders, query, setQuery } = useOrders()
  const baseColumns = useOrderColumns()
  const { merchants } = useMerchants()
  const { riders } = useRiders()
  const [tab, setTab] = useState<FilterTab>("ALL")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const merchantName = (id: string) => merchant(id)?.businessName ?? "Merchant"
  const rider = (id?: string | null) =>
    id ? riders.find((r) => r.id === id) : undefined

  // The orders API already scopes the list to this warehouse's parcels (plus
  // picked-up parcels incoming to any hub), so no extra hub filter is needed.
  // Stats and tab counts use the unfiltered (but still warehouse-scoped)
  // `allOrders`; the table itself uses the search-narrowed `orders`.
  const inProgress = useMemo(
    () => allOrders.filter((o) => IN_PROGRESS_STATUSES.includes(o.status)),
    [allOrders],
  )
  const delivered = useMemo(
    () => allOrders.filter((o) => o.status === "DELIVERED"),
    [allOrders],
  )
  const exceptions = useMemo(
    () => allOrders.filter((o) => EXCEPTION_STATUSES.includes(o.status)),
    [allOrders],
  )
  const inWarehouse = useMemo(
    () => allOrders.filter((o) => o.status === "IN_WAREHOUSE"),
    [allOrders],
  )

  const visible = useMemo(() => {
    switch (tab) {
      case "IN_PROGRESS":
        return orders.filter((o) => IN_PROGRESS_STATUSES.includes(o.status))
      case "DELIVERED":
        return orders.filter((o) => o.status === "DELIVERED")
      case "EXCEPTIONS":
        return orders.filter((o) => EXCEPTION_STATUSES.includes(o.status))
      default:
        return orders
    }
  }, [tab, orders])

  function openOrder(order: Order) {
    setActiveOrder(order)
    setDialogOpen(true)
  }

  const columns: DataTableColumn<Order>[] = [
    ...baseColumns,
    {
      id: "actions",
      header: "",
      cell: (o) => {
        const canCancel = [
          "PENDING",
          "APPROVED",
          "PICKED_UP",
          "IN_WAREHOUSE",
          "IN_TRANSIT",
        ].includes(o.status)
        if (!canCancel) return null
        return (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation()
              setCancelTarget(o)
              setCancelOpen(true)
            }}
          >
            <Ban className="size-3.5" />
            Cancel
          </Button>
        )
      },
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
          <TabsList>
            <TabsTrigger value="ALL">All ({allOrders.length})</TabsTrigger>
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
        <SearchInput
          placeholder="Search code, recipient, phone, city"
          value={query}
          onChange={setQuery}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={visible}
            getRowKey={(o) => o.id}
            initialSortId="order"
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
