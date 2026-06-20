"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Loader2,
  Package,
  MapPin,
  User,
  Phone,
  Store,
  Bike,
  Warehouse as WarehouseIcon,
  Weight,
} from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import { CURRENCY_SUFFIX } from "@/lib/constants"
import type { Order } from "@/lib/types"
import { OrderStatusBadge } from "@/components/badge/order-status-badge"
import { TrackingTimeline } from "@/components/tracking-timeline"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  )
}

function MoneyRow({
  label,
  amount,
  emphasis,
}: {
  label: string
  amount: number
  emphasis?: boolean
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={emphasis ? "font-medium" : "text-muted-foreground"}>
        {label}
      </span>
      <span
        className={
          emphasis ? "text-base font-semibold tabular-nums" : "tabular-nums"
        }
      >
        {formatTk(amount)}
      </span>
    </div>
  )
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  const { isReady, orders, merchants, riders, warehouses } = usePlatform()

  const order: Order | undefined = orders.find((o) => o.id === params.id)

  if (!isReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <Package className="text-muted-foreground size-10" />
        <div>
          <p className="text-lg font-medium">Order not found</p>
          <p className="text-muted-foreground text-sm">
            This order may have been removed or the link is incorrect.
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href="/dashboard/orders" />}
          nativeButton={false}
        >
          <ArrowLeft className="size-4" />
          Back to orders
        </Button>
      </div>
    )
  }

  const merchant = merchants.find((m) => m.id === order.merchantId)
  const pickupRider = riders.find((r) => r.id === order.pickupRiderId)
  const deliveryRider = riders.find((r) => r.id === order.deliveryRiderId)
  const warehouse = warehouses.find((w) => w.id === order.warehouseId)
  const exceedsWeight = merchant
    ? order.parcelWeightKg > merchant.maxWeightKg
    : false

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard/orders"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" />
          Back to orders
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">
              {order.code}
            </h1>
            <p className="text-muted-foreground text-sm">
              Placed {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: details */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recipient & delivery</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <DetailRow
                icon={User}
                label="Recipient"
                value={order.recipientName}
              />
              <DetailRow
                icon={Phone}
                label="Phone"
                value={order.recipientPhone}
              />
              <DetailRow
                icon={MapPin}
                label="Delivery address"
                value={`${order.deliveryAddress}, ${order.deliveryCity}`}
              />
              <DetailRow
                icon={Store}
                label="Merchant"
                value={merchant?.businessName ?? "Unknown"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parcel</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <DetailRow
                icon={Weight}
                label="Weight"
                value={
                  <span className={exceedsWeight ? "text-destructive" : ""}>
                    {order.parcelWeightKg} KG
                    {exceedsWeight ? " (exceeds limit)" : ""}
                  </span>
                }
              />
              <DetailRow
                icon={Package}
                label="Delivery type"
                value={
                  order.deliveryType === "FRAGILE" ? "Fragile" : "Standard"
                }
              />
              <DetailRow
                icon={Bike}
                label="Pickup rider"
                value={pickupRider?.name ?? "Not assigned"}
              />
              <DetailRow
                icon={WarehouseIcon}
                label="Delivery rider / hub"
                value={
                  deliveryRider
                    ? `${deliveryRider.name}${warehouse ? ` · ${warehouse.name}` : ""}`
                    : (warehouse?.name ?? "Not assigned")
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MoneyRow label="Product cost (COD)" amount={order.productCost} />
              <MoneyRow label="Delivery charge" amount={order.deliveryCharge} />
              <MoneyRow label="Security money" amount={order.securityMoney} />
              <Separator />
              <MoneyRow
                label="Total collectible"
                amount={order.totalCollectible}
                emphasis
              />
              {order.amountCollected != null ? (
                <p className="text-muted-foreground text-xs">
                  Collected: {order.amountCollected} {CURRENCY_SUFFIX}
                  {order.codSettledAt ? " · COD settled" : ""}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Right: tracking */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <TrackingTimeline order={order} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
