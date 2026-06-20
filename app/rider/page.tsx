"use client"

import { useMemo, useState } from "react"
import {
  Package,
  PackageCheck,
  Navigation,
  CheckCircle2,
  Truck,
  Store,
  User,
  PartyPopper,
  Phone,
} from "lucide-react"
import Link from "next/link"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { PickupConfirmDialog } from "@/components/dialog/pickup-confirm-dialog"
import { DeliveryAttemptDialog } from "@/components/dialog/delivery-attempt-dialog"
import { OutForDeliveryDialog } from "@/components/dialog/out-for-delivery-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCardList } from "@/components/stat-card-list"

function isToday(iso?: string | null) {
  if (!iso) return false
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function TaskRow({
                   icon: Icon,
                   tone,
                   title,
                   subtitle,
                   phone,
                   meta,
                   actionLabel,
                   actionIcon: ActionIcon,
                   onAction,
                 }: {
  icon: React.ComponentType<{ className?: string }>
  tone: string
  title: string
  subtitle: string
  phone?: string
  meta?: string
  actionLabel: string
  actionIcon: React.ComponentType<{ className?: string }>
  onAction: () => void
}) {
  return (
    <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${tone}`}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="text-muted-foreground truncate text-xs">
            {subtitle}
          </p>
          {phone ? (
            <a
              href={`tel:${phone}`}
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs tabular-nums"
            >
              <Phone className="size-3" />
              {phone}
            </a>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {meta ? (
          <span className="text-muted-foreground hidden text-xs tabular-nums sm:inline">
            {meta}
          </span>
        ) : null}
        <Button size="sm" onClick={onAction}>
          <ActionIcon className="size-4" />
          {actionLabel}
        </Button>
      </div>
    </div>
  )
}

function TaskSection({
                       title,
                       count,
                       emptyMessage,
                       viewAllHref,
                       children,
                     }: {
  title: string
  count: number
  emptyMessage: string
  /** Omit when another section in the same group already links to this queue. */
  viewAllHref?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-border flex items-center justify-between border-b px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">{title}</h2>
            <Badge variant="secondary">{count}</Badge>
          </div>
          {viewAllHref ? (
            <Link
              href={viewAllHref}
              className="text-muted-foreground hover:text-foreground text-xs font-medium"
            >
              View queue
            </Link>
          ) : null}
        </div>
        {count === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-sm sm:px-5">
            {emptyMessage}
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

export default function RiderTodoPage() {
  const {
    currentUser,
    currentRider,
    orders,
    merchants,
    pickupLocations,
  } = usePlatform()

  const [pickupTarget, setPickupTarget] = useState<Order | null>(null)
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false)
  const [startTarget, setStartTarget] = useState<Order | null>(null)
  const [startDialogOpen, setStartDialogOpen] = useState(false)
  const [deliveryTarget, setDeliveryTarget] = useState<Order | null>(null)
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const pickup = (id: string) => pickupLocations.find((p) => p.id === id)

  const myPickups = useMemo(
    () =>
      currentRider
        ? orders.filter((o) => o.pickupRiderId === currentRider.id)
        : [],
    [orders, currentRider],
  )
  const myDeliveries = useMemo(
    () =>
      currentRider
        ? orders.filter((o) => o.deliveryRiderId === currentRider.id)
        : [],
    [orders, currentRider],
  )

  // Three concrete to-do groups, each needing one action from the rider.
  const toPickup = myPickups.filter((o) => o.status === "APPROVED")
  const toStart = myDeliveries.filter((o) => o.status === "IN_TRANSIT")
  const toDeliver = myDeliveries.filter((o) => o.status === "OUT_FOR_DELIVERY")

  const deliveredToday = myDeliveries.filter(
    (o) => o.status === "DELIVERED" && isToday(o.deliveredAt),
  ).length
  const pickedUpToday = myPickups.filter((o) =>
    isToday(o.pickedUpAt),
  ).length

  const totalTasks = toPickup.length + toStart.length + toDeliver.length

  function openPickup(order: Order) {
    setPickupTarget(order)
    setPickupDialogOpen(true)
  }

  function openStartDelivery(order: Order) {
    setStartTarget(order)
    setStartDialogOpen(true)
  }

  function openDelivery(order: Order) {
    setDeliveryTarget(order)
    setDeliveryDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Today's tasks, ${currentUser?.name.split(" ")[0] ?? "Rider"}`}
        description="Everything that needs your attention right now, in one list."
      />

      <StatCardList
        columns={4}
        items={[
          {
            label: "To pick up",
            value: toPickup.length,
            icon: PackageCheck,
            tone: "bg-chart-1/15 text-chart-1",
          },
          {
            label: "Picked up today",
            value: pickedUpToday,
            icon: Package,
            tone: "bg-chart-3/15 text-chart-3",
          },
          {
            label: "To deliver",
            value: toStart.length + toDeliver.length,
            icon: Truck,
            tone: "bg-chart-4/15 text-chart-4",
          },
          {
            label: "Delivered today",
            value: deliveredToday,
            icon: CheckCircle2,
            tone: "bg-chart-2/15 text-chart-2",
          },
        ]}
      />

      {totalTasks === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <PartyPopper className="text-chart-2 size-8" />
            <p className="font-medium">All caught up</p>
            <p className="text-muted-foreground max-w-sm text-sm">
              No pending pickups or deliveries right now. New tasks will show
              up here as soon as they're assigned to you.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Pickup needs merchant info only — no recipient details yet. */}
          <TaskSection
            title="Pick up from merchant"
            count={toPickup.length}
            emptyMessage="No pickups waiting."
            viewAllHref="/rider/pickup"
          >
            {toPickup.map((o) => {
              const m = merchant(o.merchantId)
              const p = pickup(o.pickupLocationId)
              return (
                <TaskRow
                  key={o.id}
                  icon={Store}
                  tone="bg-chart-1/15 text-chart-1"
                  title={`${o.code} · ${m?.businessName ?? "Merchant"}`}
                  subtitle={`${p?.label ?? "Pickup point"} — ${p?.address ?? ""}`}
                  phone={m?.phone}
                  actionLabel="Mark picked up"
                  actionIcon={PackageCheck}
                  onAction={() => openPickup(o)}
                />
              )
            })}
          </TaskSection>

          {/* IN_TRANSIT: the parcel has already been handed to you by the
              warehouse — this just needs a tap to start the route. Same
              underlying queue as "Deliver to recipient" below, so it
              doesn't need its own "View queue" link. */}
          <TaskSection
            title="Start delivery run"
            count={toStart.length}
            emptyMessage="Nothing dispatched to you yet."
          >
            {toStart.map((o) => (
              <TaskRow
                key={o.id}
                icon={User}
                tone="bg-chart-4/15 text-chart-4"
                title={`${o.code} · ${o.recipientName}`}
                subtitle={`${o.deliveryAddress}, ${o.deliveryCity}`}
                phone={o.recipientPhone}
                actionLabel="Out for delivery"
                actionIcon={Navigation}
                onAction={() => openStartDelivery(o)}
              />
            ))}
          </TaskSection>

          {/* Delivery needs recipient info only — no merchant details. */}
          <TaskSection
            title="Deliver to recipient"
            count={toDeliver.length}
            emptyMessage="Nothing out for delivery right now."
            viewAllHref="/rider/delivery"
          >
            {toDeliver.map((o) => (
              <TaskRow
                key={o.id}
                icon={User}
                tone="bg-chart-2/15 text-chart-2"
                title={`${o.code} · ${o.recipientName}`}
                subtitle={`${o.deliveryAddress}, ${o.deliveryCity}`}
                phone={o.recipientPhone}
                meta={`Collect ${formatTk(o.totalCollectible)}`}
                actionLabel="Record outcome"
                actionIcon={CheckCircle2}
                onAction={() => openDelivery(o)}
              />
            ))}
          </TaskSection>
        </div>
      )}

      <PickupConfirmDialog
        order={pickupTarget}
        merchantName={
          pickupTarget
            ? (merchant(pickupTarget.merchantId)?.businessName ?? "Merchant")
            : ""
        }
        pickupLabel={
          pickupTarget ? (pickup(pickupTarget.pickupLocationId)?.label ?? "—") : ""
        }
        pickupAddress={
          pickupTarget
            ? (pickup(pickupTarget.pickupLocationId)?.address ?? "—")
            : ""
        }
        open={pickupDialogOpen}
        onOpenChange={setPickupDialogOpen}
      />

      <OutForDeliveryDialog
        order={startTarget}
        open={startDialogOpen}
        onOpenChange={setStartDialogOpen}
      />

      <DeliveryAttemptDialog
        order={deliveryTarget}
        open={deliveryDialogOpen}
        onOpenChange={setDeliveryDialogOpen}
      />
    </div>
  )
}
