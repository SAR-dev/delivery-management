"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Ban,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react"
import { useOrders } from "@/features/orders/hooks/use-orders"
import { useOrderColumns } from "@/features/orders/components/order-table-columns"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { ApproveOrderDialog } from "@/features/orders/dialogs/approve-order-dialog"
import { CancelOrderDialog } from "@/features/orders/dialogs/cancel-order-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatCardList } from "@/components/stat-card-list"

type FilterTab = "PENDING" | "APPROVED" | "ALL"

const TAB_STATUSES: Record<FilterTab, string[] | undefined> = {
  PENDING: ["PENDING"],
  APPROVED: ["APPROVED"],
  ALL: undefined,
}

export default function OrdersPage() {
  const {
    orders,
    allOrders,
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
    isLoading,
  } = useOrders()
  const baseColumns = useOrderColumns()
  const [tab, setTab] = useState<FilterTab>("PENDING")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)

  useEffect(() => {
    setStatuses(TAB_STATUSES[tab])
    setPage(1)
  }, [tab, setStatuses, setPage])

  const counts = useMemo(
    () => ({
      pending: allOrders.filter((o) => o.status === "PENDING").length,
      approved: allOrders.filter((o) => o.status === "APPROVED").length,
      inProgress: allOrders.filter(
        (o) =>
          !["PENDING", "DELIVERED", "RETURNED", "CANCELLED"].includes(o.status),
      ).length,
      total: allOrders.length,
    }),
    [allOrders],
  )

  function openApprove(order: Order) {
    setActiveOrder(order)
    setDialogOpen(true)
  }

  const columns: DataTableColumn<Order>[] = [
    ...baseColumns,
    {
      id: "actions",
      header: "",
      align: "right",
      headClassName: "w-12",
      cell: (o) => {
        const canApprove = o.status === "PENDING"
        const canCancel = [
          "PENDING",
          "APPROVED",
          "PICKED_UP",
          "IN_WAREHOUSE",
          "IN_TRANSIT",
        ].includes(o.status)
        if (!canApprove && !canCancel) return null
        return (
          <div className="flex justify-end">
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
                {canApprove && (
                  <DropdownMenuItem onClick={() => openApprove(o)}>
                    <ShieldCheck className="size-4" />
                    Review order
                  </DropdownMenuItem>
                )}
                {canApprove && canCancel && <DropdownMenuSeparator />}
                {canCancel && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      setCancelTarget(o)
                      setCancelOpen(true)
                    }}
                  >
                    <Ban className="size-4" />
                    Cancel order
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={pageContent.dashboard.orders.title}
        description={pageContent.dashboard.orders.description}
      />

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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
          <TabsList>
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="APPROVED">Approved</TabsTrigger>
            <TabsTrigger value="ALL">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            id="dashboard-orders"
            searchable
            columns={columns}
            data={orders}
            getRowKey={(o) => o.id}
            initialSortId="order"
            emptyMessage="No orders match the current filters."
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
            csvData={allOrders}
            csv={{
              filename: "orders",
              headers: [
                "Tracking",
                "Status",
                "Recipient",
                "Phone",
                "City",
                "Weight (KG)",
                "Delivery type",
                "Product cost",
                "Delivery charge",
                "Security money",
                "Total collectible",
              ],
              parser: (o) => [
                o.code,
                o.status,
                o.recipientName,
                o.recipientPhone,
                o.deliveryCity,
                o.parcelWeightKg,
                o.deliveryType,
                o.productCost,
                o.deliveryCharge,
                o.securityMoney,
                o.totalCollectible,
              ],
            }}
          />
        </CardContent>
      </Card>

      <ApproveOrderDialog
        order={activeOrder}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <CancelOrderDialog
        order={cancelTarget}
        open={cancelOpen}
        onOpenChange={(open) => {
          setCancelOpen(open)
          if (!open) setCancelTarget(null)
        }}
      />
    </div>
  )
}
