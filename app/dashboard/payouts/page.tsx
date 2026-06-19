"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Wallet,
  Clock,
  CheckCircle2,
  Banknote,
  Loader2,
  Check,
  X,
  Package,
} from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import type { PayoutRequest } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { PayoutStatusBadge } from "@/components/payout-status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type FilterTab = "PENDING" | "APPROVED" | "HISTORY"

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
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
        </div>
      </CardContent>
    </Card>
  )
}

export default function PayoutsPage() {
  const {
    payoutRequests,
    merchants,
    orders,
    approvePayout,
    rejectPayout,
    markPayoutPaid,
  } = usePlatform()
  const [tab, setTab] = useState<FilterTab>("PENDING")
  const [busy, setBusy] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PayoutRequest | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const orderByIdOrCode = (id: string) => orders.find((o) => o.id === id)

  const pending = payoutRequests.filter((p) => p.status === "PENDING")
  const approved = payoutRequests.filter((p) => p.status === "APPROVED")
  const history = useMemo(
    () =>
      payoutRequests
        .filter((p) => p.status === "PAID" || p.status === "REJECTED")
        .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)),
    [payoutRequests],
  )

  const pendingAmount = pending.reduce((sum, p) => sum + p.amount, 0)
  const approvedAmount = approved.reduce((sum, p) => sum + p.amount, 0)
  const paidAmount = payoutRequests
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0)

  const visible =
    tab === "PENDING" ? pending : tab === "APPROVED" ? approved : history

  async function handleApprove(req: PayoutRequest) {
    setBusy(req.id)
    try {
      const result = await approvePayout(req.id)
      if (result.ok) {
        toast.success(`${req.code} approved. Mark it paid once funds are sent.`)
      } else {
        toast.error(result.error ?? "Unable to approve this request.")
      }
    } finally {
      setBusy(null)
    }
  }

  async function handleMarkPaid(req: PayoutRequest) {
    setBusy(req.id)
    try {
      const result = await markPayoutPaid(req.id)
      if (result.ok) {
        toast.success(`${req.code} marked as paid.`)
      } else {
        toast.error(result.error ?? "Unable to mark this request as paid.")
      }
    } finally {
      setBusy(null)
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return
    const result = await rejectPayout(rejectTarget.id, rejectReason)
    if (result.ok) {
      toast.success(
        `${rejectTarget.code} rejected. Its orders are available again.`,
      )
      setRejectTarget(null)
      setRejectReason("")
    } else {
      toast.error(result.error ?? "Unable to reject this request.")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Merchant payouts"
        description="Review payout requests merchants raise against delivered, COD-settled orders. Approving locks the amount; rejecting releases the orders back to the merchant."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending review"
          value={formatTk(pendingAmount)}
          icon={Clock}
          tone="bg-chart-3/15 text-chart-3"
        />
        <StatCard
          label="Approved, awaiting payment"
          value={formatTk(approvedAmount)}
          icon={Wallet}
          tone="bg-chart-1/15 text-chart-1"
        />
        <StatCard
          label="Total paid out"
          value={formatTk(paidAmount)}
          icon={Banknote}
          tone="bg-chart-2/15 text-chart-2"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="PENDING">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="APPROVED">
            Approved ({approved.length})
          </TabsTrigger>
          <TabsTrigger value="HISTORY">History ({history.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Wallet className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">No payout requests here</p>
              <p className="text-sm text-muted-foreground">
                {tab === "PENDING"
                  ? "New merchant payout requests will appear here for review."
                  : tab === "APPROVED"
                    ? "Approved requests awaiting payment will appear here."
                    : "Paid and rejected requests will appear here."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((req) => {
            const m = merchant(req.merchantId)
            const reqOrders = req.orderIds
              .map((id) => orderByIdOrCode(id))
              .filter(Boolean)
            return (
              <Card key={req.id}>
                <CardContent className="flex flex-col gap-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="leading-tight">
                      <p className="font-mono text-xs text-muted-foreground">
                        {req.code}
                      </p>
                      <p className="mt-0.5 font-semibold">
                        {m?.businessName ?? "Merchant"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Requested{" "}
                        {new Date(req.requestedAt).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <PayoutStatusBadge status={req.status} />
                      <p className="text-2xl font-semibold tabular-nums">
                        {formatTk(req.amount)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Payout method
                      </p>
                      <p className="font-medium">{req.payoutMethod}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Account details
                      </p>
                      <p className="font-medium">{req.payoutDetails}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Package className="size-4 text-muted-foreground" />
                      {reqOrders.length} order
                      {reqOrders.length === 1 ? "" : "s"}
                    </p>
                    <ul className="divide-y divide-border rounded-lg border border-border">
                      {reqOrders.map(
                        (o) =>
                          o && (
                            <li
                              key={o.id}
                              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                            >
                              <span className="font-mono text-xs text-muted-foreground">
                                {o.code}
                              </span>
                              <span className="truncate text-muted-foreground">
                                {o.recipientName}
                              </span>
                              <span className="tabular-nums">
                                {formatTk(o.productCost)}
                              </span>
                            </li>
                          ),
                      )}
                    </ul>
                  </div>

                  {req.status === "REJECTED" && req.rejectReason && (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      Rejected: {req.rejectReason}
                    </p>
                  )}
                  {req.status === "PAID" && req.paidAt && (
                    <p className="flex items-center gap-2 rounded-md bg-chart-2/10 px-3 py-2 text-sm text-chart-2">
                      <CheckCircle2 className="size-4 shrink-0" />
                      Paid on{" "}
                      {new Date(req.paidAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  )}

                  {req.status === "PENDING" && (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRejectTarget(req)
                          setRejectReason("")
                        }}
                        disabled={busy === req.id}
                      >
                        <X className="size-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(req)}
                        disabled={busy === req.id}
                      >
                        {busy === req.id ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Approving
                          </>
                        ) : (
                          <>
                            <Check className="size-4" />
                            Approve
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {req.status === "APPROVED" && (
                    <div className="flex items-center justify-end">
                      <Button
                        size="sm"
                        onClick={() => handleMarkPaid(req)}
                        disabled={busy === req.id}
                      >
                        {busy === req.id ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Updating
                          </>
                        ) : (
                          <>
                            <Banknote className="size-4" />
                            Mark as paid
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null)
            setRejectReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject payout {rejectTarget?.code}</DialogTitle>
            <DialogDescription>
              The {rejectTarget ? formatTk(rejectTarget.amount) : ""} request
              will be rejected and its orders unlocked so the merchant can
              request payout again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Account details do not match the registered merchant."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null)
                setRejectReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!rejectReason.trim()}
            >
              Reject request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
