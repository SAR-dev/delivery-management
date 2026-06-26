"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Banknote, Check, Clock, Loader2, Wallet, X } from "lucide-react"
import { usePayouts } from "@/features/payouts/hooks/use-payouts"
import { usePayoutRequestColumns } from "@/features/payouts/components/payout-table-columns"
import { formatTk } from "@/lib/pricing"
import type { PayoutRequest } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
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
    allPayoutRequests,
    approvePayout,
    rejectPayout,
    markPayoutPaid,
  } = usePayouts()
  const baseColumns = usePayoutRequestColumns({ showMerchantName: true })
  const [tab, setTab] = useState<FilterTab>("PENDING")
  const [busy, setBusy] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PayoutRequest | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  // Search narrows what's displayed in the table; stats and tab counts
  // always reflect the full request set.
  const pending = payoutRequests.filter((p) => p.status === "PENDING")
  const approved = payoutRequests.filter((p) => p.status === "APPROVED")
  const history = useMemo(
    () =>
      payoutRequests
        .filter((p) => p.status === "PAID" || p.status === "REJECTED")
        .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)),
    [payoutRequests],
  )

  const totalPending = allPayoutRequests.filter(
    (p) => p.status === "PENDING",
  ).length
  const totalApproved = allPayoutRequests.filter(
    (p) => p.status === "APPROVED",
  ).length
  const totalHistory = allPayoutRequests.filter(
    (p) => p.status === "PAID" || p.status === "REJECTED",
  ).length

  const pendingAmount = allPayoutRequests
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + p.amount, 0)
  const approvedAmount = allPayoutRequests
    .filter((p) => p.status === "APPROVED")
    .reduce((sum, p) => sum + p.amount, 0)
  const paidAmount = allPayoutRequests
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
    ...baseColumns,
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
        title={pageContent.dashboard.payouts.title}
        description={pageContent.dashboard.payouts.description}
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
          <TabsList>
            <TabsTrigger value="PENDING">Pending ({totalPending})</TabsTrigger>
            <TabsTrigger value="APPROVED">
              Approved ({totalApproved})
            </TabsTrigger>
            <TabsTrigger value="HISTORY">History ({totalHistory})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            id="dashboard-payouts"
            searchable
            columns={columns}
            data={visible}
            getRowKey={(p) => p.id}
            initialSortId="requested"
            initialSortDir="desc"
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
