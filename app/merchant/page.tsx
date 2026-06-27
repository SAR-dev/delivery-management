"use client"

import { useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  Ban,
  Clock,
  Package,
  PackagePlus,
  Truck,
  Wallet,
} from "lucide-react"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { useOrders } from "@/features/orders/hooks/use-orders"
import { usePickupLocations } from "@/features/pickup-locations/hooks/use-pickup-locations"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge"
import { MerchantStatusBadge } from "@/features/merchants/components/merchant-status-badge"
import { TrackingCell } from "@/features/orders/components/tracking-cell"
import { AddressModal } from "@/features/orders/components/address-modal"
import { PickupLocationModal } from "@/features/pickup-locations/components/pickup-location-modal"
import { CancelOrderDialog } from "@/features/orders/dialogs/cancel-order-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { StatCardList } from "@/components/stat-card-list"

export default function MerchantOverviewPage() {
  const { currentUser } = useAuth()
  const { currentMerchant } = useMerchants()
  const { allOrders, isLoading } = useOrders()
  const { pickupLocations } = usePickupLocations()

  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)

  const myOrders = currentMerchant
    ? allOrders.filter((o) => o.merchantId === currentMerchant.id)
    : []

  const pickup = (id: string) => pickupLocations.find((p) => p.id === id)

  function getOrderSearchValue(o: Order, columnId: string): string | null {
    switch (columnId) {
      case "tracking":
        return o.code
      case "recipient":
        return `${o.recipientName} ${o.recipientPhone} ${o.deliveryCity}`
      case "pickup":
        return pickup(o.pickupLocationId)?.label ?? null
      case "weight":
        return `${o.parcelWeightKg} KG`
      case "delivery":
        return String(o.deliveryCharge)
      case "collectible":
        return String(o.totalCollectible)
      case "notes":
        return (
          [o.merchantNote, o.receiverNote].filter(Boolean).join(" ") || null
        )
      case "status":
        return o.status
      default:
        return null
    }
  }

  const inTransit = myOrders.filter((o) =>
    [
      "APPROVED",
      "PICKED_UP",
      "IN_WAREHOUSE",
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
    ].includes(o.status),
  ).length
  const delivered = myOrders.filter((o) => o.status === "DELIVERED").length
  const pending = myOrders.filter((o) => o.status === "PENDING").length
  const codOutstanding = myOrders
    .filter(
      (o) =>
        o.status !== "DELIVERED" &&
        o.status !== "RETURNED" &&
        o.status !== "CANCELLED",
    )
    .reduce((sum, o) => sum + o.productCost, 0)

  const isActive = currentMerchant?.status === "ACTIVE"

  const orderColumns: DataTableColumn<Order>[] = [
    {
      id: "tracking",
      header: "Tracking",
      sortable: true,
      sortValue: (o) => o.code,
      cell: (o) => <TrackingCell code={o.code} />,
    },
    {
      id: "recipient",
      header: "Recipient",
      sortable: true,
      sortValue: (o) => o.recipientName,
      cell: (o) => (
        <AddressModal order={o}>
          <div className="leading-tight">
            <p className="font-medium">{o.recipientName}</p>
            <p className="text-muted-foreground text-xs underline decoration-dotted underline-offset-4">
              {o.deliveryCity}
            </p>
          </div>
        </AddressModal>
      ),
    },
    {
      id: "pickup",
      header: "Pickup",
      sortable: true,
      sortValue: (o) => pickup(o.pickupLocationId)?.label ?? "",
      cell: (o) => {
        const p = pickup(o.pickupLocationId)
        return (
          <PickupLocationModal location={p ?? null}>
            <span className="underline decoration-dotted underline-offset-4">
              {p?.label ?? "—"}
            </span>
          </PickupLocationModal>
        )
      },
    },
    {
      id: "weight",
      header: "Weight",
      align: "right",
      sortable: true,
      sortValue: (o) => o.parcelWeightKg,
      cell: (o) => <span className="tabular-nums">{o.parcelWeightKg} KG</span>,
    },
    {
      id: "delivery",
      header: "Delivery",
      align: "right",
      sortable: true,
      sortValue: (o) => o.deliveryCharge,
      cell: (o) => (
        <span className="tabular-nums">{formatTk(o.deliveryCharge)}</span>
      ),
    },
    {
      id: "collectible",
      header: "Collectible",
      align: "right",
      sortable: true,
      sortValue: (o) => o.totalCollectible,
      cell: (o) => (
        <span className="font-medium tabular-nums">
          {formatTk(o.totalCollectible)}
        </span>
      ),
    },
    {
      id: "notes",
      header: "Notes",
      cell: (o) => (
        <div className="flex items-center gap-1.5">
          {o.merchantNote ? (
            <span
              title={o.merchantNote}
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-600 dark:bg-blue-950 dark:text-blue-400"
            >
              M
            </span>
          ) : null}
          {o.receiverNote ? (
            <span
              title={o.receiverNote}
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-[11px] font-semibold text-red-600 dark:bg-red-950 dark:text-red-400"
            >
              R
            </span>
          ) : null}
          {!o.merchantNote && !o.receiverNote ? (
            <span className="text-muted-foreground/50 text-xs">—</span>
          ) : null}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      sortValue: (o) => o.status,
      cell: (o) => <OrderStatusBadge status={o.status} />,
    },
    {
      id: "actions",
      header: "",
      cell: (o) => {
        const canCancel = o.status === "PENDING" || o.status === "APPROVED"
        if (!canCancel) return null
        return (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              setCancelTarget(o)
              setCancelOpen(true)
            }}
          >
            <Ban className="size-3.5" />
            Cancel
          </Button>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader
        title={pageContent.merchant.overview.title(
          currentUser?.name.split(" ")[0] ?? "Merchant",
        )}
        description={pageContent.merchant.overview.description}
      >
        {isActive ? (
          <Button
            render={<Link href="/merchant/orders/new" />}
            nativeButton={false}
          >
            <PackagePlus className="size-4" />
            Create order
          </Button>
        ) : null}
      </PageHeader>

      {currentMerchant && !isActive ? (
        <Card className="border-chart-3/30 bg-chart-3/5 mb-6">
          <CardContent className="flex items-start gap-3 p-5">
            <AlertCircle className="text-chart-3 mt-0.5 size-5 shrink-0" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">Account not active yet</p>
                <MerchantStatusBadge status={currentMerchant.status} />
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {currentMerchant.status === "PENDING"
                  ? "Your business is awaiting Super Admin approval. Once approved and priced by an Admin, you can start creating orders."
                  : "Your account is currently suspended. Please contact the platform team to restore access."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <StatCardList
        columns={4}
        items={[
          { label: "Total orders", value: myOrders.length, icon: Package },
          {
            label: "In transit",
            value: inTransit,
            hint: "Active deliveries",
            icon: Truck,
          },
          { label: "Pending approval", value: pending, icon: Clock },
          {
            label: "COD outstanding",
            value: formatTk(codOutstanding),
            hint: `${delivered} delivered`,
            icon: Wallet,
          },
        ]}
      />

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your orders</CardTitle>
            <CardDescription>
              Every parcel you&apos;ve created, newest first.
            </CardDescription>
          </div>
          {isActive ? (
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/merchant/orders/new" />}
              nativeButton={false}
            >
              <PackagePlus className="size-4" />
              New
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {myOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
                <Package className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No orders yet</p>
                <p className="text-muted-foreground text-sm">
                  {isActive
                    ? "Create your first delivery order to get started."
                    : "Orders can be created once your account is active."}
                </p>
              </div>
            </div>
          ) : (
            <DataTable
              id="merchant-orders"
              searchable
              getSearchValue={getOrderSearchValue}
              columns={orderColumns}
              data={myOrders}
              getRowKey={(o) => o.id}
              initialSortId="tracking"
              loading={isLoading}
              csv={{
                filename: "orders",
                headers: [
                  "Tracking",
                  "Recipient",
                  "City",
                  "Pickup",
                  "Weight (KG)",
                  "Delivery charge",
                  "Collectible",
                  "Status",
                ],
                parser: (o) => [
                  o.code,
                  o.recipientName,
                  o.deliveryCity,
                  pickup(o.pickupLocationId)?.label ?? "",
                  o.parcelWeightKg,
                  o.deliveryCharge,
                  o.totalCollectible,
                  o.status,
                ],
              }}
            />
          )}
        </CardContent>
      </Card>

      <CancelOrderDialog
        order={cancelTarget}
        open={cancelOpen}
        onOpenChange={(open) => {
          setCancelOpen(open)
          if (!open) setCancelTarget(null)
        }}
      />
    </>
  )
}
