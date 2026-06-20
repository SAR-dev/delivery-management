"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { DataErrorBanner } from "@/components/data-error-banner"
import { Sidebar } from "@/components/sidebar/sidebar"
import { MobileHeader } from "@/components/layout/mobile-header"
import { ADMIN_SIDEBAR } from "@/lib/nav-config"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { currentUser, isReady } = usePlatform()

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
        <MobileHeader config={ADMIN_SIDEBAR} />

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-6xl">
            <DataErrorBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
