"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Banknote,
  Bike,
  CheckCircle2,
  HandCoins,
  Loader2,
  Wallet,
} from "lucide-react"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { useOrders } from "@/features/orders/hooks/use-orders"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { useRiders } from "@/features/riders/hooks/use-riders"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { StatCardList } from "@/components/stat-card-list"

type FilterTab = "UNSETTLED" | "SETTLED"

export default function WarehouseReconciliationPage() {
  const { currentUser } = useAuth()
  const { currentWarehouse, warehouses } = useWarehouses()
  const { orders, allOrders, warehouseUnsettledOrders, settleOrderCod } =
    useOrders()
  const { merchants } = useMerchants()
  const { riders } = useRiders()
  const [tab, setTab] = useState<FilterTab>("UNSETTLED")
  const [settling, setSettling] = useState<string | null>(null)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const merchantName = (id: string) => merchant(id)?.businessName ?? "Merchant"
  const rider = (id?: string | null) =>
    id ? riders.find((r) => r.id === id) : undefined
  const warehouseName = (id?: string | null) =>
    id ? (warehouses.find((w) => w.id === id)?.name ?? "—") : "—"

  // Already derived from the unfiltered list (see useOrders), so stats/tab
  // counts stay stable regardless of the current search.
  const unsettled = warehouseUnsettledOrders

  // Delivered parcels at this warehouse whose COD has been settled.
  const settled = useMemo(
    () =>
      currentWarehouse
        ? allOrders.filter(
            (o) =>
              o.warehouseId === currentWarehouse.id &&
              o.status === "DELIVERED" &&
              Boolean(o.codSettledAt),
          )
        : [],
    [allOrders, currentWarehouse],
  )

  const unsettledCash = unsettled.reduce(
    (sum, o) => sum + (o.amountCollected ?? o.totalCollectible),
    0,
  )
  const settledCash = settled.reduce(
    (sum, o) => sum + (o.amountCollected ?? o.totalCollectible),
    0,
  )

  // Table-facing versions, narrowed by the active search.
  const visibleUnsettled = useMemo(
    () =>
      currentWarehouse
        ? orders.filter(
            (o) =>
              o.status === "DELIVERED" &&
              o.warehouseId === currentWarehouse.id &&
              !o.codSettledAt,
          )
        : [],
    [orders, currentWarehouse],
  )

  const visibleSettled = useMemo(
    () =>
      currentWarehouse
        ? orders.filter(
            (o) =>
              o.warehouseId === currentWarehouse.id &&
              o.status === "DELIVERED" &&
              Boolean(o.codSettledAt),
          )
        : [],
    [orders, currentWarehouse],
  )

  const visible = tab === "UNSETTLED" ? visibleUnsettled : visibleSettled

  async function handleSettle(order: Order) {
    setSettling(order.id)
    try {
      const result = await settleOrderCod(order.id)
      if (result.ok) {
        toast.success(
          `${order.code} settled. Product cost is now available for merchant payout.`,
        )
      } else {
        toast.error(result.error ?? "Unable to settle this parcel.")
      }
    } finally {
      setSettling(null)
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
      id: "rider",
      header: "Delivery rider",
      sortable: true,
      sortValue: (o) => rider(o.deliveryRiderId)?.name ?? "",
      cell: (o) => (
        <span className="flex items-center gap-1.5 text-sm">
          <Bike className="text-muted-foreground size-4" />
          {rider(o.deliveryRiderId)?.name ?? "—"}
        </span>
      ),
    },
    {
      id: "collected",
      header: "Cash collected",
      align: "right",
      sortable: true,
      sortValue: (o) => o.amountCollected ?? o.totalCollectible,
      cell: (o) => (
        <span className="font-medium tabular-nums">
          {formatTk(o.amountCollected ?? o.totalCollectible)}
        </span>
      ),
    },
    {
      id: "platform",
      header: "Platform revenue",
      align: "right",
      sortable: true,
      sortValue: (o) => o.deliveryCharge + o.securityMoney,
      cell: (o) => (
        <span className="text-muted-foreground tabular-nums">
          {formatTk(o.deliveryCharge + o.securityMoney)}
        </span>
      ),
    },
    {
      id: "payable",
      header: "Merchant payable",
      align: "right",
      sortable: true,
      sortValue: (o) => o.productCost,
      cell: (o) => (
        <span className="text-primary tabular-nums">
          {formatTk(o.productCost)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      sortValue: (o) => (o.codSettledAt ? "settled" : "unsettled"),
      cell: (o) =>
        o.codSettledAt ? (
          <span className="text-chart-2 flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="size-4" />
            Settled by {o.codSettledBy ?? "Admin"}
          </span>
        ) : (
          <OrderStatusBadge status={o.status} />
        ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      headClassName: "w-12",
      cell: (o) =>
        o.codSettledAt ? null : (
          <Button
            size="sm"
            onClick={() => handleSettle(o)}
            disabled={settling === o.id}
          >
            {settling === o.id ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Settling
              </>
            ) : (
              <>
                <HandCoins className="size-4" />
                Settle cash
              </>
            )}
          </Button>
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={pageContent.warehouse.reconciliation.title(
          currentUser?.name.split(" ")[0] ?? "Admin",
        )}
        description={pageContent.warehouse.reconciliation.description}
      />

      <StatCardList
        items={[
          {
            label: "Awaiting settlement",
            value: unsettled.length,
            icon: HandCoins,
            tone: "bg-chart-3/15 text-chart-3",
          },
          {
            label: "Cash to collect",
            value: formatTk(unsettledCash),
            icon: Banknote,
            tone: "bg-chart-1/15 text-chart-1",
          },
          {
            label: "Settled cash",
            value: formatTk(settledCash),
            icon: Wallet,
            tone: "bg-chart-2/15 text-chart-2",
          },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
          <TabsList>
            <TabsTrigger value="UNSETTLED">
              Awaiting settlement ({unsettled.length})
            </TabsTrigger>
            <TabsTrigger value="SETTLED">
              Settled ({settled.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            id="warehouse-reconciliation"
            searchable
            columns={columns}
            data={visible}
            getRowKey={(o) => o.id}
            initialSortId="order"
            emptyMessage={
              tab === "UNSETTLED"
                ? "Nothing to reconcile. Delivered parcels appear here until their rider settles the collected cash."
                : "No settlements yet."
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
