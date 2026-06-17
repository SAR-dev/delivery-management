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
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import { PageHeader } from "@/components/page-header"
import { PayoutStatusBadge } from "@/components/payout-status-badge"
import { PayoutRequestDialog } from "@/components/payout-request-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  tone: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex size-11 items-center justify-center rounded-lg ${tone}`}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}

export default function MerchantFinancePage() {
  const {
    currentMerchant,
    merchantPayableOrders,
    merchantPayoutRequests,
  } = usePlatform()
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

  return (
    <>
      <PageHeader
        title="Financial dashboard"
        description="Phase 9: track your available funds and request payouts. Payouts cover product cost only — delivery charge and security money are retained by the platform."
      >
        <Button onClick={() => setDialogOpen(true)} disabled={!canRequest}>
          <Wallet className="size-4" />
          Request payout
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Available funds"
          value={formatTk(available)}
          hint={`${merchantPayableOrders.length} settled order${
            merchantPayableOrders.length === 1 ? "" : "s"
          }`}
          icon={Banknote}
          tone="bg-chart-2/15 text-chart-2"
        />
        <StatCard
          label="In review"
          value={formatTk(inReview)}
          hint={`${pendingRequests.length} request${
            pendingRequests.length === 1 ? "" : "s"
          }`}
          icon={Clock}
          tone="bg-chart-3/15 text-chart-3"
        />
        <StatCard
          label="Paid out"
          value={formatTk(paidOut)}
          icon={CheckCircle2}
          tone="bg-primary/10 text-primary"
        />
      </div>

      {/* Available funds breakdown */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coins className="size-5 text-primary" />
              Available for payout
            </CardTitle>
            <CardDescription>
              Delivered orders whose cash has been settled and not yet requested.
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
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Package className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No funds available yet</p>
                <p className="text-sm text-muted-foreground">
                  Funds become available once an order is delivered and the
                  warehouse settles the collected cash.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead className="text-right">Product cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merchantPayableOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">
                        {o.code}
                      </TableCell>
                      <TableCell>
                        <div className="leading-tight">
                          <p className="font-medium">{o.recipientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {o.deliveryCity}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {o.deliveredAt
                          ? new Date(o.deliveredAt).toLocaleDateString(
                              undefined,
                              { month: "short", day: "numeric" },
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatTk(o.productCost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Wallet className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No payout requests yet</p>
                <p className="text-sm text-muted-foreground">
                  Submit a request once you have available funds.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {merchantPayoutRequests.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Wallet className="size-5" />
                    </div>
                    <div className="leading-tight">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs text-muted-foreground">
                          {p.code}
                        </p>
                        <PayoutStatusBadge status={p.status} />
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {p.orderIds.length} order
                        {p.orderIds.length === 1 ? "" : "s"} ·{" "}
                        {p.payoutMethod} · {p.payoutDetails}
                      </p>
                      {p.status === "REJECTED" && p.rejectReason ? (
                        <p className="mt-1 flex items-start gap-1.5 text-sm text-destructive">
                          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                          {p.rejectReason}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold tabular-nums">
                      {formatTk(p.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested{" "}
                      {new Date(p.requestedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
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
