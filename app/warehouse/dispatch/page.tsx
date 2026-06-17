"use client"

import { useMemo, useState } from "react"
import {
  Truck,
  PackageOpen,
  MapPin,
  Phone,
  Package,
  Bike,
  Boxes,
  Send,
} from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { OrderStatusBadge } from "@/components/order-status-badge"
import { WarehouseDispatchDialog } from "@/components/warehouse-dispatch-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type FilterTab = "READY" | "DISPATCHED"

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

export default function WarehouseDispatchPage() {
  const {
    currentUser,
    currentWarehouse,
    orders,
    merchants,
    riders,
    warehouseDeliveryRiders,
  } = usePlatform()
  const [tab, setTab] = useState<FilterTab>("READY")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const rider = (id?: string | null) =>
    id ? riders.find((r) => r.id === id) : undefined

  // Parcels held in this warehouse, awaiting a delivery rider.
  const ready = useMemo(
    () =>
      currentWarehouse
        ? orders.filter(
            (o) =>
              o.status === "IN_WAREHOUSE" &&
              o.warehouseId === currentWarehouse.id,
          )
        : [],
    [orders, currentWarehouse],
  )

  // Parcels this warehouse has already dispatched for delivery.
  const dispatched = useMemo(
    () =>
      currentWarehouse
        ? orders.filter(
            (o) =>
              o.warehouseId === currentWarehouse.id &&
              o.deliveryRiderId != null &&
              ["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(o.status),
          )
        : [],
    [orders, currentWarehouse],
  )

  const visible = tab === "READY" ? ready : dispatched

  function openDispatch(order: Order) {
    setActiveOrder(order)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Dispatch desk, ${currentUser?.name.split(" ")[0] ?? "Admin"}`}
        description={`Phase 7: assign delivery riders to parcels held in ${
          currentWarehouse?.name ?? "your warehouse"
        } and send them out for delivery.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Ready to dispatch"
          value={ready.length}
          icon={PackageOpen}
          tone="bg-chart-1/15 text-chart-1"
        />
        <StatCard
          label="Dispatched"
          value={dispatched.length}
          icon={Truck}
          tone="bg-chart-4/15 text-chart-4"
        />
        <StatCard
          label="Available riders"
          value={warehouseDeliveryRiders.length}
          icon={Bike}
          tone="bg-chart-2/15 text-chart-2"
        />
      </div>

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

      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Boxes className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">
                {tab === "READY"
                  ? "Nothing ready to dispatch"
                  : "Nothing dispatched yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {tab === "READY"
                  ? "Parcels appear here once they're received into the warehouse."
                  : "Parcels you assign to a delivery rider will be listed here."}
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
                    {o.deliveryRiderId ? (
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
                    ) : null}
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

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Collectible{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {formatTk(o.totalCollectible)}
                      </span>
                    </span>
                    {o.status === "IN_WAREHOUSE" ? (
                      <Button size="sm" onClick={() => openDispatch(o)}>
                        <Send className="size-4" />
                        Assign rider
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

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
