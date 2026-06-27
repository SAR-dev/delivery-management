"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/features/account/hooks/use-auth"
import { DataErrorBanner } from "@/components/data-error-banner"
import { Sidebar } from "@/components/navigation/sidebar"
import { MobileHeader } from "@/components/navigation/mobile-header"
import { dashboardSidebarForRole } from "@/lib/nav-config"

// Dashboard (Super Admin / Admin) monitors all resources.
const DASHBOARD_KEYS = [
  "/api/team",
  "/api/merchants",
  "/api/orders",
  "/api/payouts",
  "/api/pickup-locations",
  "/api/riders",
  "/api/warehouses",
  "/api/divisions",
  "/api/security-config",
  "/api/audit-logs",
  "/api/email-logs",
] as const

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { currentUser, isReady } = useAuth()

  useEffect(() => {
    if (!isReady) return
    if (!currentUser) {
      router.replace("/login")
    } else if (currentUser.role === "MERCHANT") {
      router.replace("/merchant")
    } else if (currentUser.role === "RIDER") {
      router.replace("/rider")
    } else if (currentUser.role === "WAREHOUSE_ADMIN") {
      router.replace("/warehouse")
    }
  }, [isReady, currentUser, router])

  if (
    !isReady ||
    !currentUser ||
    currentUser.role === "MERCHANT" ||
    currentUser.role === "RIDER" ||
    currentUser.role === "WAREHOUSE_ADMIN"
  ) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-background flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader config={dashboardSidebarForRole(currentUser.role)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-7xl">
            <DataErrorBanner keys={DASHBOARD_KEYS} />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
