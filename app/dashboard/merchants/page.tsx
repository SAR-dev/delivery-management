"use client"

import { useMemo, useState } from "react"
import {
  Store,
  CheckCircle2,
  Clock,
  Ban,
  Search,
  MoreHorizontal,
  Tag,
  ShieldCheck,
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import type { Merchant, MerchantStatus } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { MerchantStatusBadge } from "@/components/merchant-status-badge"
import { PricingDialog } from "@/components/pricing-dialog"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type FilterTab = "ALL" | MerchantStatus

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
        <div className={`flex size-11 items-center justify-center rounded-lg ${tone}`}>
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

export default function MerchantsPage() {
  const {
    merchants,
    approveMerchant,
    suspendMerchant,
    reactivateMerchant,
  } = usePlatform()
  const [tab, setTab] = useState<FilterTab>("ALL")
  const [query, setQuery] = useState("")
  const [pricingMerchant, setPricingMerchant] = useState<Merchant | null>(null)
  const [pricingOpen, setPricingOpen] = useState(false)

  const counts = useMemo(
    () => ({
      total: merchants.length,
      active: merchants.filter((m) => m.status === "ACTIVE").length,
      pending: merchants.filter((m) => m.status === "PENDING").length,
      suspended: merchants.filter((m) => m.status === "SUSPENDED").length,
    }),
    [merchants],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return merchants.filter((m) => {
      const matchesTab = tab === "ALL" || m.status === tab
      const matchesQuery =
        !q ||
        m.businessName.toLowerCase().includes(q) ||
        m.ownerName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
      return matchesTab && matchesQuery
    })
  }, [merchants, tab, query])

  function openPricing(merchant: Merchant) {
    setPricingMerchant(merchant)
    setPricingOpen(true)
  }

  function handleApprove(merchant: Merchant) {
    approveMerchant(merchant.id)
    toast.success(`${merchant.businessName} approved. Assign a base rate next.`)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Merchants"
        description="Phase 2: review registrations, approve businesses, and assign each merchant's delivery pricing."
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total merchants"
          value={counts.total}
          icon={Store}
          tone="bg-primary/10 text-primary"
        />
        <StatCard
          label="Active"
          value={counts.active}
          icon={CheckCircle2}
          tone="bg-chart-2/15 text-chart-2"
        />
        <StatCard
          label="Pending approval"
          value={counts.pending}
          icon={Clock}
          tone="bg-chart-3/15 text-chart-3"
        />
        <StatCard
          label="Suspended"
          value={counts.suspended}
          icon={Ban}
          tone="bg-destructive/10 text-destructive"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="ACTIVE">Active</TabsTrigger>
            <TabsTrigger value="SUSPENDED">Suspended</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search business, owner, email"
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
                <TableHead>Business</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Base rate</TableHead>
                <TableHead className="text-right">Per KG</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No merchants match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((m) => {
                  const needsPricing =
                    m.status === "ACTIVE" && m.baseRate <= 0
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{m.businessName}</span>
                          <span className="text-xs text-muted-foreground">
                            {m.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{m.ownerName}</span>
                          <span className="text-xs text-muted-foreground">
                            {m.phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MerchantStatusBadge status={m.status} />
                          {needsPricing ? (
                            <span className="text-xs font-medium text-chart-3">
                              Needs rate
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.baseRate > 0 ? formatTk(m.baseRate) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatTk(m.extraRatePerKg)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {m.status === "PENDING" ? (
                            <Button
                              size="sm"
                              onClick={() => handleApprove(m)}
                            >
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
                                <DropdownMenuItem onClick={() => handleApprove(m)}>
                                  <ShieldCheck className="size-4" />
                                  Approve merchant
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuSeparator />
                              {m.status === "SUSPENDED" ? (
                                <DropdownMenuItem
                                  onClick={() => {
                                    reactivateMerchant(m.id)
                                    toast.success(`${m.businessName} reactivated.`)
                                  }}
                                >
                                  <RotateCcw className="size-4" />
                                  Reactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={m.status === "PENDING"}
                                  onClick={() => {
                                    suspendMerchant(m.id)
                                    toast.success(`${m.businessName} suspended.`)
                                  }}
                                >
                                  <Ban className="size-4" />
                                  Suspend
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <PricingDialog
        merchant={pricingMerchant}
        open={pricingOpen}
        onOpenChange={setPricingOpen}
      />
    </div>
  )
}
