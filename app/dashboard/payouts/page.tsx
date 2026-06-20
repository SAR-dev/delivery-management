"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Wallet, Clock, Banknote, Loader2, Check, X } from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import type { PayoutRequest } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { PayoutStatusBadge } from "@/components/dialog/payout-status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatCardList } from "@/components/stat-card-list"

type FilterTab = "PENDING" | "APPROVED" | "HISTORY"

export default function PayoutsPage() {
  const {
    payoutRequests,
    merchants,
    approvePayout,
    rejectPayout,
    markPayoutPaid,
  } = usePlatform()
  const [tab, setTab] = useState<FilterTab>("PENDING")
  const [busy, setBusy] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PayoutRequest | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const merchantName = (id: string) => merchant(id)?.businessName ?? "Merchant"

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

  const columns: DataTableColumn<PayoutRequest>[] = [
    {
      id: "request",
      header: "Request",
      sortable: true,
      sortValue: (p) => p.code,
      cell: (p) => (
        <div className="flex flex-col">
          <span className="text-muted-foreground font-mono text-xs">
            {p.code}
          </span>
          <span className="font-medium">{merchantName(p.merchantId)}</span>
        </div>
      ),
    },
    {
      id: "method",
      header: "Method",
      sortable: true,
      sortValue: (p) => p.payoutMethod,
      cell: (p) => (
        <div className="flex flex-col">
          <span>{p.payoutMethod}</span>
          <span className="text-muted-foreground text-xs">
            {p.payoutDetails}
          </span>
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
        new Date(p.requestedAt).toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
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
            <span className="text-destructive max-w-48 text-xs">
              {p.rejectReason}
            </span>
          ) : null}
          {p.status === "PAID" && p.paidAt ? (
            <span className="text-chart-2 text-xs">
              Paid{" "}
              {new Date(p.paidAt).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
              })}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      headClassName: "w-12",
      cell: (p) =>
        p.status === "PENDING" ? (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectTarget(p)
                setRejectReason("")
              }}
              disabled={busy === p.id}
            >
              <X className="size-4" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => handleApprove(p)}
              disabled={busy === p.id}
            >
              {busy === p.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Approve
            </Button>
          </div>
        ) : p.status === "APPROVED" ? (
          <Button
            size="sm"
            onClick={() => handleMarkPaid(p)}
            disabled={busy === p.id}
          >
            {busy === p.id ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Banknote className="size-4" />
            )}
            Mark as paid
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Merchant payouts"
        description="Review payout requests merchants raise against delivered, COD-settled orders. Approving locks the amount; rejecting releases the orders back to the merchant."
      />

      <StatCardList
        items={[
          {
            label: "Pending review",
            value: formatTk(pendingAmount),
            icon: Clock,
            tone: "bg-chart-3/15 text-chart-3",
          },
          {
            label: "Approved, awaiting payment",
            value: formatTk(approvedAmount),
            icon: Wallet,
            tone: "bg-chart-1/15 text-chart-1",
          },
          {
            label: "Total paid out",
            value: formatTk(paidAmount),
            icon: Banknote,
            tone: "bg-chart-2/15 text-chart-2",
          },
        ]}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="PENDING">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="APPROVED">
            Approved ({approved.length})
          </TabsTrigger>
          <TabsTrigger value="HISTORY">History ({history.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={visible}
            getRowKey={(p) => p.id}
            initialSortId="requested"
            initialSortDir="desc"
            searchable
            searchPlaceholder="Search code, merchant, method"
            getSearchText={(p) =>
              `${p.code} ${merchantName(p.merchantId)} ${p.payoutMethod} ${p.payoutDetails}`
            }
            emptyMessage={
              tab === "PENDING"
                ? "No payout requests to review. New merchant requests will appear here."
                : tab === "APPROVED"
                  ? "No approved requests awaiting payment."
                  : "No paid or rejected requests yet."
            }
          />
        </CardContent>
      </Card>

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
