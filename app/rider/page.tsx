"use client"

import { useMemo, useState } from "react"
import {
  CheckCircle2,
  Navigation,
  Package,
  PackageCheck,
  PartyPopper,
  Phone,
  Truck,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useRiders } from "@/features/riders/hooks/use-riders"
import { useOrders } from "@/features/orders/hooks/use-orders"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { usePickupLocations } from "@/features/pickup-locations/hooks/use-pickup-locations"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { PickupConfirmDialog } from "@/features/orders/dialogs/pickup-confirm-dialog"
import { PickupLocationModal } from "@/features/pickup-locations/components/pickup-location-modal"
import { DeliveryAttemptDialog } from "@/features/orders/dialogs/delivery-attempt-dialog"
import { OutForDeliveryDialog } from "@/features/orders/dialogs/out-for-delivery-dialog"
import { TrackingCell } from "@/features/orders/components/tracking-cell"
import { AddressModal } from "@/features/orders/components/address-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCardList } from "@/components/stat-card-list"
import { DataTable, type DataTableColumn } from "@/components/data-table"

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

function PhoneLink({ phone }: { phone?: string }) {
  if (!phone) return null
  return (
    <a
      href={`tel:${phone}`}
      onClick={(e) => e.stopPropagation()}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs tabular-nums"
    >
      <Phone className="size-3" />
      {phone}
    </a>
  )
}

function TaskSection({
  title,
  count,
  viewAllHref,
  children,
}: {
  title: string
  count: number
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
        {children}
      </CardContent>
    </Card>
  )
}

export default function RiderTodoPage() {
  const { currentUser } = useAuth()
  const { currentRider } = useRiders()
  const { orders } = useOrders()
  const { merchants } = useMerchants()
  const { pickupLocations } = usePickupLocations()

  const [pickupTarget, setPickupTarget] = useState<Order | null>(null)
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false)
  const [startTarget, setStartTarget] = useState<Order | null>(null)
  const [startDialogOpen, setStartDialogOpen] = useState(false)
  const [deliveryTarget, setDeliveryTarget] = useState<Order | null>(null)
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const merchantName = (id: string) => merchant(id)?.businessName ?? "Merchant"
  const pickup = (id: string) => pickupLocations.find((p) => p.id === id)

  function getPickupSearchValue(o: Order, columnId: string): string | null {
    switch (columnId) {
      case "order":
        return o.code
      case "merchant":
        return merchantName(o.merchantId)
      case "pickup":
        return pickup(o.pickupLocationId)?.label ?? null
      case "contact":
        return merchant(o.merchantId)?.phone ?? null
      default:
        return null
    }
  }

  function getStartSearchValue(o: Order, columnId: string): string | null {
    switch (columnId) {
      case "order":
        return `${o.code} ${o.recipientName}`
      case "destination":
        return `${o.deliveryCity} ${o.deliveryAddress}`
      case "contact":
        return o.recipientPhone
      default:
        return null
    }
  }

  function getDeliverSearchValue(o: Order, columnId: string): string | null {
    switch (columnId) {
      case "order":
        return `${o.code} ${o.recipientName}`
      case "destination":
        return `${o.deliveryCity} ${o.deliveryAddress}`
      case "contact":
        return o.recipientPhone
      case "collectible":
        return String(o.totalCollectible)
      default:
        return null
    }
  }

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
  const pickedUpToday = myPickups.filter((o) => isToday(o.pickedUpAt)).length

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

  // Pickup needs merchant info only — no recipient details yet.
  const pickupColumns: DataTableColumn<Order>[] = [
    {
      id: "order",
      header: "Order ID",
      sortable: true,
      sortValue: (o) => o.code,
      cell: (o) => <TrackingCell code={o.code} />,
    },
    {
      id: "merchant",
      header: "Merchant",
      sortable: true,
      sortValue: (o) => merchantName(o.merchantId),
      cell: (o) => (
        <span className="font-medium">{merchantName(o.merchantId)}</span>
      ),
    },
    {
      id: "pickup",
      header: "Pickup from",
      sortable: true,
      sortValue: (o) => pickup(o.pickupLocationId)?.label ?? "",
      cell: (o) => {
        const p = pickup(o.pickupLocationId)
        return (
          <PickupLocationModal location={p ?? null}>
            <div className="flex flex-col">
              <span className="underline decoration-dotted underline-offset-4">
                {p?.label ?? "Pickup point"}
              </span>
              <span className="text-muted-foreground text-xs">
                {p?.address ?? ""}
              </span>
            </div>
          </PickupLocationModal>
        )
      },
    },
    {
      id: "contact",
      header: "Contact",
      cell: (o) => <PhoneLink phone={merchant(o.merchantId)?.phone} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      headClassName: "w-12",
      cell: (o) => (
        <Button size="sm" onClick={() => openPickup(o)}>
          <PackageCheck className="size-4" />
          Mark picked up
        </Button>
      ),
    },
  ]

  // IN_TRANSIT: parcel already handed over — just start the route.
  const startColumns: DataTableColumn<Order>[] = [
    {
      id: "order",
      header: "Order",
      sortable: true,
      sortValue: (o) => o.code,
      cell: (o) => (
        <div className="flex flex-col">
          <TrackingCell code={o.code} />
          <span className="font-medium">{o.recipientName}</span>
        </div>
      ),
    },
    {
      id: "destination",
      header: "Destination",
      sortable: true,
      sortValue: (o) => o.deliveryCity,
      cell: (o) => (
        <AddressModal order={o}>
          <div className="flex flex-col">
            <span className="underline decoration-dotted underline-offset-4">
              {o.deliveryCity}
            </span>
            <span className="text-muted-foreground text-xs">
              {o.deliveryAddress}
            </span>
          </div>
        </AddressModal>
      ),
    },
    {
      id: "contact",
      header: "Contact",
      cell: (o) => <PhoneLink phone={o.recipientPhone} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      headClassName: "w-12",
      cell: (o) => (
        <Button size="sm" onClick={() => openStartDelivery(o)}>
          <Navigation className="size-4" />
          Out for delivery
        </Button>
      ),
    },
  ]

  // Delivery needs recipient info + the amount to collect.
  const deliverColumns: DataTableColumn<Order>[] = [
    {
      id: "order",
      header: "Order",
      sortable: true,
      sortValue: (o) => o.code,
      cell: (o) => (
        <div className="flex flex-col">
          <TrackingCell code={o.code} />
          <span className="font-medium">{o.recipientName}</span>
        </div>
      ),
    },
    {
      id: "destination",
      header: "Destination",
      sortable: true,
      sortValue: (o) => o.deliveryCity,
      cell: (o) => (
        <AddressModal order={o}>
          <div className="flex flex-col">
            <span className="underline decoration-dotted underline-offset-4">
              {o.deliveryCity}
            </span>
            <span className="text-muted-foreground text-xs">
              {o.deliveryAddress}
            </span>
          </div>
        </AddressModal>
      ),
    },
    {
      id: "contact",
      header: "Contact",
      cell: (o) => <PhoneLink phone={o.recipientPhone} />,
    },
    {
      id: "collectible",
      header: "Collect",
      align: "right",
      sortable: true,
      sortValue: (o) => o.totalCollectible,
      cell: (o) => (
        <span className="tabular-nums">{formatTk(o.totalCollectible)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      headClassName: "w-12",
      cell: (o) => (
        <Button size="sm" onClick={() => openDelivery(o)}>
          <CheckCircle2 className="size-4" />
          Record outcome
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={pageContent.rider.todo.title(
          currentUser?.name.split(" ")[0] ?? "Rider",
        )}
        description={pageContent.rider.todo.description}
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
              No pending pickups or deliveries right now. New tasks will show up
              here as soon as they&apos;re assigned to you.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          <TaskSection
            title="Pick up from merchant"
            count={toPickup.length}
            viewAllHref="/rider/pickup"
          >
            <DataTable
              id="rider-pickups"
              searchable
              getSearchValue={getPickupSearchValue}
              columns={pickupColumns}
              data={toPickup}
              getRowKey={(o) => o.id}
              initialSortId="order"
              pageSize={5}
              emptyMessage="No pickups waiting."
            />
          </TaskSection>

          {/* Same underlying queue as "Deliver to recipient" below, so it
              doesn't need its own "View queue" link. */}
          <TaskSection title="Start delivery run" count={toStart.length}>
            <DataTable
              id="rider-start-delivery"
              searchable
              getSearchValue={getStartSearchValue}
              columns={startColumns}
              data={toStart}
              getRowKey={(o) => o.id}
              initialSortId="order"
              pageSize={5}
              emptyMessage="Nothing dispatched to you yet."
            />
          </TaskSection>

          <TaskSection
            title="Deliver to recipient"
            count={toDeliver.length}
            viewAllHref="/rider/delivery"
          >
            <DataTable
              id="rider-deliver"
              searchable
              getSearchValue={getDeliverSearchValue}
              columns={deliverColumns}
              data={toDeliver}
              getRowKey={(o) => o.id}
              initialSortId="order"
              pageSize={5}
              emptyMessage="Nothing out for delivery right now."
            />
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
        pickupLocation={
          pickupTarget ? (pickup(pickupTarget.pickupLocationId) ?? null) : null
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
