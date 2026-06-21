"use client"

import { Fragment, Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Package,
  Search,
  MapPin,
  Store,
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
  ImageOff,
} from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import type { Order, OrderStatus } from "@/lib/types"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import { ImageZoom } from "@/components/image-zoom"

function maskPhone(phone: string) {
  const digits = phone.replace(/\s+/g, "")
  if (digits.length <= 3) return digits
  return `••• ••• ${digits.slice(-3)}`
}

function generalArea(order: Order) {
  const parts = order.deliveryAddress
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
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

type StepKey =
  | "PLACED"
  | "APPROVED"
  | "PICKED_UP"
  | "IN_WAREHOUSE"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"

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

const STATUS_COPY: Record<
  OrderStatus,
  { headline: string; sub: string; color: string }
> = {
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
  const { orders, merchants, riders, warehouses, isReady, dataError } =
    usePlatform()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialCode = (searchParams.get("code") ?? "").trim()

  const [query, setQuery] = useState(initialCode)
  const [searched, setSearched] = useState(false)

  const submittedCode = searched ? query : ""

  const order = useMemo(() => {
    if (!isReady) return null
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
  }, [orders, isReady])

  const merchant = useMemo(
    () =>
      order ? (merchants.find((m) => m.id === order.merchantId) ?? null) : null,
    [merchants, order],
  )

  const pickupRider = useMemo(
    () =>
      order?.pickupRiderId
        ? (riders.find((r) => r.id === order.pickupRiderId) ?? null)
        : null,
    [riders, order?.pickupRiderId],
  )

  const deliveryRider = useMemo(
    () =>
      order?.deliveryRiderId
        ? (riders.find((r) => r.id === order.deliveryRiderId) ?? null)
        : null,
    [riders, order?.deliveryRiderId],
  )

  const warehouse = useMemo(
    () =>
      order?.warehouseId
        ? (warehouses.find((w) => w.id === order.warehouseId) ?? null)
        : null,
    [warehouses, order?.warehouseId],
  )

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    setSearched(true)
    router.replace(`/track?code=${encodeURIComponent(trimmed)}`)
  }

  const isLoading = searched && !isReady
  const notFound = isReady && searched && submittedCode.trim() !== "" && !order

  const statusInfo = order ? STATUS_COPY[order.status] : null

  return (
    <main className="bg-background min-h-screen">
      {/* Header */}
      <header className="border-border/60 bg-background/80 sticky top-0 z-10 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
          <Link href="/track" className="group flex items-center gap-2.5">
            <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md shadow-sm transition-shadow group-hover:shadow-md">
              <Package className="size-3.5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              ParcelFlow
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-xs font-medium sm:inline">
              Order Tracking
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-12">
        {/* Hero */}
        {!order && (
          <div className="mb-10 text-center">
            <div className="bg-primary/8 ring-primary/15 mb-5 inline-flex size-14 items-center justify-center rounded-2xl ring-1">
              <Package className="text-primary size-6" />
            </div>
            <h1 className="mb-2.5 text-3xl font-semibold tracking-tight">
              Track your parcel
            </h1>
            <p className="text-muted-foreground mx-auto max-w-xs text-sm leading-relaxed">
              Enter your tracking code for live delivery updates — no account
              needed.
            </p>
          </div>
        )}

        {/* Search */}
        <form
          onSubmit={handleSubmit}
          className={cn("mx-auto flex max-w-lg gap-2.5", order && "mb-8")}
        >
          <div className="relative flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tracking code — e.g. PF-100231"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-lg border pr-3.5 pl-9 text-sm transition-shadow focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
              aria-label="Tracking code"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-medium shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Track <ArrowRight className="size-3.5" />
          </button>
        </form>

        {/* Not found */}
        {notFound && (
          <p className="text-muted-foreground mx-auto mt-4 max-w-sm text-center text-sm">
            No parcel found for{" "}
            <span className="text-foreground font-mono">{submittedCode}</span>.
            Double-check your tracking code and try again.
          </p>
        )}

        {/* Hint */}
        {!order && !notFound && !isLoading && !searched && (
          <p className="text-muted-foreground mt-4 text-center text-xs">
            Your code is printed on the delivery note — it starts with{" "}
            <span className="text-foreground font-mono">PF-</span>
          </p>
        )}

        {/* Data error */}
        {isReady && dataError && searched && (
          <p className="text-destructive mx-auto mt-4 max-w-sm text-center text-sm">
            Couldn&apos;t load tracking data: {dataError}
          </p>
        )}

        {/* Loading */}
        {isLoading && !dataError && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <span className="border-muted border-t-primary size-6 animate-spin rounded-full border-2" />
            <p className="text-muted-foreground text-xs">
              Looking up your parcel…
            </p>
          </div>
        )}

        {/* Result */}
        {order && statusInfo && (
          <div className="space-y-4">
            {/* Status hero card */}
            <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
              <div className="p-5 pb-4">
                <div className="mb-1 flex items-start justify-between gap-4">
                  <div>
                    <p
                      className={cn(
                        "text-lg font-semibold tracking-tight",
                        statusInfo.color,
                      )}
                    >
                      {statusInfo.headline}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {statusInfo.sub}
                    </p>
                  </div>
                  <span className="text-muted-foreground bg-muted mt-0.5 shrink-0 rounded-md px-2.5 py-1 font-mono text-xs">
                    {order.code}
                  </span>
                </div>
              </div>

              {/* Meta strip */}
              <div className="border-border/60 flex flex-wrap gap-x-6 gap-y-2.5 border-t px-5 py-3.5">
                {merchant && (
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Store className="text-muted-foreground size-3.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                        From
                      </p>
                      <p className="truncate text-xs font-medium">
                        {merchant.businessName}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex min-w-0 items-center gap-1.5">
                  <MapPin className="text-muted-foreground size-3.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                      To
                    </p>
                    <p className="truncate text-xs font-medium">
                      {generalArea(order)}
                    </p>
                  </div>
                </div>
                <div className="flex min-w-0 items-center gap-1.5">
                  <User className="text-muted-foreground size-3.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                      Customer
                    </p>
                    <p className="truncate text-xs font-medium">
                      {order.recipientName.split(" ")[0]} ·{" "}
                      {maskPhone(order.recipientPhone)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline card */}
            <div className="border-border bg-card rounded-xl border p-5 shadow-sm">
              <p className="text-muted-foreground mb-5 text-xs font-semibold tracking-widest uppercase">
                Delivery progress
              </p>
              <InlineTimeline
                order={order}
                pickupRider={pickupRider}
                warehouse={warehouse}
                deliveryRider={deliveryRider}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

type HandlerInfo = { name: string; detail?: string } | null

function InlineTimeline({
  order,
  pickupRider,
  warehouse,
  deliveryRider,
}: {
  order: Order
  pickupRider: { name: string; phone: string; zone: string } | null
  warehouse: { name: string; city: string } | null
  deliveryRider: { name: string; phone: string; zone: string } | null
}) {
  const currentRank = STATUS_RANK[order.status]
  const isReturned = order.status === "RETURNED"
  const isFailed = order.status === "FAILED_ATTEMPT"

  // Map step keys to their handler info
  const stepHandlers: Partial<Record<StepKey, HandlerInfo>> = {
    PICKED_UP: pickupRider
      ? {
          name: pickupRider.name,
          detail: [maskPhone(pickupRider.phone), pickupRider.zone]
            .filter(Boolean)
            .join(" · "),
        }
      : null,
    IN_WAREHOUSE: warehouse
      ? {
          name: warehouse.name,
          detail: [
            warehouse.city,
            order.receivedByWarehouse
              ? `Logged by ${order.receivedByWarehouse}`
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
        }
      : null,
    OUT_FOR_DELIVERY: deliveryRider
      ? {
          name: deliveryRider.name,
          detail: [maskPhone(deliveryRider.phone), deliveryRider.zone]
            .filter(Boolean)
            .join(" · "),
        }
      : null,
    DELIVERED: deliveryRider
      ? {
          name: deliveryRider.name,
          detail: [maskPhone(deliveryRider.phone), deliveryRider.zone]
            .filter(Boolean)
            .join(" · "),
        }
      : null,
  }

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
        const handler = stepHandlers[step.key] ?? null

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
                    "flex size-9 shrink-0 items-center justify-center rounded-full border transition-all",
                    isCompleted
                      ? "border-chart-2/30 bg-chart-2/15 text-chart-2"
                      : isCurrent
                        ? "border-primary/30 bg-primary/15 text-primary"
                        : "border-border bg-muted text-muted-foreground/50",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                {(!isLast || hasExceptionAfter) && (
                  <span
                    className={cn(
                      "mt-1 mb-0 w-0.5 flex-1 rounded-full",
                      isCompleted || (isCurrent && currentRank > step.rank)
                        ? "bg-chart-2/50"
                        : "bg-border",
                    )}
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Content */}
              <div
                className={cn(
                  "pb-6",
                  isLast && !hasExceptionAfter && "pb-1",
                  "min-w-0 flex-1 pt-0.5",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      "text-sm leading-none font-medium",
                      reached ? "text-foreground" : "text-muted-foreground/60",
                    )}
                  >
                    {step.label}
                  </p>
                  {isCurrent && (
                    <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                      <span className="bg-primary inline-block size-1.5 animate-pulse rounded-full" />
                      Live
                    </span>
                  )}
                </div>
                {stamp ? (
                  <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                    {stamp}
                  </p>
                ) : (
                  <p className="text-muted-foreground/50 mt-1 text-xs">
                    {step.description}
                  </p>
                )}
                {handler && reached && (
                  <div className="mt-2">
                    <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                      {step.key === "IN_WAREHOUSE" ? "Sorting hub" : "Rider"}
                    </p>
                    <p className="text-foreground text-xs font-medium">
                      {handler.name}
                    </p>
                    {handler.detail && (
                      <p className="text-muted-foreground text-xs">
                        {handler.detail}
                      </p>
                    )}
                  </div>
                )}
                {step.key === "PICKED_UP" && reached && (
                  <div className="mt-2.5">
                    <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                      Pickup proof
                    </p>
                    {order.pickupProofRefs &&
                    order.pickupProofRefs.length > 0 ? (
                      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                        {order.pickupProofRefs.map((link, i) => (
                          <ImageZoom
                            key={i}
                            src={link}
                            alt={`Pickup proof ${i + 1}`}
                            className="size-full object-cover transition-transform hover:scale-105"
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/60 mt-1 inline-flex items-center gap-1.5 text-xs italic">
                        <ImageOff className="size-3.5" />
                        No proof photo uploaded.
                      </span>
                    )}
                  </div>
                )}
                {step.key === "DELIVERED" && reached && (
                  <div className="mt-2.5">
                    <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                      Proof of delivery
                    </p>
                    {order.deliveryProofRef ? (
                      <ImageZoom
                        src={order.deliveryProofRef}
                        alt="Proof of delivery"
                        className="border-border bg-muted mt-1.5 block size-24 overflow-hidden rounded-md border object-cover transition-transform hover:scale-105"
                      />
                    ) : (
                      <span className="text-muted-foreground/60 mt-1 inline-flex items-center gap-1.5 text-xs italic">
                        <ImageOff className="size-3.5" />
                        No proof photo uploaded.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </li>

            {showFailedAfter && (
              <li key="FAILED_ATTEMPT" className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <span className="border-destructive/30 bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center rounded-full border">
                    <XCircle className="size-4" />
                  </span>
                  {/* Connector down to Delivered */}
                  <span
                    className="bg-border my-1 min-h-7 w-0.5 flex-1 rounded-full"
                    aria-hidden="true"
                  />
                </div>
                <div className="pt-0.5 pb-7">
                  <p className="text-destructive text-sm font-medium">
                    Delivery attempt failed
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatStamp(order.failedAttemptAt) ??
                      "A new attempt will be scheduled."}
                  </p>
                  {order.failureNote ? (
                    <p className="bg-destructive/10 text-destructive mt-2 rounded-md px-2.5 py-1.5 text-xs leading-snug">
                      {order.failureNote}
                    </p>
                  ) : null}
                </div>
              </li>
            )}

            {showReturnedAfter && (
              <li key="RETURNED" className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <span className="border-border bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full border">
                    <Undo2 className="size-4" />
                  </span>
                  {/* Connector down to Delivered */}
                  <span
                    className="bg-border my-1 min-h-7 w-0.5 flex-1 rounded-full"
                    aria-hidden="true"
                  />
                </div>
                <div className="pt-0.5 pb-7">
                  <p className="text-sm font-medium">Returned to merchant</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatStamp(order.returnedAt) ??
                      "This parcel was returned and will not be delivered."}
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
