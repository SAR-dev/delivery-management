"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, LogOut, PackagePlus, Store, Wallet, Warehouse } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePlatform } from "@/lib/platform-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

const NAV = [
  { href: "/merchant", label: "Overview", icon: LayoutDashboard },
  { href: "/merchant/orders/new", label: "Create Order", icon: PackagePlus },
  { href: "/merchant/finance", label: "Finance", icon: Wallet },
]

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function MerchantSidebar() {
  const pathname = usePathname()
  const { currentUser, currentMerchant, logout, orders, warehouses } = usePlatform()

  // The warehouse that has handled the most of this merchant's parcels.
  const primaryWarehouse = useMemo(() => {
    if (!currentMerchant) return null
    const counts = new Map<string, number>()
    for (const o of orders) {
      if (o.merchantId !== currentMerchant.id || !o.warehouseId) continue
      counts.set(o.warehouseId, (counts.get(o.warehouseId) ?? 0) + 1)
    }
    if (counts.size === 0) return null
    const topId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    return warehouses.find((w) => w.id === topId) ?? null
  }, [currentMerchant, orders, warehouses])

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex border-r border-sidebar-border">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Store className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">ParcelFlow</p>
          <p className="text-xs text-sidebar-foreground/60">Merchant</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map((item) => {
          const active =
            item.href === "/merchant"
              ? pathname === "/merchant"
              : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {primaryWarehouse && (
        <div className="px-3 pb-1">
          <div className="flex items-center gap-3 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary/15 text-sidebar-primary">
              <Warehouse className="size-4" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="text-[10px] uppercase tracking-wide text-sidebar-foreground/55 font-medium">
                Your hub
              </p>
              <p className="truncate text-sm font-medium">{primaryWarehouse.name}</p>
              <p className="truncate text-xs text-sidebar-foreground/60">{primaryWarehouse.city}</p>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar className="size-8">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
              {currentUser ? initials(currentUser.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium">{currentUser?.name}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {currentMerchant?.businessName ?? currentUser?.email}
            </p>
          </div>
        </div>
        <ThemeToggle className="mt-1 w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="mt-1 w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
