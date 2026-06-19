"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Loader2,
  Store,
  LogOut,
  LayoutDashboard,
  PackagePlus,
  Wallet,
} from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { DataErrorBanner } from "@/components/data-error-banner"
import { MerchantSidebar } from "@/components/merchant-sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const MOBILE_NAV = [
  { href: "/merchant", label: "Overview", icon: LayoutDashboard },
  { href: "/merchant/orders/new", label: "Create Order", icon: PackagePlus },
  { href: "/merchant/finance", label: "Finance", icon: Wallet },
]

export default function MerchantLayout({
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
    } else if (currentUser.role !== "MERCHANT") {
      // Non-merchant users belong in the admin console.
      router.replace("/dashboard")
    }
  }, [isReady, currentUser, router])

  if (!isReady || !currentUser || currentUser.role !== "MERCHANT") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <MerchantSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-16 items-center justify-between border-b border-border px-4 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="size-5" />
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
              {MOBILE_NAV.map((item) => {
                const Icon = item.icon
                return (
                  <DropdownMenuItem
                    key={item.href}
                    render={<Link href={item.href} />}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuItem onClick={logout}>
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

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
