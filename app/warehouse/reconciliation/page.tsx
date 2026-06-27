"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Banknote, HandCoins, Loader2, Wallet } from "lucide-react"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { useOrders } from "@/features/orders/hooks/use-orders"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { useRiders } from "@/features/riders/hooks/use-riders"
import { formatTk } from "@/lib/pricing"
import {
  orderCodeColumn,
  warehouseColumn,
  deliveryAddressColumn,
  riderColumn,
  statusColumn,
} from "@/features/orders/components/order-table-columns"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { StatCardList } from "@/components/stat-card-list"
import { ConfirmDialog } from "@/components/confirm-dialog"

type FilterTab = "UNSETTLED" | "SETTLED"

export default function WarehouseReconciliationPage() {
  const { currentUser } = useAuth()
  const { currentWarehouse, warehouses } = useWarehouses()
  const {
    orders,
    allOrders,
    warehouseUnsettledOrders,
    settleOrderCod,
    isLoading,
  } = useOrders()
  const { merchants } = useMerchants()
  const { riders } = useRiders()
  const [tab, setTab] = useState<FilterTab>("UNSETTLED")
  const [settling, setSettling] = useState<string | null>(null)
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const merchantName = (id: string) =>
    merchants.find((m) => m.id === id)?.businessName ?? "Merchant"
  const riderName = (id?: string | null) =>
    id ? (riders.find((r) => r.id === id)?.name ?? "—") : "—"
  const warehouseName = (id?: string | null) =>
    id ? (warehouses.find((w) => w.id === id)?.name ?? "—") : "—"

  const unsettled = warehouseUnsettledOrders

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

  function openConfirm(order: Order) {
    setConfirmOrder(order)
    setConfirmOpen(true)
  }

  async function handleConfirm() {
    if (!confirmOrder) return
    setSettling(confirmOrder.id)
    try {
      const result = await settleOrderCod(confirmOrder.id)
      if (result.ok) {
        toast.success(
          `${confirmOrder.code} settled. Product cost is now available for merchant payout.`,
        )
      } else {
        toast.error(result.error ?? "Unable to settle this parcel.")
      }
    } finally {
      setSettling(null)
      setConfirmOpen(false)
      setConfirmOrder(null)
    }
  }

  const columns: DataTableColumn<Order>[] = [
    // Reconciliation shows merchant name below the code (no recipient needed).
    orderCodeColumn({ subtitle: "merchant", merchantName }),
    warehouseColumn(warehouseName),
    deliveryAddressColumn(),
    riderColumn("delivery", riderName, "Delivery rider"),
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
    statusColumn({ settledOverride: true }),
    {
      id: "actions",
      header: "",
      align: "right",
      headClassName: "w-12",
      cell: (o) =>
        o.codSettledAt ? null : (
          <Button
            size="sm"
            onClick={() => openConfirm(o)}
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
            loading={isLoading}
            emptyMessage={
              tab === "UNSETTLED"
                ? "Nothing to reconcile. Delivered parcels appear here until their rider settles the collected cash."
                : "No settlements yet."
            }
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Settle cash on delivery"
        description={`Settle ${confirmOrder?.code} for ${formatTk(confirmOrder?.totalCollectible ?? 0)}? This marks the cash as collected and makes it available for merchant payout.`}
        confirmLabel="Settle"
        onConfirm={handleConfirm}
      />
    </div>
  )
}
