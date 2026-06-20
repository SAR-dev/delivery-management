"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Bike, LogOut } from "lucide-react"
import { usePlatform, homeForRole } from "@/lib/platform-context"
import { DataErrorBanner } from "@/components/data-error-banner"
import { RiderSidebar } from "@/components/sidebar/rider-sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function RiderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { currentUser, isReady, logout } = usePlatform()

  useEffect(() => {
    if (!isReady) return
    if (!currentUser) {
      router.replace("/login")
    } else if (currentUser.role !== "RIDER") {
      // Non-rider users belong in their own console.
      router.replace(homeForRole(currentUser.role))
    }
  }, [isReady, currentUser, router])

  if (!isReady || !currentUser || currentUser.role !== "RIDER") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <RiderSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-16 items-center justify-between border-b border-border px-4 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bike className="size-5" />
            </div>
            <span className="font-semibold">ParcelFlow</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm">
                  Menu
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={logout}>
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

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
