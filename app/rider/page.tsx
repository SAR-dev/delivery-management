"use client"

import { useMemo, useState } from "react"
import {
  PackageCheck,
  PackageOpen,
  MapPin,
  Phone,
  Store,
  Package,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { OrderStatusBadge } from "@/components/order-status-badge"
import { PickupConfirmDialog } from "@/components/pickup-confirm-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type FilterTab = "TO_COLLECT" | "COLLECTED"

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

export default function RiderPickupQueuePage() {
  const { currentUser, currentRider, orders, merchants, pickupLocations } =
    usePlatform()
  const [tab, setTab] = useState<FilterTab>("TO_COLLECT")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const pickup = (id: string) => pickupLocations.find((p) => p.id === id)

  // All orders assigned to this rider for pickup.
  const myPickups = useMemo(
    () =>
      currentRider
        ? orders.filter((o) => o.pickupRiderId === currentRider.id)
        : [],
    [orders, currentRider],
  )

  const toCollect = myPickups.filter((o) => o.status === "APPROVED")
  const collected = myPickups.filter((o) =>
    ["PICKED_UP", "IN_WAREHOUSE", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
      o.status,
    ),
  )

  const visible = tab === "TO_COLLECT" ? toCollect : collected

  function openConfirm(order: Order) {
    setActiveOrder(order)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Pickup queue, ${currentUser?.name.split(" ")[0] ?? "Rider"}`}
        description="Collect approved parcels from merchants and mark them picked up."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="To collect"
          value={toCollect.length}
          icon={Clock}
          tone="bg-chart-1/15 text-chart-1"
        />
        <StatCard
          label="Collected"
          value={collected.length}
          icon={CheckCircle2}
          tone="bg-chart-2/15 text-chart-2"
        />
        <StatCard
          label="Total assigned"
          value={myPickups.length}
          icon={PackageOpen}
          tone="bg-primary/10 text-primary"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="TO_COLLECT">
            To collect ({toCollect.length})
          </TabsTrigger>
          <TabsTrigger value="COLLECTED">
            Collected ({collected.length})
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
                {tab === "TO_COLLECT"
                  ? "No pickups waiting"
                  : "Nothing collected yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {tab === "TO_COLLECT"
                  ? "New pickups appear here once an Admin assigns them to you."
                  : "Parcels you've picked up will be listed here."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((o) => {
            const m = merchant(o.merchantId)
            const p = pickup(o.pickupLocationId)
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
                      <Store className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Pickup from
                        </p>
                        <p className="font-medium leading-snug">
                          {p?.label ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <p className="leading-snug">{p?.address ?? "—"}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Package className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <p className="leading-snug">
                        {o.parcelWeightKg} KG · {o.deliveryType} · deliver to{" "}
                        {o.deliveryCity}
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
                    {o.status === "APPROVED" ? (
                      <Button size="sm" onClick={() => openConfirm(o)}>
                        <PackageCheck className="size-4" />
                        Mark picked up
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <PickupConfirmDialog
        order={activeOrder}
        merchantName={
          activeOrder
            ? (merchant(activeOrder.merchantId)?.businessName ?? "Merchant")
            : ""
        }
        pickupLabel={
          activeOrder ? (pickup(activeOrder.pickupLocationId)?.label ?? "—") : ""
        }
        pickupAddress={
          activeOrder
            ? (pickup(activeOrder.pickupLocationId)?.address ?? "—")
            : ""
        }
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
