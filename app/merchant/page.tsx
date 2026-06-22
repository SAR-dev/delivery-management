"use client"

import Link from "next/link"
import {
  PackagePlus,
  Package,
  Wallet,
  Truck,
  Clock,
  AlertCircle,
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
  const { orders } = useOrders()
  const { pickupLocations } = usePickupLocations()

  const myOrders = currentMerchant
    ? orders.filter((o) => o.merchantId === currentMerchant.id)
    : []

  const pickup = (id: string) => pickupLocations.find((p) => p.id === id)

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
    .filter((o) => o.status !== "DELIVERED" && o.status !== "RETURNED")
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
      id: "status",
      header: "Status",
      sortable: true,
      sortValue: (o) => o.status,
      cell: (o) => <OrderStatusBadge status={o.status} />,
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
              columns={orderColumns}
              data={myOrders}
              getRowKey={(o) => o.id}
              initialSortId="tracking"
            />
          )}
        </CardContent>
      </Card>
    </>
  )
}
