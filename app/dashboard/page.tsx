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
} from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { WAREHOUSES } from "@/lib/mock-data"
import { PageHeader } from "@/components/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string | number
  hint?: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          {hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export default function OverviewPage() {
  const { currentUser, team, securityConfig, merchants, orders } = usePlatform()

  const adminCount = team.filter((u) => u.role === "ADMIN").length
  const warehouseAdminCount = team.filter(
    (u) => u.role === "WAREHOUSE_ADMIN",
  ).length
  const pricingManagers = team.filter(
    (u) => u.role === "ADMIN" && u.canManagePricing,
  ).length
  const activeWarehouses = WAREHOUSES.filter((w) => w.isActive).length
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
      done: securityConfig.lowValueFlatFee > 0,
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
        title={`Welcome back, ${currentUser?.name.split(" ")[0] ?? "Admin"}`}
        description="Phase 1: get the platform ready before merchants start onboarding."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Admins"
          value={adminCount}
          hint={`${pricingManagers} can set pricing`}
          icon={Users}
        />
        <StatCard
          label="Warehouse Admins"
          value={warehouseAdminCount}
          icon={ShieldCheck}
        />
        <StatCard
          label="Active warehouses"
          value={activeWarehouses}
          hint={`${WAREHOUSES.length} total`}
          icon={WarehouseIcon}
        />
        <StatCard
          label="Pending merchants"
          value={pendingMerchants}
          hint="Awaiting approval"
          icon={Store}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pending orders — Phase 4 action */}
        {pendingOrders > 0 ? (
          <Card className="lg:col-span-3 border-chart-3/30 bg-chart-3/5">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-11 items-center justify-center rounded-lg bg-chart-3/15 text-chart-3">
                  <Package className="size-5" />
                </div>
                <div>
                  <p className="font-medium">
                    {pendingOrders} order{pendingOrders > 1 ? "s" : ""} awaiting
                    approval
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Verify weight compliance, then approve and assign a pickup
                    rider.
                  </p>
                </div>
              </div>
              <Button
                render={<Link href="/dashboard/orders" />}
                nativeButton={false}
              >
                Review orders
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ) : null}

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
                    <CheckCircle2 className="size-5 text-chart-2" />
                  ) : (
                    <Circle className="size-5 text-muted-foreground/50" />
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
                    <ArrowRight className="size-4 text-muted-foreground" />
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
              <Coins className="size-5 text-primary" />
              Security Money
            </CardTitle>
            <CardDescription>Current calculation rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground">Low-value orders</p>
              <p className="font-medium">
                {"\u2264"} {securityConfig.lowValueThreshold} TK {"\u2192"} flat{" "}
                {securityConfig.lowValueFlatFee} TK
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">High-value orders</p>
              <p className="font-medium">
                {">"} {securityConfig.lowValueThreshold} TK {"\u2192"}{" "}
                {securityConfig.highValuePercentage}% of order value
              </p>
            </div>
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
