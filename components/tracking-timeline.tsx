"use client"

import {
  PackageCheck,
  ClipboardCheck,
  Bike,
  Warehouse,
  Truck,
  CheckCircle2,
  XCircle,
  Undo2,
  Circle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Order, OrderStatus } from "@/lib/types"

type StepKey =
  | "PLACED"
  | "APPROVED"
  | "PICKED_UP"
  | "IN_WAREHOUSE"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"

// The happy-path order of statuses, used to decide which steps are complete.
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
    description: "The merchant created the shipment.",
    icon: ClipboardCheck,
    rank: 0,
    timestamp: (o) => o.createdAt,
  },
  {
    key: "APPROVED",
    label: "Approved",
    description: "The order was verified and approved for pickup.",
    icon: PackageCheck,
    rank: 1,
    timestamp: (o) => o.approvedAt,
  },
  {
    key: "PICKED_UP",
    label: "Picked up",
    description: "A rider collected the parcel from the merchant.",
    icon: Bike,
    rank: 2,
    timestamp: (o) => o.pickedUpAt,
  },
  {
    key: "IN_WAREHOUSE",
    label: "At sorting hub",
    description: "The parcel arrived at the delivery hub.",
    icon: Warehouse,
    rank: 3,
    timestamp: (o) => o.receivedAtWarehouseAt,
  },
  {
    key: "OUT_FOR_DELIVERY",
    label: "Out for delivery",
    description: "A rider is on the way to the recipient.",
    icon: Truck,
    rank: 4,
    timestamp: (o) => o.outForDeliveryAt ?? o.dispatchedAt,
  },
  {
    key: "DELIVERED",
    label: "Delivered",
    description: "The parcel was handed to the recipient.",
    icon: CheckCircle2,
    rank: 5,
    timestamp: (o) => o.deliveredAt,
  },
]

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

export function TrackingTimeline({ order }: { order: Order }) {
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
        const Icon = step.icon
        const stamp = formatStamp(step.timestamp(order))

        return (
          <li key={step.key} className="flex gap-4">
            {/* Rail */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
                  reached
                    ? "border-chart-2/30 bg-chart-2/15 text-chart-2"
                    : "border-border bg-muted text-muted-foreground",
                  isCurrent &&
                    "ring-chart-2/40 ring-offset-background ring-2 ring-offset-2",
                )}
              >
                <Icon className="size-4" />
              </span>
              {!isLast && (
                <span
                  className={cn(
                    "min-h-8 w-px flex-1",
                    reached && currentRank > step.rank
                      ? "bg-chart-2/40"
                      : "bg-border",
                  )}
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Content */}
            <div className={cn("pb-8", isLast && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-medium",
                  reached ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
                {isCurrent && (
                  <span className="bg-chart-2/15 text-chart-2 ml-2 rounded-full px-2 py-0.5 text-xs font-medium">
                    Current
                  </span>
                )}
              </p>
              <p className="text-muted-foreground text-sm">
                {step.description}
              </p>
              {stamp && (
                <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                  {stamp}
                </p>
              )}
            </div>
          </li>
        )
      })}

      {/* Exception states shown after the happy path */}
      {isFailed && (
        <li className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="border-destructive/25 bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center rounded-full border">
              <XCircle className="size-4" />
            </span>
          </div>
          <div>
            <p className="text-destructive text-sm font-medium">
              Delivery attempt failed
            </p>
            <p className="text-muted-foreground text-sm">
              We could not complete delivery. A new attempt will be scheduled.
            </p>
            {formatStamp(order.failedAttemptAt) && (
              <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                {formatStamp(order.failedAttemptAt)}
              </p>
            )}
          </div>
        </li>
      )}

      {isReturned && (
        <li className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="border-border bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full border">
              <Undo2 className="size-4" />
            </span>
          </div>
          <div>
            <p className="text-foreground text-sm font-medium">
              Returned to merchant
            </p>
            <p className="text-muted-foreground text-sm">
              This parcel was returned and will not be delivered.
            </p>
            {formatStamp(order.returnedAt) && (
              <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                {formatStamp(order.returnedAt)}
              </p>
            )}
          </div>
        </li>
      )}
    </ol>
  )
}

// Tiny helper so the page can render an empty bullet when needed.
export { Circle }
