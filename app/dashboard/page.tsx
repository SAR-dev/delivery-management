"use client"

import Link from "next/link"
import {
  Coins,
  Users,
  Warehouse as WarehouseIcon,
  Store,
  Package,
  ArrowRight,
  CheckCircle2,
  Circle,
  ShieldCheck,
  Bike,
  Truck,
} from "lucide-react"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { useOrders } from "@/features/orders/hooks/use-orders"
import { useRiders } from "@/features/riders/hooks/use-riders"
import { useTeam } from "@/features/team/hooks/use-team"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { useSecurityConfig } from "@/features/security/hooks/use-security-config"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { StatCardList } from "@/components/stat-card-list"

export default function OverviewPage() {
  const { currentUser } = useAuth()
  if (currentUser?.role === "ADMIN") return <AdminOverview />
  return <SuperAdminOverview />
}

// Pending-orders banner shared by both overviews.
function PendingOrdersBanner({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <Card className="border-chart-3/30 bg-chart-3/5 lg:col-span-3">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-chart-3/15 text-chart-3 flex size-11 items-center justify-center rounded-lg">
            <Package className="size-5" />
          </div>
          <div>
            <p className="font-medium">
              {count} order{count > 1 ? "s" : ""} awaiting approval
            </p>
            <p className="text-muted-foreground text-sm">
              Verify weight compliance, then approve and assign a pickup rider.
            </p>
          </div>
        </div>
        <Button render={<Link href="/dashboard/orders" />} nativeButton={false}>
          Review orders
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  )
}

// -------------------------------------------------------------------------
// Admin overview — operations-focused (orders, riders, merchants).
// -------------------------------------------------------------------------
function AdminOverview() {
  const { currentUser } = useAuth()
  const { merchants } = useMerchants()
  const { orders } = useOrders()
  const { riders } = useRiders()

  const pendingOrders = orders.filter((o) => o.status === "PENDING").length
  const inProgressOrders = orders.filter(
    (o) => !["PENDING", "DELIVERED", "RETURNED"].includes(o.status),
  ).length
  const activeRiders = riders.filter((r) => r.isActive).length
  const pendingMerchants = merchants.filter(
    (m) => m.status === "PENDING",
  ).length

  const quickLinks = [
    {
      label: "Review & approve orders",
      description: "Approve pending orders and assign pickup riders.",
      href: "/dashboard/orders",
      icon: Package,
    },
    {
      label: "Manage riders",
      description: "Add riders and toggle their availability.",
      href: "/dashboard/riders",
      icon: Bike,
    },
    {
      label: "Manage merchants",
      description: "Approve merchants and set delivery pricing.",
      href: "/dashboard/merchants",
      icon: Store,
    },
  ]

  return (
    <>
      <PageHeader
        title={pageContent.dashboard.overview.title(
          currentUser?.name.split(" ")[0] ?? "Admin",
        )}
        description={pageContent.dashboard.overview.description}
      />

      <StatCardList
        columns={4}
        items={[
          {
            label: "Pending approval",
            value: pendingOrders,
            hint: "Awaiting your review",
            icon: Package,
            tone: "bg-chart-3/15 text-chart-3",
          },
          {
            label: "In progress",
            value: inProgressOrders,
            icon: Truck,
            tone: "bg-chart-4/15 text-chart-4",
          },
          {
            label: "Active riders",
            value: activeRiders,
            hint: `${riders.length} total`,
            icon: Bike,
            tone: "bg-chart-1/15 text-chart-1",
          },
          {
            label: "Pending merchants",
            value: pendingMerchants,
            hint: "Awaiting approval",
            icon: Store,
          },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <PendingOrdersBanner count={pendingOrders} />

        {quickLinks.map((link) => {
          const Icon = link.icon
          return (
            <Link key={link.href} href={link.href} className="block">
              <Card className="hover:border-primary/40 h-full transition-colors">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-lg">
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{link.label}</p>
                    <p className="text-muted-foreground text-sm">
                      {link.description}
                    </p>
                  </div>
                  <span className="text-primary flex items-center gap-1 text-sm font-medium">
                    Open
                    <ArrowRight className="size-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </>
  )
}

// -------------------------------------------------------------------------
// Super Admin overview — platform setup checklist & security rules.
// -------------------------------------------------------------------------
function SuperAdminOverview() {
  const { currentUser } = useAuth()
  const { team } = useTeam()
  const { securityConfig } = useSecurityConfig()
  const { merchants } = useMerchants()
  const { orders } = useOrders()
  const { warehouses } = useWarehouses()

  const adminCount = team.filter((u) => u.role === "ADMIN").length
  const warehouseAdminCount = team.filter(
    (u) => u.role === "WAREHOUSE_ADMIN",
  ).length
  const pricingManagers = team.filter(
    (u) => u.role === "ADMIN" && u.canManagePricing,
  ).length
  const activeWarehouses = warehouses.filter((w) => w.isActive).length
  const pendingMerchants = merchants.filter(
    (m) => m.status === "PENDING",
  ).length
  const pendingOrders = orders.filter((o) => o.status === "PENDING").length

  const setupSteps = [
    {
      label: "Super Admin signed in",
      done: Boolean(currentUser),
    },
    {
      label: "Security money rules configured",
      done: securityConfig != null && securityConfig.lowValueFlatFee > 0,
      href: "/dashboard/security-money",
    },
    {
      label: "At least one Admin account created",
      done: adminCount > 0,
      href: "/dashboard/team",
    },
    {
      label: "At least one Warehouse Admin created",
      done: warehouseAdminCount > 0,
      href: "/dashboard/team",
    },
    {
      label: "An Admin can manage merchant pricing",
      done: pricingManagers > 0,
      href: "/dashboard/team",
    },
  ]

  const completed = setupSteps.filter((s) => s.done).length

  return (
    <>
      <PageHeader
        title={pageContent.dashboard.overview.title(
          currentUser?.name.split(" ")[0] ?? "Admin",
        )}
        description={pageContent.dashboard.overview.setupDescription}
      />

      <StatCardList
        columns={4}
        items={[
          {
            label: "Admins",
            value: adminCount,
            hint: `${pricingManagers} can set pricing`,
            icon: Users,
          },
          {
            label: "Warehouse Admins",
            value: warehouseAdminCount,
            icon: ShieldCheck,
          },
          {
            label: "Active warehouses",
            value: activeWarehouses,
            hint: `${warehouses.length} total`,
            icon: WarehouseIcon,
          },
          {
            label: "Pending merchants",
            value: pendingMerchants,
            hint: "Awaiting approval",
            icon: Store,
          },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <PendingOrdersBanner count={pendingOrders} />

        {/* Setup checklist */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Platform setup checklist</CardTitle>
            <CardDescription>
              {completed} of {setupSteps.length} steps complete
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {setupSteps.map((step) => {
              const row = (
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5",
                    step.href && !step.done && "hover:bg-muted",
                  )}
                >
                  {step.done ? (
                    <CheckCircle2 className="text-chart-2 size-5" />
                  ) : (
                    <Circle className="text-muted-foreground/50 size-5" />
                  )}
                  <span
                    className={cn(
                      "flex-1 text-sm",
                      step.done
                        ? "text-muted-foreground line-through"
                        : "font-medium",
                    )}
                  >
                    {step.label}
                  </span>
                  {step.href && !step.done ? (
                    <ArrowRight className="text-muted-foreground size-4" />
                  ) : null}
                </div>
              )
              return step.href && !step.done ? (
                <Link key={step.label} href={step.href} className="block">
                  {row}
                </Link>
              ) : (
                <div key={step.label}>{row}</div>
              )
            })}
          </CardContent>
        </Card>

        {/* Current security money rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="text-primary size-5" />
              Security Money
            </CardTitle>
            <CardDescription>Current calculation rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {securityConfig == null ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : (
              <>
                <div>
                  <p className="text-muted-foreground">Low-value orders</p>
                  <p className="font-medium">
                    {"≤"} {securityConfig.lowValueThreshold} TK {"→"} flat{" "}
                    {securityConfig.lowValueFlatFee} TK
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">High-value orders</p>
                  <p className="font-medium">
                    {">"} {securityConfig.lowValueThreshold} TK {"→"}{" "}
                    {securityConfig.highValuePercentage}% of order value
                  </p>
                </div>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              render={<Link href="/dashboard/security-money" />}
              nativeButton={false}
            >
              Edit rules
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
