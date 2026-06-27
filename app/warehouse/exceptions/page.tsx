"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, RotateCcw, Undo2, Wrench } from "lucide-react"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { useOrders } from "@/features/orders/hooks/use-orders"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { useRiders } from "@/features/riders/hooks/use-riders"
import { formatTk } from "@/lib/pricing"
import {
  orderCodeColumn,
  riderColumn,
  deliveryAddressColumn,
  collectibleColumn,
  statusColumn,
} from "@/features/orders/components/order-table-columns"
import type { Order, OrderStatus } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { FailedDeliveryDialog } from "@/features/orders/dialogs/failed-delivery-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { StatCardList } from "@/components/stat-card-list"

type FilterTab = "NEEDS_ACTION" | "RESOLVED"

const TAB_STATUSES: Record<FilterTab, OrderStatus[] | undefined> = {
  NEEDS_ACTION: ["FAILED_ATTEMPT"],
  RESOLVED: ["RETURNED"],
}

export default function WarehouseExceptionsPage() {
  const { currentUser } = useAuth()
  const { currentWarehouse } = useWarehouses()
  const {
    orders,
    allOrders,
    warehouseFailedOrders,
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
  const [tab, setTab] = useState<FilterTab>("NEEDS_ACTION")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const merchantName = (id: string) => merchant(id)?.businessName ?? "Merchant"
  const riderName = (id?: string | null) =>
    id ? (riders.find((r) => r.id === id)?.name ?? "—") : "—"

  useEffect(() => {
    setStatuses(TAB_STATUSES[tab])
    setPage(1)
  }, [tab, setStatuses, setPage])

  const needsAction = warehouseFailedOrders

  const resolved = useMemo(
    () =>
      currentWarehouse
        ? allOrders.filter(
            (o) =>
              o.warehouseId === currentWarehouse.id && o.status === "RETURNED",
          )
        : [],
    [allOrders, currentWarehouse],
  )

  function openResolve(order: Order) {
    setActiveOrder(order)
    setDialogOpen(true)
  }

  const columns: DataTableColumn<Order>[] = [
    // Exceptions show merchant name as the subtitle below the code.
    orderCodeColumn({ subtitle: "merchant", merchantName }),
    riderColumn("delivery", riderName, "Delivery rider"),
    deliveryAddressColumn(),
    {
      id: "attempts",
      header: "Attempts",
      align: "center",
      sortable: true,
      sortValue: (o) => o.deliveryAttempts ?? 1,
      cell: (o) => (
        <span className="tabular-nums">{o.deliveryAttempts ?? 1}</span>
      ),
    },
    {
      id: "note",
      header: "Resolution",
      cellClassName: "whitespace-normal align-top",
      cell: (o) =>
        o.status === "RETURNED" ? (
          <span className="text-muted-foreground block w-56 text-xs break-words whitespace-normal">
            Returned by {o.failedResolvedBy ?? "Warehouse Admin"}
            {o.returnReason ? ` — ${o.returnReason}` : ""}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            See order details for attempt history
          </span>
        ),
    },
    collectibleColumn(),
    statusColumn(),
    {
      id: "actions",
      header: "",
      align: "right",
      headClassName: "w-12",
      cell: (o) =>
        o.status === "FAILED_ATTEMPT" ? (
          <Button size="sm" onClick={() => openResolve(o)}>
            <RotateCcw className="size-4" />
            Resolve
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={pageContent.warehouse.exceptions.title(
          currentUser?.name.split(" ")[0] ?? "Admin",
        )}
        description={pageContent.warehouse.exceptions.description(
          currentWarehouse?.name ?? "your warehouse",
        )}
      />

      <StatCardList
        items={[
          {
            label: "Needs action",
            value: needsAction.length,
            icon: AlertTriangle,
            tone: "bg-destructive/10 text-destructive",
          },
          {
            label: "Returned",
            value: resolved.length,
            icon: Undo2,
            tone: "bg-muted text-muted-foreground",
          },
          {
            label: "Total exceptions",
            value: needsAction.length + resolved.length,
            icon: Wrench,
            tone: "bg-chart-4/15 text-chart-4",
          },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
          <TabsList>
            <TabsTrigger value="NEEDS_ACTION">
              Needs action ({needsAction.length})
            </TabsTrigger>
            <TabsTrigger value="RESOLVED">
              Returned ({resolved.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            id="warehouse-exceptions"
            searchable
            columns={columns}
            data={orders}
            getRowKey={(o) => o.id}
            initialSortId="order"
            loading={isLoading}
            emptyMessage={
              tab === "NEEDS_ACTION"
                ? "No failed deliveries. Parcels appear here when a delivery rider records a failed attempt."
                : "Nothing returned yet."
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

      <FailedDeliveryDialog
        order={activeOrder}
        merchantName={
          activeOrder
            ? (merchant(activeOrder.merchantId)?.businessName ?? "Merchant")
            : ""
        }
        riderName={activeOrder ? riderName(activeOrder.deliveryRiderId) : ""}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
