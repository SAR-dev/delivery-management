"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Ban,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  RotateCcw,
  ShieldCheck,
  Store,
  Tag,
} from "lucide-react"
import { toast } from "sonner"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { formatTk } from "@/lib/pricing"
import type { Merchant, MerchantStatus } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { MerchantStatusBadge } from "@/features/merchants/components/merchant-status-badge"
import { PricingDialog } from "@/features/merchants/dialogs/pricing-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatCardList } from "@/components/stat-card-list"
import { ConfirmDialog } from "@/components/confirm-dialog"

type FilterTab = "ALL" | MerchantStatus

const TAB_STATUSES: Record<FilterTab, string[] | undefined> = {
  ALL: undefined,
  PENDING: ["PENDING"],
  ACTIVE: ["ACTIVE"],
  SUSPENDED: ["SUSPENDED"],
}

export default function MerchantsPage() {
  const {
    merchants,
    allMerchants,
    total,
    page: _page,
    setPage,
    isLoading,
    limit: _limit,
    setLimit,
    query,
    setQuery,
    setStatuses,
    sortId,
    sortDir,
    onSortChange,
    approveMerchant,
    suspendMerchant,
    reactivateMerchant,
  } = useMerchants()
  const [tab, setTab] = useState<FilterTab>("ALL")
  const [pricingMerchant, setPricingMerchant] = useState<Merchant | null>(null)
  const [pricingOpen, setPricingOpen] = useState(false)
  const [confirmMerchant, setConfirmMerchant] = useState<Merchant | null>(null)
  const [confirmAction, setConfirmAction] = useState<
    "approve" | "suspend" | "reactivate" | null
  >(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    setStatuses(TAB_STATUSES[tab])
    setPage(1)
  }, [tab, setStatuses, setPage])

  const counts = useMemo(
    () => ({
      total: allMerchants.length,
      active: allMerchants.filter((m) => m.status === "ACTIVE").length,
      pending: allMerchants.filter((m) => m.status === "PENDING").length,
      suspended: allMerchants.filter((m) => m.status === "SUSPENDED").length,
    }),
    [allMerchants],
  )

  function openPricing(merchant: Merchant) {
    setPricingMerchant(merchant)
    setPricingOpen(true)
  }

  function openConfirm(
    merchant: Merchant,
    action: "approve" | "suspend" | "reactivate",
  ) {
    setConfirmMerchant(merchant)
    setConfirmAction(action)
    setConfirmOpen(true)
  }

  async function handleConfirm() {
    if (!confirmMerchant || !confirmAction) return
    if (confirmAction === "approve") {
      await approveMerchant(confirmMerchant.id)
      toast.success(
        `${confirmMerchant.businessName} approved. Assign a base rate next.`,
      )
    } else if (confirmAction === "suspend") {
      await suspendMerchant(confirmMerchant.id)
      toast.success(`${confirmMerchant.businessName} suspended.`)
    } else if (confirmAction === "reactivate") {
      await reactivateMerchant(confirmMerchant.id)
      toast.success(`${confirmMerchant.businessName} reactivated.`)
    }
    setConfirmOpen(false)
    setConfirmMerchant(null)
    setConfirmAction(null)
  }

  const columns: DataTableColumn<Merchant>[] = [
    {
      id: "business",
      header: "Business",
      sortable: true,
      sortValue: (m) => m.businessName,
      cell: (m) => (
        <div className="flex flex-col">
          <span className="font-medium">{m.businessName}</span>
          <span className="text-muted-foreground text-xs">{m.email}</span>
        </div>
      ),
    },
    {
      id: "owner",
      header: "Owner",
      sortable: true,
      sortValue: (m) => m.ownerName,
      cell: (m) => (
        <div className="flex flex-col">
          <span>{m.ownerName}</span>
          <span className="text-muted-foreground text-xs">{m.phone}</span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      sortValue: (m) => m.status,
      cell: (m) => {
        const needsPricing = m.status === "ACTIVE" && m.baseRate <= 0
        return (
          <div className="flex items-center gap-2">
            <MerchantStatusBadge status={m.status} />
            {needsPricing ? (
              <span className="text-chart-3 text-xs font-medium">
                Needs rate
              </span>
            ) : null}
          </div>
        )
      },
    },
    {
      id: "baseRate",
      header: "Base rate",
      align: "right",
      sortable: true,
      sortValue: (m) => m.baseRate,
      cell: (m) => (
        <span className="tabular-nums">
          {m.baseRate > 0 ? formatTk(m.baseRate) : "—"}
        </span>
      ),
    },
    {
      id: "perKg",
      header: "Per KG",
      align: "right",
      sortable: true,
      sortValue: (m) => m.extraRatePerKg,
      cell: (m) => (
        <span className="tabular-nums">{formatTk(m.extraRatePerKg)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      headClassName: "w-12",
      cell: (m) => (
        <div className="flex items-center justify-end gap-2">
          {m.status === "PENDING" ? (
            <Button size="sm" onClick={() => openConfirm(m, "approve")}>
              <ShieldCheck className="size-4" />
              Approve
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                disabled={m.status !== "ACTIVE"}
                onClick={() => openPricing(m)}
              >
                <Tag className="size-4" />
                Set pricing
              </DropdownMenuItem>
              {m.status === "PENDING" ? (
                <DropdownMenuItem onClick={() => openConfirm(m, "approve")}>
                  <ShieldCheck className="size-4" />
                  Approve merchant
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              {m.status === "SUSPENDED" ? (
                <DropdownMenuItem onClick={() => openConfirm(m, "reactivate")}>
                  <RotateCcw className="size-4" />
                  Reactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  variant="destructive"
                  disabled={m.status === "PENDING"}
                  onClick={() => openConfirm(m, "suspend")}
                >
                  <Ban className="size-4" />
                  Suspend
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={pageContent.dashboard.merchants.title}
        description={pageContent.dashboard.merchants.description}
      />

      <StatCardList
        columns={4}
        items={[
          {
            label: "Total merchants",
            value: counts.total,
            icon: Store,
          },
          {
            label: "Active",
            value: counts.active,
            icon: CheckCircle2,
            tone: "bg-chart-2/15 text-chart-2",
          },
          {
            label: "Pending approval",
            value: counts.pending,
            icon: Clock,
            tone: "bg-chart-3/15 text-chart-3",
          },
          {
            label: "Suspended",
            value: counts.suspended,
            icon: Ban,
            tone: "bg-destructive/10 text-destructive",
          },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="ACTIVE">Active</TabsTrigger>
            <TabsTrigger value="SUSPENDED">Suspended</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            id="dashboard-merchants"
            searchable
            columns={columns}
            data={merchants}
            getRowKey={(m) => m.id}
            initialSortId="business"
            emptyMessage="No merchants match the current filters."
            loading={isLoading}
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
            csvData={allMerchants}
            csv={{
              filename: "merchants",
              headers: [
                "Business",
                "Owner",
                "Email",
                "Phone",
                "Status",
                "Base rate",
                "Per KG",
              ],
              parser: (m) => [
                m.businessName,
                m.ownerName,
                m.email,
                m.phone,
                m.status,
                m.baseRate,
                m.extraRatePerKg,
              ],
            }}
          />
        </CardContent>
      </Card>

      <PricingDialog
        merchant={pricingMerchant}
        open={pricingOpen}
        onOpenChange={setPricingOpen}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          confirmAction === "approve"
            ? "Approve merchant"
            : confirmAction === "suspend"
              ? "Suspend merchant"
              : "Reactivate merchant"
        }
        description={
          confirmAction === "approve"
            ? `Approve ${confirmMerchant?.businessName}? They will be able to create orders.`
            : confirmAction === "suspend"
              ? `Suspend ${confirmMerchant?.businessName}? They will no longer be able to create orders.`
              : `Reactivate ${confirmMerchant?.businessName}? They will regain access.`
        }
        confirmLabel={
          confirmAction === "approve"
            ? "Approve"
            : confirmAction === "suspend"
              ? "Suspend"
              : "Reactivate"
        }
        variant={confirmAction === "suspend" ? "destructive" : "default"}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
