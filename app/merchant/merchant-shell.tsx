"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/features/account/hooks/use-auth"
import { DataErrorBanner } from "@/components/data-error-banner"
import { AnnouncementBanner } from "@/features/announcements/components/announcement-banner"
import { MerchantSidebar } from "@/components/navigation/merchant-sidebar"
import { MobileHeader } from "@/components/navigation/mobile-header"
import { MERCHANT_SIDEBAR } from "@/lib/nav-config"

// Merchant monitors: merchants, orders, pickup-locations.
const MERCHANT_KEYS = [
  "/api/merchants",
  "/api/orders",
  "/api/pickup-locations",
] as const

export function MerchantShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { currentUser, isReady } = useAuth()

  useEffect(() => {
    if (!isReady) return
    if (!currentUser) {
      router.replace("/login")
    } else if (currentUser.role !== "MERCHANT") {
      router.replace("/dashboard")
    }
  }, [isReady, currentUser, router])

  if (!isReady || !currentUser || currentUser.role !== "MERCHANT") {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-background flex min-h-screen">
      <MerchantSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader config={MERCHANT_SIDEBAR} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-6xl">
            <AnnouncementBanner />
            <DataErrorBanner keys={MERCHANT_KEYS} />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
