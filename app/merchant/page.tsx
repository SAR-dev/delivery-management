"use client"

import Link from "next/link"
import { useState } from "react"
import {
  PackagePlus,
  Package,
  Wallet,
  Truck,
  Clock,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { OrderStatusBadge } from "@/components/badge/order-status-badge"
import { MerchantStatusBadge } from "@/components/badge/merchant-status-badge"
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

function TrackingCell({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const path = `/track?code=${encodeURIComponent(code)}`

  async function copyLink() {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : path
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard may be unavailable; silently ignore.
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-xs">{code}</span>
      <button
        type="button"
        onClick={copyLink}
        aria-label={
          copied ? "Tracking link copied" : "Copy public tracking link"
        }
        title="Copy public tracking link"
        className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors"
      >
        {copied ? (
          <Check className="text-chart-2 size-3.5" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
      <Link
        href={path}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open public tracking page"
        title="Open public tracking page"
        className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors"
      >
        <ExternalLink className="size-3.5" />
      </Link>
    </div>
  )
}

export default function MerchantOverviewPage() {
  const { currentUser, currentMerchant, orders } = usePlatform()

  const myOrders = currentMerchant
    ? orders.filter((o) => o.merchantId === currentMerchant.id)
    : []

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
        <div className="leading-tight">
          <p className="font-medium">{o.recipientName}</p>
          <p className="text-muted-foreground text-xs">{o.deliveryCity}</p>
        </div>
      ),
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
        title={`Welcome, ${currentUser?.name.split(" ")[0] ?? "Merchant"}`}
        description="Create delivery orders and track them in real time."
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
