"use client"

import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import type { PayoutRequest } from "@/lib/types"
import { formatTk } from "@/lib/pricing"
import type { DataTableColumn } from "@/components/data-table"
import { PayoutStatusBadge } from "./payout-status-badge"

interface UsePayoutRequestColumnsOptions {
  showMerchantName?: boolean
}

export function usePayoutRequestColumns({
  showMerchantName = false,
}: UsePayoutRequestColumnsOptions = {}): DataTableColumn<PayoutRequest>[] {
  const { merchants } = useMerchants()

  const merchantName = (id: string) =>
    merchants.find((m) => m.id === id)?.businessName ?? "Merchant"

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
          {showMerchantName && (
            <span className="font-medium">{merchantName(p.merchantId)}</span>
          )}
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
  ]

  return columns
}
