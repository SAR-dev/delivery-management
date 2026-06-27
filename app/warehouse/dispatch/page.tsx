"use client"

import { useEffect, useMemo, useState } from "react"
import { Bike, PackageOpen, Send, Truck } from "lucide-react"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { useOrders } from "@/features/orders/hooks/use-orders"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { useRiders } from "@/features/riders/hooks/use-riders"
import { formatTk } from "@/lib/pricing"
import type { Order, OrderStatus } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge"
import { AddressModal } from "@/features/orders/components/address-modal"
import { WarehouseDispatchDialog } from "@/features/orders/dialogs/warehouse-dispatch-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { StatCardList } from "@/components/stat-card-list"

type FilterTab = "READY" | "DISPATCHED"

const TAB_STATUSES: Record<FilterTab, OrderStatus[] | undefined> = {
  READY: ["IN_WAREHOUSE"],
  DISPATCHED: ["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"],
}

export default function WarehouseDispatchPage() {
  const { currentUser } = useAuth()
  const { currentWarehouse, warehouses } = useWarehouses()
  const {
    orders,
    allOrders,
    total,
    page: _page,
    setPage,
    limit: _limit,
    setLimit,
    query,
    setQuery,
    statuses: _statuses,
    setStatuses,
    isLoading,
  } = useOrders()
  const { merchants } = useMerchants()
  const { riders, warehouseDeliveryRiders } = useRiders()
  const [tab, setTab] = useState<FilterTab>("READY")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const merchantName = (id: string) => merchant(id)?.businessName ?? "Merchant"
  const rider = (id?: string | null) =>
    id ? riders.find((r) => r.id === id) : undefined
  const warehouseName = (id?: string | null) =>
    id ? (warehouses.find((w) => w.id === id)?.name ?? "—") : "—"

  useEffect(() => {
    setStatuses(TAB_STATUSES[tab])
    setPage(1)
  }, [tab, setStatuses, setPage])

  // Parcels held in this warehouse, awaiting a delivery rider. Stats and tab
  // counts come from the unfiltered `allOrders`; the table-facing versions
  // below use the search-narrowed `orders`.
  const ready = useMemo(
    () =>
      currentWarehouse
        ? allOrders.filter(
            (o) =>
              o.status === "IN_WAREHOUSE" &&
              o.warehouseId === currentWarehouse.id,
          )
        : [],
    [allOrders, currentWarehouse],
  )

  // Parcels this warehouse has already dispatched for delivery.
  const dispatched = useMemo(
    () =>
      currentWarehouse
        ? allOrders.filter(
            (o) =>
              o.warehouseId === currentWarehouse.id &&
              o.deliveryRiderId != null &&
              ["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
                o.status,
              ),
          )
        : [],
    [allOrders, currentWarehouse],
  )

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
      cell: (o) =>
        o.deliveryRiderId ? (
          <span className="flex items-center gap-1.5 text-sm">
            <Bike className="text-muted-foreground size-4" />
            {rider(o.deliveryRiderId)?.name ?? "—"}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">Unassigned</span>
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
        title={pageContent.warehouse.dispatch.title(
          currentUser?.name.split(" ")[0] ?? "Admin",
        )}
        description={pageContent.warehouse.dispatch.description(
          currentWarehouse?.name ?? "your warehouse",
        )}
      />

      <StatCardList
        items={[
          {
            label: "Ready to dispatch",
            value: ready.length,
            icon: PackageOpen,
            tone: "bg-chart-1/15 text-chart-1",
          },
          {
            label: "Dispatched",
            value: dispatched.length,
            icon: Truck,
            tone: "bg-chart-4/15 text-chart-4",
          },
          {
            label: "Available riders",
            value: warehouseDeliveryRiders.length,
            icon: Bike,
            tone: "bg-chart-2/15 text-chart-2",
          },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            id="warehouse-dispatch"
            searchable
            columns={columns}
            data={orders}
            getRowKey={(o) => o.id}
            initialSortId="order"
            loading={isLoading}
            emptyMessage={
              tab === "READY"
                ? "Nothing ready to dispatch. Parcels appear here once they're received into the warehouse."
                : "Nothing dispatched yet."
            }
            serverPaginated
            total={total}
            query={query}
            onQueryChange={setQuery}
            onPageChange={(p, l) => {
              setPage(p)
              setLimit(l)
            }}
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
