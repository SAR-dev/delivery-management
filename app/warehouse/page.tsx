"use client"

import { useEffect, useMemo, useState } from "react"
import { Boxes, Clock, PackageOpen, PackagePlus } from "lucide-react"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { useOrders } from "@/features/orders/hooks/use-orders"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { useRiders } from "@/features/riders/hooks/use-riders"
import {
  orderCodeColumn,
  merchantColumn,
  receiverColumn,
  riderColumn,
  parcelColumn,
  deliveryAddressColumn,
  collectibleColumn,
  notesColumn,
  statusColumn,
} from "@/features/orders/components/order-table-columns"
import type { Order, OrderStatus } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { WarehouseReceiveDialog } from "@/features/orders/dialogs/warehouse-receive-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { StatCardList } from "@/components/stat-card-list"

type FilterTab = "INCOMING" | "RECEIVED"

const TAB_STATUSES: Record<FilterTab, OrderStatus[] | undefined> = {
  INCOMING: ["PICKED_UP"],
  RECEIVED: ["IN_WAREHOUSE", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"],
}

export default function WarehouseIntakePage() {
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
    sortId,
    sortDir,
    onSortChange,
    isLoading,
  } = useOrders()
  const { merchants } = useMerchants()
  const { riders } = useRiders()
  const [tab, setTab] = useState<FilterTab>("INCOMING")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const merchantName = (id: string) => merchant(id)?.businessName ?? "Merchant"
  const riderName = (id?: string | null) =>
    id ? (riders.find((r) => r.id === id)?.name ?? "—") : "—"
  const warehouseName = (id?: string | null) =>
    id ? (warehouses.find((w) => w.id === id)?.name ?? "—") : "—"

  useEffect(() => {
    setStatuses(TAB_STATUSES[tab])
    setPage(1)
  }, [tab, setStatuses, setPage])

  function getOrderSearchValue(o: Order, columnId: string): string | null {
    switch (columnId) {
      case "order":
        return o.code
      case "merchant":
        return merchantName(o.merchantId)
      case "receiver":
        return `${o.recipientName} ${o.recipientPhone}`
      case "pickupRider":
        return riderName(o.pickupRiderId)
      case "parcel":
        return `${o.parcelWeightKg} KG ${o.deliveryType}`
      case "warehouse":
        return warehouseName(o.warehouseId)
      case "city":
        return o.deliveryCity
      case "collectible":
        return String(o.totalCollectible)
      case "notes":
        return (
          [o.merchantNote, o.receiverNote].filter(Boolean).join(" ") || null
        )
      case "status":
        return o.status
      default:
        return null
    }
  }

  const incoming = useMemo(
    () => allOrders.filter((o) => o.status === "PICKED_UP"),
    [allOrders],
  )

  const received = useMemo(
    () =>
      currentWarehouse
        ? allOrders.filter(
            (o) =>
              o.warehouseId === currentWarehouse.id &&
              [
                "IN_WAREHOUSE",
                "IN_TRANSIT",
                "OUT_FOR_DELIVERY",
                "DELIVERED",
              ].includes(o.status),
          )
        : [],
    [allOrders, currentWarehouse],
  )

  function openConfirm(order: Order) {
    setActiveOrder(order)
    setDialogOpen(true)
  }

  const columns: DataTableColumn<Order>[] = [
    orderCodeColumn(),
    merchantColumn(merchantName),
    receiverColumn(),
    riderColumn("pickup", riderName, "Brought by"),
    parcelColumn(),
    deliveryAddressColumn(),
    collectibleColumn(),
    notesColumn(),
    statusColumn(),
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
        title={pageContent.warehouse.intake.title(
          currentUser?.name.split(" ")[0] ?? "Admin",
        )}
        description={pageContent.warehouse.intake.description(
          currentWarehouse?.name ?? "your warehouse",
        )}
      />

      <StatCardList
        items={[
          {
            label: "Incoming",
            value: incoming.length,
            icon: Clock,
            tone: "bg-chart-1/15 text-chart-1",
          },
          {
            label: "Received",
            value: received.length,
            icon: Boxes,
            tone: "bg-chart-2/15 text-chart-2",
          },
          {
            label: "Held in warehouse",
            value: received.filter((o) => o.status === "IN_WAREHOUSE").length,
            icon: PackageOpen,
            tone: "bg-primary/10 text-primary",
          },
        ]}
      />

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
            id="warehouse-intake"
            searchable
            getSearchValue={getOrderSearchValue}
            columns={columns}
            data={orders}
            getRowKey={(o) => o.id}
            initialSortId="order"
            loading={isLoading}
            emptyMessage={
              tab === "INCOMING"
                ? "No parcels incoming. Parcels appear here once a rider marks them picked up."
                : "Nothing received yet."
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

      <WarehouseReceiveDialog
        order={activeOrder}
        merchantName={
          activeOrder
            ? (merchant(activeOrder.merchantId)?.businessName ?? "Merchant")
            : ""
        }
        riderName={activeOrder ? riderName(activeOrder.pickupRiderId) : ""}
        warehouseName={currentWarehouse?.name ?? "your warehouse"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
