"use client"

import { useState } from "react"
import {
  Wallet,
  Banknote,
  Clock,
  CheckCircle2,
  Coins,
  Package,
  AlertCircle,
} from "lucide-react"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { useOrders } from "@/features/orders/hooks/use-orders"
import { usePayouts } from "@/features/payouts/hooks/use-payouts"
import { formatTk } from "@/lib/pricing"
import type { Order, PayoutRequest } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { PayoutStatusBadge } from "@/features/payouts/components/payout-status-badge"
import { PayoutRequestDialog } from "@/features/payouts/dialogs/payout-request-dialog"
import { TrackingCell } from "@/features/orders/components/tracking-cell"
import { AddressModal } from "@/features/orders/components/address-modal"
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

export default function MerchantFinancePage() {
  const { currentMerchant } = useMerchants()
  const { merchantPayableOrders } = useOrders()
  const { merchantPayoutRequests } = usePayouts()
  const [dialogOpen, setDialogOpen] = useState(false)

  const available = merchantPayableOrders.reduce(
    (sum, o) => sum + o.productCost,
    0,
  )
  const pendingRequests = merchantPayoutRequests.filter(
    (p) => p.status === "PENDING" || p.status === "APPROVED",
  )
  const inReview = pendingRequests.reduce((sum, p) => sum + p.amount, 0)
  const paidOut = merchantPayoutRequests
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0)

  const isActive = currentMerchant?.status === "ACTIVE"
  const canRequest = isActive && merchantPayableOrders.length > 0

  const payableColumns: DataTableColumn<Order>[] = [
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
      id: "delivered",
      header: "Delivered",
      sortable: true,
      sortValue: (o) => o.deliveredAt ?? "",
      cellClassName: "text-sm text-muted-foreground",
      cell: (o) =>
        o.deliveredAt
          ? new Date(o.deliveredAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })
          : "—",
    },
    {
      id: "productCost",
      header: "Product cost",
      align: "right",
      sortable: true,
      sortValue: (o) => o.productCost,
      cell: (o) => (
        <span className="font-medium tabular-nums">
          {formatTk(o.productCost)}
        </span>
      ),
    },
  ]

  const requestColumns: DataTableColumn<PayoutRequest>[] = [
    {
      id: "code",
      header: "Request",
      sortable: true,
      sortValue: (p) => p.code,
      cellClassName: "font-mono text-xs",
      cell: (p) => p.code,
    },
    {
      id: "method",
      header: "Method",
      sortable: true,
      sortValue: (p) => p.payoutMethod,
      cell: (p) => (
        <div className="leading-tight">
          <p>{p.payoutMethod}</p>
          <p className="text-muted-foreground text-xs">{p.payoutDetails}</p>
        </div>
      ),
    },
    {
      id: "orders",
      header: "Orders",
      align: "center",
      sortable: true,
      sortValue: (p) => p.orderIds.length,
      cell: (p) => <span className="tabular-nums">{p.orderIds.length}</span>,
    },
    {
      id: "requested",
      header: "Requested",
      sortable: true,
      sortValue: (p) => p.requestedAt,
      cellClassName: "text-sm text-muted-foreground",
      cell: (p) =>
        new Date(p.requestedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      sortValue: (p) => p.amount,
      cell: (p) => (
        <span className="font-semibold tabular-nums">{formatTk(p.amount)}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      sortValue: (p) => p.status,
      cell: (p) => (
        <div className="flex flex-col gap-1">
          <PayoutStatusBadge status={p.status} />
          {p.status === "REJECTED" && p.rejectReason ? (
            <span className="text-destructive flex max-w-48 items-start gap-1 text-xs">
              <AlertCircle className="mt-0.5 size-3 shrink-0" />
              {p.rejectReason}
            </span>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title={pageContent.merchant.finance.title}
        description={pageContent.merchant.finance.description}
      >
        <Button onClick={() => setDialogOpen(true)} disabled={!canRequest}>
          <Wallet className="size-4" />
          Request payout
        </Button>
      </PageHeader>

      <StatCardList
        items={[
          {
            label: "Available funds",
            value: formatTk(available),
            hint: `${merchantPayableOrders.length} settled order${
              merchantPayableOrders.length === 1 ? "" : "s"
            }`,
            icon: Banknote,
            tone: "bg-chart-2/15 text-chart-2",
          },
          {
            label: "In review",
            value: formatTk(inReview),
            hint: `${pendingRequests.length} request${
              pendingRequests.length === 1 ? "" : "s"
            }`,
            icon: Clock,
            tone: "bg-chart-3/15 text-chart-3",
          },
          {
            label: "Paid out",
            value: formatTk(paidOut),
            icon: CheckCircle2,
            tone: "bg-primary/10 text-primary",
          },
        ]}
      />

      {/* Available funds breakdown */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coins className="text-primary size-5" />
              Available for payout
            </CardTitle>
            <CardDescription>
              Delivered orders whose cash has been settled and not yet
              requested.
            </CardDescription>
          </div>
          {canRequest ? (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Wallet className="size-4" />
              Request {formatTk(available)}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {merchantPayableOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
                <Package className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No funds available yet</p>
                <p className="text-muted-foreground text-sm">
                  Funds become available once an order is delivered and the
                  warehouse settles the collected cash.
                </p>
              </div>
            </div>
          ) : (
            <DataTable
              columns={payableColumns}
              data={merchantPayableOrders}
              getRowKey={(o) => o.id}
              initialSortId="tracking"
              csv={{
                filename: "available-for-payout",
                headers: [
                  "Tracking",
                  "Recipient",
                  "City",
                  "Delivered",
                  "Product cost",
                ],
                parser: (o) => [
                  o.code,
                  o.recipientName,
                  o.deliveryCity,
                  o.deliveredAt
                    ? new Date(o.deliveredAt).toLocaleDateString()
                    : "",
                  o.productCost,
                ],
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Payout request history */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Payout requests</CardTitle>
          <CardDescription>
            Every payout you&apos;ve requested, newest first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {merchantPayoutRequests.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
                <Wallet className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No payout requests yet</p>
                <p className="text-muted-foreground text-sm">
                  Submit a request once you have available funds.
                </p>
              </div>
            </div>
          ) : (
            <DataTable
              columns={requestColumns}
              data={merchantPayoutRequests}
              getRowKey={(p) => p.id}
              initialSortId="requested"
              initialSortDir="desc"
              csv={{
                filename: "payout-requests",
                headers: [
                  "Request",
                  "Method",
                  "Details",
                  "Orders",
                  "Requested",
                  "Amount",
                  "Status",
                ],
                parser: (p) => [
                  p.code,
                  p.payoutMethod,
                  p.payoutDetails,
                  p.orderIds.length,
                  new Date(p.requestedAt).toLocaleDateString(),
                  p.amount,
                  p.status,
                ],
              }}
            />
          )}
        </CardContent>
      </Card>

      <PayoutRequestDialog
        payableOrders={merchantPayableOrders}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
