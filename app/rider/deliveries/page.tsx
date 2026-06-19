"use client"

import { useMemo, useState } from "react"
import {
  Truck,
  PackageOpen,
  MapPin,
  Phone,
  User,
  Package,
  CheckCircle2,
  Clock,
  Navigation,
  XCircle,
} from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { OrderStatusBadge } from "@/components/order-status-badge"
import { DeliveryAttemptDialog } from "@/components/delivery-attempt-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

type FilterTab = "TO_DELIVER" | "COMPLETED"

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

export default function RiderDeliveryQueuePage() {
  const { currentUser, currentRider, orders, merchants, markOutForDelivery } =
    usePlatform()
  const [tab, setTab] = useState<FilterTab>("TO_DELIVER")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const merchant = (id: string) => merchants.find((m) => m.id === id)

  // All orders dispatched to this rider for delivery.
  const myDeliveries = useMemo(
    () =>
      currentRider
        ? orders.filter((o) => o.deliveryRiderId === currentRider.id)
        : [],
    [orders, currentRider],
  )

  const toDeliver = myDeliveries.filter((o) =>
    ["IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(o.status),
  )
  const completed = myDeliveries.filter((o) =>
    ["DELIVERED", "FAILED_ATTEMPT", "RETURNED"].includes(o.status),
  )

  const visible = tab === "TO_DELIVER" ? toDeliver : completed

  function openAttempt(order: Order) {
    setActiveOrder(order)
    setDialogOpen(true)
  }

  async function startDelivery(order: Order) {
    const result = await markOutForDelivery(order.id)
    if (result.ok) {
      toast.success(`${order.code} is now out for delivery.`)
    } else {
      toast.error(result.error ?? "Unable to start delivery.")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Delivery queue, ${currentUser?.name.split(" ")[0] ?? "Rider"}`}
        description="Take dispatched parcels out for delivery and record the outcome."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="To deliver"
          value={toDeliver.length}
          icon={Clock}
          tone="bg-chart-4/15 text-chart-4"
        />
        <StatCard
          label="Completed"
          value={completed.length}
          icon={CheckCircle2}
          tone="bg-chart-2/15 text-chart-2"
        />
        <StatCard
          label="Total assigned"
          value={myDeliveries.length}
          icon={PackageOpen}
          tone="bg-primary/10 text-primary"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="TO_DELIVER">
            To deliver ({toDeliver.length})
          </TabsTrigger>
          <TabsTrigger value="COMPLETED">
            Completed ({completed.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Truck className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">
                {tab === "TO_DELIVER"
                  ? "No deliveries waiting"
                  : "Nothing completed yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {tab === "TO_DELIVER"
                  ? "Parcels appear here once a Warehouse Admin dispatches them to you."
                  : "Delivered and failed parcels will be listed here."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((o) => {
            const m = merchant(o.merchantId)
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
                      <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Recipient
                        </p>
                        <p className="font-medium leading-snug">
                          {o.recipientName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <p className="leading-snug">
                        {o.deliveryAddress}, {o.deliveryCity}
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <p className="leading-snug">{o.recipientPhone}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Package className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <p className="leading-snug">
                        {o.parcelWeightKg} KG · {o.deliveryType}
                      </p>
                    </div>
                  </div>

                  {o.status === "FAILED_ATTEMPT" && o.failureNote ? (
                    <p className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <XCircle className="mt-0.5 size-4 shrink-0" />
                      <span className="leading-snug">{o.failureNote}</span>
                    </p>
                  ) : null}

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      Collect{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {formatTk(o.totalCollectible)}
                      </span>
                    </span>
                    {o.status === "IN_TRANSIT" ? (
                      <Button size="sm" onClick={() => startDelivery(o)}>
                        <Navigation className="size-4" />
                        Out for delivery
                      </Button>
                    ) : o.status === "OUT_FOR_DELIVERY" ? (
                      <Button size="sm" onClick={() => openAttempt(o)}>
                        <CheckCircle2 className="size-4" />
                        Record outcome
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <DeliveryAttemptDialog
        order={activeOrder}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
