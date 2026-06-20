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
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Field({
                 icon: Icon,
                 label,
                 value,
                 className,
               }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <span className="bg-muted mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md">
        <Icon className="text-muted-foreground size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-muted-foreground mb-0.5 text-[11px] font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  )
}

function Section({
                   title,
                   children,
                   className,
                 }: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("", className)}>
      <p className="text-muted-foreground mb-4 text-[11px] font-semibold uppercase tracking-widest">
        {title}
      </p>
      {children}
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
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-5">
        <Link
          href="/dashboard/orders"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Orders
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-mono text-2xl font-semibold tracking-tight">
              {order.code}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Placed {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-px lg:col-span-2">
          {/* Recipient & delivery */}
          <div className="bg-card border-border rounded-t-xl border p-6">
            <Section title="Recipient & delivery">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field icon={User} label="Recipient" value={order.recipientName} />
                <Field icon={Phone} label="Phone" value={order.recipientPhone} />
                <Field
                  icon={MapPin}
                  label="Delivery address"
                  value={`${order.deliveryAddress}, ${order.deliveryCity}`}
                  className="sm:col-span-2"
                />
                <Field
                  icon={Store}
                  label="Merchant"
                  value={merchant?.businessName ?? "Unknown"}
                />
              </div>
            </Section>
          </div>

          {/* Parcel */}
          <div className="bg-card border-border border p-6">
            <Section title="Parcel">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field
                  icon={Weight}
                  label="Weight"
                  value={
                    <span className={exceedsWeight ? "text-destructive" : ""}>
                      {order.parcelWeightKg} kg
                      {exceedsWeight ? " · exceeds limit" : ""}
                    </span>
                  }
                />
                <Field
                  icon={Package}
                  label="Delivery type"
                  value={order.deliveryType === "FRAGILE" ? "Fragile" : "Standard"}
                />
                <Field
                  icon={Bike}
                  label="Pickup rider"
                  value={
                    pickupRider ? (
                      pickupRider.name
                    ) : (
                      <span className="text-muted-foreground font-normal">Not assigned</span>
                    )
                  }
                />
                <Field
                  icon={WarehouseIcon}
                  label="Delivery rider / hub"
                  value={
                    deliveryRider ? (
                      <>
                        {deliveryRider.name}
                        {warehouse && (
                          <span className="text-muted-foreground font-normal">
                            {" · "}{warehouse.name}
                          </span>
                        )}
                      </>
                    ) : warehouse ? (
                      warehouse.name
                    ) : (
                      <span className="text-muted-foreground font-normal">Not assigned</span>
                    )
                  }
                />
              </div>
            </Section>
          </div>

          {/* Payment */}
          <div className="bg-card border-border rounded-b-xl border p-6 pb-0">
            <Section title="Payment">
              <div className="space-y-0">
                {[
                  { label: "Product cost (COD)", amount: order.productCost },
                  { label: "Delivery charge", amount: order.deliveryCharge },
                  { label: "Security money", amount: order.securityMoney },
                ].map(({ label, amount }) => (
                  <div
                    key={label}
                    className="border-border/50 flex items-center justify-between border-b py-3 text-sm last:border-0"
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span className="tabular-nums">{formatTk(amount)}</span>
                  </div>
                ))}
                <div className="bg-muted/50 -mx-6 mt-3 flex items-center justify-between rounded-b-xl px-6 py-3.5">
                  <span className="text-sm font-medium">Total collectible</span>
                  <span className="text-base font-semibold tabular-nums">
                    {formatTk(order.totalCollectible)}
                  </span>
                </div>
              </div>
              {order.amountCollected != null && (
                <p className="text-muted-foreground mt-3 text-xs">
                  Collected: {order.amountCollected} {CURRENCY_SUFFIX}
                  {order.codSettledAt ? " · COD settled" : ""}
                </p>
              )}
            </Section>
          </div>
        </div>

        {/* Right: tracking */}
        <div className="bg-card border-border h-fit rounded-xl border p-6">
          <p className="text-muted-foreground mb-5 text-[11px] font-semibold uppercase tracking-widest">
            Tracking
          </p>
          <TrackingTimeline
            order={order}
            pickupRider={pickupRider}
            warehouse={warehouse}
            deliveryRider={deliveryRider}
            merchant={merchant}
          />
        </div>
      </div>
    </div>
  )
}
