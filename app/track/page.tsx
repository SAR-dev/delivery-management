"use client"

import {Fragment, Suspense, useMemo, useState} from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Package,
  Search,
  MapPin,
  Store,
  PackageX,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Undo2,
  ClipboardCheck,
  PackageCheck,
  Bike,
  Warehouse,
  Truck,
  User,
} from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import type { Order, OrderStatus } from "@/lib/types"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

function maskPhone(phone: string) {
  const digits = phone.replace(/\s+/g, "")
  if (digits.length <= 3) return digits
  return `••• ••• ${digits.slice(-3)}`
}

function generalArea(order: Order) {
  const parts = order.deliveryAddress.split(",").map((p) => p.trim()).filter(Boolean)
  const area = parts.length > 1 ? parts[parts.length - 2] : parts[0]
  return [area, order.deliveryCity].filter(Boolean).join(", ")
}

function formatStamp(iso?: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

const STATUS_RANK: Record<OrderStatus, number> = {
  PENDING: 0,
  APPROVED: 1,
  PICKED_UP: 2,
  IN_WAREHOUSE: 3,
  IN_TRANSIT: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
  FAILED_ATTEMPT: 4,
  RETURNED: 4,
}

type StepKey = "PLACED" | "APPROVED" | "PICKED_UP" | "IN_WAREHOUSE" | "OUT_FOR_DELIVERY" | "DELIVERED"

const STEPS: {
  key: StepKey
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  rank: number
  timestamp: (o: Order) => string | null | undefined
}[] = [
  {
    key: "PLACED",
    label: "Order placed",
    description: "Merchant created the shipment",
    icon: ClipboardCheck,
    rank: 0,
    timestamp: (o) => o.createdAt,
  },
  {
    key: "APPROVED",
    label: "Approved",
    description: "Verified and ready for pickup",
    icon: PackageCheck,
    rank: 1,
    timestamp: (o) => o.approvedAt,
  },
  {
    key: "PICKED_UP",
    label: "Picked up",
    description: "Rider collected from merchant",
    icon: Bike,
    rank: 2,
    timestamp: (o) => o.pickedUpAt,
  },
  {
    key: "IN_WAREHOUSE",
    label: "At sorting hub",
    description: "Arrived at the delivery hub",
    icon: Warehouse,
    rank: 3,
    timestamp: (o) => o.receivedAtWarehouseAt,
  },
  {
    key: "OUT_FOR_DELIVERY",
    label: "Out for delivery",
    description: "Rider is heading to you now",
    icon: Truck,
    rank: 4,
    timestamp: (o) => o.outForDeliveryAt ?? o.dispatchedAt,
  },
  {
    key: "DELIVERED",
    label: "Delivered",
    description: "Handed to the recipient",
    icon: CheckCircle2,
    rank: 5,
    timestamp: (o) => o.deliveredAt,
  },
]

const STATUS_COPY: Record<OrderStatus, { headline: string; sub: string; color: string }> = {
  PENDING: {
    headline: "Awaiting approval",
    sub: "Your order is in the queue — we'll pick it up shortly.",
    color: "text-chart-3",
  },
  APPROVED: {
    headline: "Ready for pickup",
    sub: "A rider will collect your parcel from the merchant soon.",
    color: "text-chart-1",
  },
  PICKED_UP: {
    headline: "Parcel collected",
    sub: "Your parcel is on its way to the sorting hub.",
    color: "text-chart-1",
  },
  IN_WAREHOUSE: {
    headline: "At the sorting hub",
    sub: "Your parcel has arrived and is being prepared for delivery.",
    color: "text-chart-2",
  },
  IN_TRANSIT: {
    headline: "In transit",
    sub: "Your parcel is moving between facilities.",
    color: "text-chart-4",
  },
  OUT_FOR_DELIVERY: {
    headline: "On the way!",
    sub: "A rider is heading to your address right now.",
    color: "text-chart-4",
  },
  DELIVERED: {
    headline: "Delivered ✓",
    sub: "Your parcel was handed to the recipient.",
    color: "text-chart-2",
  },
  FAILED_ATTEMPT: {
    headline: "Delivery attempted",
    sub: "We couldn't complete delivery. A new attempt will be scheduled.",
    color: "text-destructive",
  },
  RETURNED: {
    headline: "Returned to merchant",
    sub: "This parcel was returned and will not be delivered.",
    color: "text-muted-foreground",
  },
}

export default function TrackPage() {
  return (
    <Suspense fallback={null}>
      <TrackContent />
    </Suspense>
  )
}

function TrackContent() {
  const { orders, merchants, riders, warehouses } = usePlatform()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialCode = (searchParams.get("code") ?? "").trim()

  const [query, setQuery] = useState(initialCode)
  const [searched, setSearched] = useState(Boolean(initialCode))

  const submittedCode = searched ? initialCode || query : ""

  const order = useMemo(() => {
    const normalized = submittedCode.trim().toUpperCase()
    if (!normalized) return null
    return (
      orders.find(
        (o) =>
          o.code.toUpperCase() === normalized ||
          o.code.toUpperCase() === `PF-${normalized}` ||
          o.id.toUpperCase() === normalized,
      ) ?? null
    )
  }, [orders])

  const merchant = useMemo(
    () => (order ? merchants.find((m) => m.id === order.merchantId) ?? null : null),
    [merchants, order],
  )

  const pickupRider = useMemo(
    () => (order?.pickupRiderId ? riders.find((r) => r.id === order.pickupRiderId) ?? null : null),
    [riders, order],
  )

  const deliveryRider = useMemo(
    () => (order?.deliveryRiderId ? riders.find((r) => r.id === order.deliveryRiderId) ?? null : null),
    [riders, order],
  )

  const warehouse = useMemo(
    () => (order?.warehouseId ? warehouses.find((w) => w.id === order.warehouseId) ?? null : null),
    [warehouses, order],
  )

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const trimmed = query.trim()
    setSearched(true)
    router.replace(trimmed ? `/track?code=${encodeURIComponent(trimmed)}` : "/track")
  }

  const notFound = searched && submittedCode.trim() !== "" && !order
  const statusInfo = order ? STATUS_COPY[order.status] : null

  return (
    <main className="min-h-screen" style={{ background: "var(--track-bg, oklch(0.985 0.002 247))" }}>
      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
          <Link href="/track" className="flex items-center gap-2.5 group">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm group-hover:shadow-md transition-shadow">
              <Package className="size-3.5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">ParcelFlow</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline font-medium">Order Tracking</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-12">

        {/* Hero */}
        {!order && (
          <div className="mb-10 text-center">
            <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary/8 mb-5 ring-1 ring-primary/15">
              <Package className="size-6 text-primary" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight mb-2.5">
              Track your parcel
            </h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
              Enter your tracking code for live delivery updates — no account needed.
            </p>
          </div>
        )}

        {/* Search */}
        <form onSubmit={handleSubmit} className={cn("mx-auto flex max-w-lg gap-2.5", order && "mb-8")}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tracking code — e.g. PF-100231"
              className="flex h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-shadow"
              aria-label="Tracking code"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
          >
            Track <ArrowRight className="size-3.5" />
          </button>
        </form>

        {/* Hint */}
        {!order && !notFound && !searched && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Your code is printed on the delivery note — it starts with{" "}
            <span className="font-mono text-foreground">PF-</span>
          </p>
        )}

        {/* Not found */}
        {notFound && (
          <div className="mx-auto max-w-sm mt-2">
            <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
              <div className="inline-flex size-12 items-center justify-center rounded-full bg-muted mb-4">
                <PackageX className="size-5 text-muted-foreground" />
              </div>
              <p className="font-medium text-sm">No parcel found</p>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                We couldn&apos;t find a parcel for{" "}
                <span className="font-mono text-foreground">{submittedCode}</span>.{" "}
                Double-check your tracking code and try again.
              </p>
            </div>
          </div>
        )}

        {/* Result */}
        {order && statusInfo && (
          <div className="space-y-4">

            {/* Status hero card */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">

              <div className="p-5 pb-4">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div>
                    <p className={cn("text-lg font-semibold tracking-tight", statusInfo.color)}>
                      {statusInfo.headline}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{statusInfo.sub}</p>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-md shrink-0 mt-0.5">
                    {order.code}
                  </span>
                </div>
              </div>

              {/* Meta strip */}
              <div className="border-t border-border/60 px-5 py-3.5 flex flex-wrap gap-x-6 gap-y-2.5">
                {merchant && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Store className="size-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">From</p>
                      <p className="text-xs font-medium truncate">{merchant.businessName}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">To</p>
                    <p className="text-xs font-medium truncate">{generalArea(order)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <User className="size-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Customer</p>
                    <p className="text-xs font-medium truncate">{order.recipientName.split(" ")[0]} · {maskPhone(order.recipientPhone)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Who's handling the parcel */}
            {(pickupRider || warehouse || deliveryRider) && (
              <div className="rounded-xl border border-border bg-card shadow-sm p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                  Who&apos;s handling your parcel
                </p>
                <ul className="space-y-3">
                  {pickupRider && (
                    <HandlerRow
                      icon={Bike}
                      role="Pickup rider"
                      name={pickupRider.name}
                      detail={[maskPhone(pickupRider.phone), pickupRider.zone].filter(Boolean).join(" · ")}
                      done={Boolean(order.pickedUpAt)}
                    />
                  )}
                  {warehouse && (
                    <HandlerRow
                      icon={Warehouse}
                      role="Sorting hub"
                      name={warehouse.name}
                      detail={[warehouse.city, order.receivedByWarehouse ? `Logged by ${order.receivedByWarehouse}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                      done={Boolean(order.receivedAtWarehouseAt)}
                    />
                  )}
                  {deliveryRider && (
                    <HandlerRow
                      icon={Truck}
                      role="Delivery rider"
                      name={deliveryRider.name}
                      detail={[maskPhone(deliveryRider.phone), deliveryRider.zone].filter(Boolean).join(" · ")}
                      done={Boolean(order.deliveredAt)}
                    />
                  )}
                </ul>
              </div>
            )}

            {/* Timeline card */}
            <div className="rounded-xl border border-border bg-card shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">
                Delivery progress
              </p>
              <InlineTimeline order={order} />
            </div>

          </div>
        )}
      </div>
    </main>
  )
}

function HandlerRow({
  icon: Icon,
  role,
  name,
  detail,
  done,
}: {
  icon: React.ComponentType<{ className?: string }>
  role: string
  name: string
  detail?: string
  done?: boolean
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full border",
          done
            ? "border-chart-2/30 bg-chart-2/15 text-chart-2"
            : "border-border bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{role}</p>
        <p className="text-sm font-medium truncate">{name}</p>
        {detail && <p className="text-xs text-muted-foreground truncate">{detail}</p>}
      </div>
    </li>
  )
}

function InlineTimeline({ order }: { order: Order }) {
  const currentRank = STATUS_RANK[order.status]
  const isReturned = order.status === "RETURNED"
  const isFailed = order.status === "FAILED_ATTEMPT"

  return (
    <ol className="relative space-y-0">
      {STEPS.map((step, index) => {
        const isLast = index === STEPS.length - 1
        const reached = currentRank >= step.rank
        const isCurrent =
          currentRank === step.rank &&
          !isReturned &&
          !(isFailed && step.key === "DELIVERED")
        const isCompleted = reached && !isCurrent
        const Icon = step.icon
        const stamp = formatStamp(step.timestamp(order))

        // After OUT_FOR_DELIVERY, inject exception nodes before DELIVERED
        const showFailedAfter = step.key === "OUT_FOR_DELIVERY" && isFailed
        const showReturnedAfter = step.key === "OUT_FOR_DELIVERY" && isReturned
        const hasExceptionAfter = showFailedAfter || showReturnedAfter

        return (
          <Fragment key={step.key}>
            <li className="flex gap-3.5">
              {/* Rail */}
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                    isCompleted
                      ? "border-chart-2 bg-chart-2 text-white"
                      : isCurrent
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-muted/50 text-muted-foreground/50",
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                {(!isLast || hasExceptionAfter) && (
                  <span
                    className={cn(
                      "w-0.5 flex-1 min-h-7 my-1 rounded-full",
                      isCompleted || (isCurrent && currentRank > step.rank)
                        ? "bg-chart-2/50"
                        : "bg-border",
                    )}
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Content */}
              <div className={cn("pb-7", isLast && !hasExceptionAfter && "pb-0", "pt-0.5")}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    className={cn(
                      "text-sm font-medium leading-none",
                      reached ? "text-foreground" : "text-muted-foreground/60",
                    )}
                  >
                    {step.label}
                  </p>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      <span className="size-1.5 rounded-full bg-primary inline-block animate-pulse" />
                      Live
                    </span>
                  )}
                </div>
                {stamp ? (
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">{stamp}</p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground/50">{step.description}</p>
                )}
              </div>
            </li>

            {showFailedAfter && (
              <li key="FAILED_ATTEMPT" className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-destructive/40 bg-destructive/10 text-destructive">
                    <XCircle className="size-3.5" />
                  </span>
                  {/* Connector down to Delivered */}
                  <span className="w-0.5 flex-1 min-h-7 my-1 rounded-full bg-border" aria-hidden="true" />
                </div>
                <div className="pt-0.5 pb-7">
                  <p className="text-sm font-medium text-destructive">Delivery attempt failed</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatStamp(order.failedAttemptAt) ?? "A new attempt will be scheduled."}
                  </p>
                </div>
              </li>
            )}

            {showReturnedAfter && (
              <li key="RETURNED" className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-border bg-muted text-muted-foreground">
                    <Undo2 className="size-3.5" />
                  </span>
                  {/* Connector down to Delivered */}
                  <span className="w-0.5 flex-1 min-h-7 my-1 rounded-full bg-border" aria-hidden="true" />
                </div>
                <div className="pt-0.5 pb-7">
                  <p className="text-sm font-medium">Returned to merchant</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatStamp(order.returnedAt) ?? "This parcel was returned and will not be delivered."}
                  </p>
                </div>
              </li>
            )}
          </Fragment>
        )
      })}
    </ol>
  )
}
