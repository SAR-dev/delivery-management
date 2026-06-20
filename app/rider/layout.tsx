"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { usePlatform, homeForRole } from "@/lib/platform-context"
import { DataErrorBanner } from "@/components/data-error-banner"
import { RiderSidebar } from "@/components/sidebar/rider-sidebar"
import { MobileHeader } from "@/components/layout/mobile-header"
import { RIDER_SIDEBAR } from "@/lib/nav-config"

export default function RiderLayout({
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
    } else if (currentUser.role !== "RIDER") {
      router.replace(homeForRole(currentUser.role))
    }
  }, [isReady, currentUser, router])

  if (!isReady || !currentUser || currentUser.role !== "RIDER") {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-background flex min-h-screen">
      <RiderSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader config={RIDER_SIDEBAR} items={[]} />

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
