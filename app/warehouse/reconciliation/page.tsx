"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Wallet,
  HandCoins,
  CheckCircle2,
  Banknote,
  Bike,
  Loader2,
} from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { OrderStatusBadge } from "@/components/order-status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable, type DataTableColumn } from "@/components/data-table"

type FilterTab = "UNSETTLED" | "SETTLED"

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  tone: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex size-11 items-center justify-center rounded-lg ${tone}`}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function WarehouseReconciliationPage() {
  const {
    currentUser,
    currentWarehouse,
    orders,
    merchants,
    riders,
    warehouseUnsettledOrders,
    settleOrderCod,
  } = usePlatform()
  const [tab, setTab] = useState<FilterTab>("UNSETTLED")
  const [settling, setSettling] = useState<string | null>(null)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const merchantName = (id: string) => merchant(id)?.businessName ?? "Merchant"
  const rider = (id?: string | null) =>
    id ? riders.find((r) => r.id === id) : undefined

  const unsettled = warehouseUnsettledOrders

  // Delivered parcels at this warehouse whose COD has been settled.
  const settled = useMemo(
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

  const unsettledCash = unsettled.reduce(
    (sum, o) => sum + (o.amountCollected ?? o.totalCollectible),
    0,
  )
  const settledCash = settled.reduce(
    (sum, o) => sum + (o.amountCollected ?? o.totalCollectible),
    0,
  )

  const visible = tab === "UNSETTLED" ? unsettled : settled

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
          <span className="font-mono text-xs text-muted-foreground">
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
      cell: (o) => (
        <span className="flex items-center gap-1.5 text-sm">
          <Bike className="size-4 text-muted-foreground" />
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
        <span className="tabular-nums text-muted-foreground">
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
        <span className="tabular-nums text-primary">
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
          <span className="flex items-center gap-1.5 text-sm text-chart-2">
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
        title={`COD reconciliation, ${currentUser?.name.split(" ")[0] ?? "Admin"}`}
        description={`The platform retains delivery charge + security money; product cost becomes payable to the merchant.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Awaiting settlement"
          value={unsettled.length}
          icon={HandCoins}
          tone="bg-chart-3/15 text-chart-3"
        />
        <StatCard
          label="Cash to collect"
          value={formatTk(unsettledCash)}
          icon={Banknote}
          tone="bg-chart-1/15 text-chart-1"
        />
        <StatCard
          label="Settled cash"
          value={formatTk(settledCash)}
          icon={Wallet}
          tone="bg-chart-2/15 text-chart-2"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="UNSETTLED">
            Awaiting settlement ({unsettled.length})
          </TabsTrigger>
          <TabsTrigger value="SETTLED">Settled ({settled.length})</TabsTrigger>
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
            searchPlaceholder="Search code, merchant, rider"
            getSearchText={(o) =>
              `${o.code} ${merchantName(o.merchantId)} ${
                rider(o.deliveryRiderId)?.name ?? ""
              }`
            }
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
