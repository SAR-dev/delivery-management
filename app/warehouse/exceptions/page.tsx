"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  PackageOpen,
  MapPin,
  Phone,
  Package,
  Bike,
  RotateCcw,
  Undo2,
  Wrench,
} from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { OrderStatusBadge } from "@/components/order-status-badge"
import { FailedDeliveryDialog } from "@/components/failed-delivery-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type FilterTab = "NEEDS_ACTION" | "RESOLVED"

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
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
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function WarehouseExceptionsPage() {
  const {
    currentUser,
    currentWarehouse,
    orders,
    merchants,
    riders,
    warehouseFailedOrders,
  } = usePlatform()
  const [tab, setTab] = useState<FilterTab>("NEEDS_ACTION")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const rider = (id?: string | null) =>
    id ? riders.find((r) => r.id === id) : undefined

  // FAILED_ATTEMPT parcels at this warehouse awaiting a decision.
  const needsAction = warehouseFailedOrders

  // Parcels this warehouse has already resolved as returned.
  const resolved = useMemo(
    () =>
      currentWarehouse
        ? orders.filter(
            (o) =>
              o.warehouseId === currentWarehouse.id && o.status === "RETURNED",
          )
        : [],
    [orders, currentWarehouse],
  )

  const visible = tab === "NEEDS_ACTION" ? needsAction : resolved

  function openResolve(order: Order) {
    setActiveOrder(order)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Exceptions desk, ${currentUser?.name.split(" ")[0] ?? "Admin"}`}
        description={`Phase 8B: resolve failed delivery attempts at ${
          currentWarehouse?.name ?? "your warehouse"
        } — re-attempt delivery or close the parcel as returned.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Needs action"
          value={needsAction.length}
          icon={AlertTriangle}
          tone="bg-destructive/10 text-destructive"
        />
        <StatCard
          label="Returned"
          value={resolved.length}
          icon={Undo2}
          tone="bg-muted text-muted-foreground"
        />
        <StatCard
          label="Total exceptions"
          value={needsAction.length + resolved.length}
          icon={Wrench}
          tone="bg-chart-4/15 text-chart-4"
        />
      </div>

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

      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <PackageOpen className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">
                {tab === "NEEDS_ACTION"
                  ? "No failed deliveries"
                  : "Nothing returned yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {tab === "NEEDS_ACTION"
                  ? "Parcels appear here when a delivery rider records a failed attempt."
                  : "Parcels you close as returned will be listed here."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((o) => {
            const m = merchant(o.merchantId)
            const dr = rider(o.deliveryRiderId)
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
                        {o.parcelWeightKg} KG · {o.deliveryType} ·{" "}
                        {o.deliveryAttempts ?? 1} attempt
                        {(o.deliveryAttempts ?? 1) === 1 ? "" : "s"}
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

                  {o.status === "FAILED_ATTEMPT" && o.failureNote ? (
                    <p className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <span className="leading-snug">{o.failureNote}</span>
                    </p>
                  ) : null}

                  {o.status === "RETURNED" ? (
                    <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                      <Undo2 className="mt-0.5 size-4 shrink-0" />
                      <span className="leading-snug">
                        Returned by {o.failedResolvedBy ?? "Warehouse Admin"}
                        {o.returnReason ? ` — ${o.returnReason}` : ""}. No COD
                        collected, no merchant payout.
                      </span>
                    </p>
                  ) : null}

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      Collectible{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {formatTk(o.totalCollectible)}
                      </span>
                    </span>
                    {o.status === "FAILED_ATTEMPT" ? (
                      <Button size="sm" onClick={() => openResolve(o)}>
                        <RotateCcw className="size-4" />
                        Resolve
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <FailedDeliveryDialog
        order={activeOrder}
        merchantName={
          activeOrder
            ? (merchant(activeOrder.merchantId)?.businessName ?? "Merchant")
            : ""
        }
        riderName={
          activeOrder ? (rider(activeOrder.deliveryRiderId)?.name ?? "—") : ""
        }
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
