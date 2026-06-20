"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { usePlatform, homeForRole } from "@/lib/platform-context"
import { DataErrorBanner } from "@/components/data-error-banner"
import { WarehouseSidebar } from "@/components/sidebar/warehouse-sidebar"
import { MobileHeader } from "@/components/layout/mobile-header"
import { WAREHOUSE_SIDEBAR } from "@/lib/nav-config"

export default function WarehouseLayout({
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
    } else if (currentUser.role !== "WAREHOUSE_ADMIN") {
      router.replace(homeForRole(currentUser.role))
    }
  }, [isReady, currentUser, router])

  if (!isReady || !currentUser || currentUser.role !== "WAREHOUSE_ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <WarehouseSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader config={WAREHOUSE_SIDEBAR} items={[]} />

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-5xl">
            <DataErrorBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
