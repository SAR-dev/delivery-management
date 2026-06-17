"use client"

import { useMemo, useState } from "react"
import {
  PackagePlus,
  PackageOpen,
  MapPin,
  Phone,
  Store,
  Package,
  Bike,
  Boxes,
  Clock,
} from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { OrderStatusBadge } from "@/components/order-status-badge"
import { WarehouseReceiveDialog } from "@/components/warehouse-receive-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type FilterTab = "INCOMING" | "RECEIVED"

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

export default function WarehouseIntakePage() {
  const { currentUser, currentWarehouse, orders, merchants, riders } =
    usePlatform()
  const [tab, setTab] = useState<FilterTab>("INCOMING")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const rider = (id?: string | null) =>
    id ? riders.find((r) => r.id === id) : undefined

  // Parcels that have been picked up and are heading to a warehouse. In this
  // mock, all PICKED_UP parcels are incoming to whichever warehouse logs them.
  const incoming = useMemo(
    () => orders.filter((o) => o.status === "PICKED_UP"),
    [orders],
  )

  // Parcels this warehouse has already received.
  const received = useMemo(
    () =>
      currentWarehouse
        ? orders.filter(
            (o) =>
              o.warehouseId === currentWarehouse.id &&
              ["IN_WAREHOUSE", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
                o.status,
              ),
          )
        : [],
    [orders, currentWarehouse],
  )

  const visible = tab === "INCOMING" ? incoming : received

  function openConfirm(order: Order) {
    setActiveOrder(order)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Warehouse intake, ${currentUser?.name.split(" ")[0] ?? "Admin"}`}
        description={`Phase 6: receive picked-up parcels into ${
          currentWarehouse?.name ?? "your warehouse"
        } and log them in.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Incoming"
          value={incoming.length}
          icon={Clock}
          tone="bg-chart-1/15 text-chart-1"
        />
        <StatCard
          label="Received"
          value={received.length}
          icon={Boxes}
          tone="bg-chart-2/15 text-chart-2"
        />
        <StatCard
          label="Held in warehouse"
          value={received.filter((o) => o.status === "IN_WAREHOUSE").length}
          icon={PackageOpen}
          tone="bg-primary/10 text-primary"
        />
      </div>

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

      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <PackageOpen className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">
                {tab === "INCOMING"
                  ? "No parcels incoming"
                  : "Nothing received yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {tab === "INCOMING"
                  ? "Parcels appear here once a rider marks them picked up."
                  : "Parcels you log into the warehouse will be listed here."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((o) => {
            const m = merchant(o.merchantId)
            const r = rider(o.pickupRiderId)
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
                          Brought by rider
                        </p>
                        <p className="font-medium leading-snug">
                          {r?.name ?? "—"}
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

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Collectible{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {formatTk(o.totalCollectible)}
                      </span>
                    </span>
                    {o.status === "PICKED_UP" ? (
                      <Button size="sm" onClick={() => openConfirm(o)}>
                        <PackagePlus className="size-4" />
                        Receive parcel
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <WarehouseReceiveDialog
        order={activeOrder}
        merchantName={
          activeOrder
            ? (merchant(activeOrder.merchantId)?.businessName ?? "Merchant")
            : ""
        }
        riderName={
          activeOrder ? (rider(activeOrder.pickupRiderId)?.name ?? "—") : ""
        }
        warehouseName={currentWarehouse?.name ?? "your warehouse"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
