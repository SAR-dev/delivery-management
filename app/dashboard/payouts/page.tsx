"use client"

import { useEffect, useState } from "react"
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
import { ConfirmDialog } from "@/components/confirm-dialog"

type FilterTab = "PENDING" | "APPROVED" | "HISTORY"

const TAB_STATUSES: Record<FilterTab, string[] | undefined> = {
  PENDING: ["PENDING"],
  APPROVED: ["APPROVED"],
  HISTORY: ["PAID", "REJECTED"],
}

export default function PayoutsPage() {
  const {
    payoutRequests,
    allPayoutRequests,
    total,
    page: _page,
    setPage,
    limit: _limit,
    setLimit,
    query,
    setQuery,
    statuses: _statuses,
    setStatuses,
    sortId,
    sortDir,
    onSortChange,
    approvePayout,
    rejectPayout,
    isLoading,
    markPayoutPaid,
  } = usePayouts()
  const baseColumns = usePayoutRequestColumns({ showMerchantName: true })
  const [tab, setTab] = useState<FilterTab>("PENDING")
  const [busy, setBusy] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PayoutRequest | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [confirmPayout, setConfirmPayout] = useState<PayoutRequest | null>(null)
  const [confirmAction, setConfirmAction] = useState<
    "approve" | "markPaid" | null
  >(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    setStatuses(TAB_STATUSES[tab])
    setPage(1)
  }, [tab, setStatuses, setPage])

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

  function openConfirm(req: PayoutRequest, action: "approve" | "markPaid") {
    setConfirmPayout(req)
    setConfirmAction(action)
    setConfirmOpen(true)
  }

  async function handleConfirm() {
    if (!confirmPayout || !confirmAction) return
    setBusy(confirmPayout.id)
    try {
      if (confirmAction === "approve") {
        const result = await approvePayout(confirmPayout.id)
        if (result.ok) {
          toast.success(
            `${confirmPayout.code} approved. Mark it paid once funds are sent.`,
          )
        } else {
          toast.error(result.error ?? "Unable to approve this request.")
        }
      } else {
        const result = await markPayoutPaid(confirmPayout.id)
        if (result.ok) {
          toast.success(`${confirmPayout.code} marked as paid.`)
        } else {
          toast.error(result.error ?? "Unable to mark this request as paid.")
        }
      }
    } finally {
      setBusy(null)
      setConfirmOpen(false)
      setConfirmPayout(null)
      setConfirmAction(null)
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
              onClick={() => openConfirm(p, "approve")}
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
            onClick={() => openConfirm(p, "markPaid")}
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
            data={payoutRequests}
            getRowKey={(p) => p.id}
            initialSortId="requested"
            initialSortDir="desc"
            loading={isLoading}
            emptyMessage={
              tab === "PENDING"
                ? "No payout requests to review. New merchant requests will appear here."
                : tab === "APPROVED"
                  ? "No approved requests awaiting payment."
                  : "No paid or rejected requests yet."
            }
            serverPaginated
            total={total}
            query={query}
            onQueryChange={setQuery}
            onPageChange={(p, l) => {
              setPage(p)
              setLimit(l)
            }}
            serverSortId={sortId}
            serverSortDir={sortDir}
            onSortChange={onSortChange}
            csvData={allPayoutRequests}
            csv={{
              filename: "payout-requests",
              headers: [
                "Request",
                "Amount",
                "Status",
                "Method",
                "Details",
                "Orders",
                "Requested",
              ],
              parser: (p) => [
                p.code,
                p.amount,
                p.status,
                p.payoutMethod,
                p.payoutDetails,
                p.orderIds.length,
                new Date(p.requestedAt).toLocaleDateString(),
              ],
            }}
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

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          confirmAction === "approve"
            ? "Approve payout request"
            : "Mark payout as paid"
        }
        description={
          confirmAction === "approve"
            ? `Approve ${confirmPayout?.code} for ${formatTk(confirmPayout?.amount ?? 0)}?`
            : `Mark ${confirmPayout?.code} as paid? This cannot be undone.`
        }
        confirmLabel={confirmAction === "approve" ? "Approve" : "Mark as paid"}
        variant={confirmAction === "markPaid" ? "destructive" : "default"}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
