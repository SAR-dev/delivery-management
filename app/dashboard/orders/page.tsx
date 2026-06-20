"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  Search,
  ShieldCheck,
  Bike,
} from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { cn } from "@/lib/utils"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { OrderStatusBadge } from "@/components/badge/order-status-badge"
import { AddressModal } from "@/components/address-modal"
import { ApproveOrderDialog } from "@/components/dialog/approve-order-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatCardList } from "@/components/stat-card-list"

type FilterTab = "PENDING" | "APPROVED" | "ALL"

export default function OrdersPage() {
  const { orders, merchants, riders } = usePlatform()
  const [tab, setTab] = useState<FilterTab>("PENDING")
  const [query, setQuery] = useState("")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const merchantName = (id: string) =>
    merchants.find((m) => m.id === id)?.businessName ?? "Unknown"
  const riderName = (id?: string | null) =>
    id ? (riders.find((r) => r.id === id)?.name ?? "—") : "—"

  const counts = useMemo(
    () => ({
      pending: orders.filter((o) => o.status === "PENDING").length,
      approved: orders.filter((o) => o.status === "APPROVED").length,
      inProgress: orders.filter(
        (o) => !["PENDING", "DELIVERED", "RETURNED"].includes(o.status),
      ).length,
      total: orders.length,
    }),
    [orders],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders.filter((o) => {
      const matchesTab = tab === "ALL" || o.status === tab
      const matchesQuery =
        !q ||
        o.code.toLowerCase().includes(q) ||
        o.recipientName.toLowerCase().includes(q) ||
        merchantName(o.merchantId).toLowerCase().includes(q)
      return matchesTab && matchesQuery
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, tab, query])

  function openApprove(order: Order) {
    setActiveOrder(order)
    setDialogOpen(true)
  }

  const columns: DataTableColumn<Order>[] = [
    {
      id: "order",
      header: "Order",
      sortable: true,
      sortValue: (o) => o.code,
      cell: (o) => (
        <div className="flex flex-col">
          <Link
            href={`/dashboard/orders/${o.id}`}
            className="text-primary font-medium hover:underline"
          >
            {o.code}
          </Link>
          <span className="text-muted-foreground text-xs">
            {o.recipientName} ·{" "}
            <AddressModal
              order={o}
              className="underline decoration-dotted underline-offset-4"
            >
              {o.deliveryCity}
            </AddressModal>
          </span>
        </div>
      ),
    },
    {
      id: "merchant",
      header: "Merchant",
      sortable: true,
      sortValue: (o) => merchantName(o.merchantId),
      cell: (o) => merchantName(o.merchantId),
    },
    {
      id: "weight",
      header: "Weight",
      align: "right",
      sortable: true,
      sortValue: (o) => o.parcelWeightKg,
      cell: (o) => {
        const merchant = merchants.find((m) => m.id === o.merchantId)
        const exceedsWeight = merchant
          ? o.parcelWeightKg > merchant.maxWeightKg
          : false
        return (
          <span
            className={cn(
              "tabular-nums",
              exceedsWeight && "text-destructive font-medium",
            )}
          >
            {o.parcelWeightKg} KG
          </span>
        )
      },
    },
    {
      id: "collectible",
      header: "Collectible",
      align: "right",
      sortable: true,
      sortValue: (o) => o.totalCollectible,
      cell: (o) => (
        <span className="tabular-nums">{formatTk(o.totalCollectible)}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      sortValue: (o) => o.status,
      cell: (o) => <OrderStatusBadge status={o.status} />,
    },
    {
      id: "rider",
      header: "Rider",
      sortable: true,
      sortValue: (o) => riderName(o.pickupRiderId),
      cell: (o) =>
        o.pickupRiderId ? (
          <span className="flex items-center gap-1.5 text-sm">
            <Bike className="text-muted-foreground size-4" />
            {riderName(o.pickupRiderId)}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      headClassName: "w-12",
      cell: (o) =>
        o.status === "PENDING" ? (
          <Button size="sm" onClick={() => openApprove(o)}>
            <ShieldCheck className="size-4" />
            Review
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Order approvals"
        description="Review pending orders, verify weight compliance, then approve and assign a pickup rider."
      />

      {/* Stats */}
      <StatCardList
        columns={4}
        items={[
          {
            label: "Pending approval",
            value: counts.pending,
            icon: Clock,
            tone: "bg-chart-3/15 text-chart-3",
          },
          {
            label: "Approved",
            value: counts.approved,
            icon: CheckCircle2,
            tone: "bg-chart-1/15 text-chart-1",
          },
          {
            label: "In progress",
            value: counts.inProgress,
            icon: Truck,
            tone: "bg-chart-4/15 text-chart-4",
          },
          {
            label: "Total orders",
            value: counts.total,
            icon: Package,
          },
        ]}
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
          <TabsList>
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="APPROVED">Approved</TabsTrigger>
            <TabsTrigger value="ALL">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search code, recipient, merchant"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filtered}
            getRowKey={(o) => o.id}
            initialSortId="order"
            emptyMessage="No orders match the current filters."
          />
        </CardContent>
      </Card>

      <ApproveOrderDialog
        order={activeOrder}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
