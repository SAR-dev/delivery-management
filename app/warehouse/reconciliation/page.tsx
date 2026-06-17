"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Wallet,
  HandCoins,
  CheckCircle2,
  Banknote,
  MapPin,
  Phone,
  Package,
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

  function handleSettle(order: Order) {
    setSettling(order.id)
    const result = settleOrderCod(order.id)
    if (result.ok) {
      toast.success(
        `${order.code} settled. Product cost is now available for merchant payout.`,
      )
    } else {
      toast.error(result.error ?? "Unable to settle this parcel.")
    }
    setSettling(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`COD reconciliation, ${currentUser?.name.split(" ")[0] ?? "Admin"}`}
        description={`Phase 9: record the cash delivery riders settle for delivered parcels at ${
          currentWarehouse?.name ?? "your warehouse"
        }. The platform retains delivery charge + security money; product cost becomes payable to the merchant.`}
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

      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Wallet className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">
                {tab === "UNSETTLED"
                  ? "Nothing to reconcile"
                  : "No settlements yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {tab === "UNSETTLED"
                  ? "Delivered parcels appear here until their rider settles the collected cash."
                  : "Parcels you settle will be listed here."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((o) => {
            const m = merchant(o.merchantId)
            const dr = rider(o.deliveryRiderId)
            const collected = o.amountCollected ?? o.totalCollectible
            const platformRevenue = o.deliveryCharge + o.securityMoney
            return (
              <Card key={o.id}>
                <CardContent className="flex flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="leading-tight">
                      <p className="font-mono text-xs text-muted-foreground">
                        {o.code}
                      </p>
                      <p className="mt-0.5 font-semibold">
                        {m?.businessName ?? "Merchant"}
                      </p>
                    </div>
                    <OrderStatusBadge status={o.status} />
                  </div>

                  <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
                    <div className="flex items-start gap-3">
                      <Bike className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Delivery rider
                        </p>
                        <p className="font-medium leading-snug">
                          {dr?.name ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Package className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <p className="leading-snug">
                        {o.parcelWeightKg} KG · {o.deliveryType}
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <p className="leading-snug">
                        {o.deliveryAddress}, {o.deliveryCity}
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <p className="leading-snug">
                        {o.recipientName} · {o.recipientPhone}
                      </p>
                    </div>
                  </div>

                  {/* COD breakdown */}
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Cash collected</dt>
                      <dd className="font-medium tabular-nums">
                        {formatTk(collected)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        Platform revenue (delivery + security)
                      </dt>
                      <dd className="tabular-nums">
                        {formatTk(platformRevenue)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        Merchant payable (product cost)
                      </dt>
                      <dd className="tabular-nums text-primary">
                        {formatTk(o.productCost)}
                      </dd>
                    </div>
                  </dl>

                  {o.status === "DELIVERED" && o.codSettledAt ? (
                    <p className="flex items-center gap-2 rounded-md bg-chart-2/10 px-3 py-2 text-sm text-chart-2">
                      <CheckCircle2 className="size-4 shrink-0" />
                      Settled by {o.codSettledBy ?? "Warehouse Admin"}
                    </p>
                  ) : (
                    <div className="flex items-center justify-end">
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
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
