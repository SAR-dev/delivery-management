"use client"

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
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { OrderStatusBadge } from "@/components/order-status-badge"
import { ApproveOrderDialog } from "@/components/approve-order-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type FilterTab = "PENDING" | "APPROVED" | "ALL"

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
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
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Orders"
        description="Phase 4: review pending orders, verify weight compliance, then approve and assign a pickup rider."
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending approval"
          value={counts.pending}
          icon={Clock}
          tone="bg-chart-3/15 text-chart-3"
        />
        <StatCard
          label="Approved"
          value={counts.approved}
          icon={CheckCircle2}
          tone="bg-chart-1/15 text-chart-1"
        />
        <StatCard
          label="In progress"
          value={counts.inProgress}
          icon={Truck}
          tone="bg-chart-4/15 text-chart-4"
        />
        <StatCard
          label="Total orders"
          value={counts.total}
          icon={Package}
          tone="bg-primary/10 text-primary"
        />
      </div>

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
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead className="text-right">Weight</TableHead>
                <TableHead className="text-right">Collectible</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rider</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No orders match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => {
                  const merchant = merchants.find((m) => m.id === o.merchantId)
                  const exceedsWeight = merchant
                    ? o.parcelWeightKg > merchant.maxWeightKg
                    : false
                  return (
                    <TableRow key={o.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{o.code}</span>
                          <span className="text-xs text-muted-foreground">
                            {o.recipientName} · {o.deliveryCity}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{merchantName(o.merchantId)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span
                          className={
                            exceedsWeight ? "font-medium text-destructive" : ""
                          }
                        >
                          {o.parcelWeightKg} KG
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatTk(o.totalCollectible)}
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={o.status} />
                      </TableCell>
                      <TableCell>
                        {o.pickupRiderId ? (
                          <span className="flex items-center gap-1.5 text-sm">
                            <Bike className="size-4 text-muted-foreground" />
                            {riderName(o.pickupRiderId)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          {o.status === "PENDING" ? (
                            <Button size="sm" onClick={() => openApprove(o)}>
                              <ShieldCheck className="size-4" />
                              Review
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
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
