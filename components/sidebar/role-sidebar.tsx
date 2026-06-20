"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import { cn, initials } from "@/lib/utils"
import { usePlatform } from "@/lib/platform-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { BRAND_NAME } from "@/lib/constants"
import type { SidebarConfig } from "@/lib/nav-config"

const navLinkClass =
  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
const navLinkActive = "bg-sidebar-primary text-sidebar-primary-foreground"
const navLinkIdle =
  "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
const footerActionClass = `mt-1 w-full justify-start ${navLinkIdle}`

export function RoleSidebar({
  config,
  footerSubtitle,
  fallbackName,
  fallbackInitials = "?",
}: {
  config: SidebarConfig
  footerSubtitle?: string | null
  fallbackName?: string
  fallbackInitials?: string
}) {
  const pathname = usePathname()
  const { currentUser, logout } = usePlatform()
  const BrandIcon = config.brandIcon

  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-hidden border-r md:flex">
      <div className="border-sidebar-border flex h-16 items-center gap-2 border-b px-5">
        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-lg">
          <BrandIcon className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">{BRAND_NAME}</p>
          <p className="text-sidebar-foreground/60 text-xs">
            {config.roleLabel}
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {config.items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(navLinkClass, active ? navLinkActive : navLinkIdle)}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-sidebar-border border-t p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar className="size-8">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
              {currentUser ? initials(currentUser.name) : fallbackInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">
              {currentUser?.name ?? fallbackName}
            </p>
            <p className="text-sidebar-foreground/60 truncate text-xs">
              {footerSubtitle ?? currentUser?.email}
            </p>
          </div>
        </div>
        <ThemeToggle className={footerActionClass} />
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className={footerActionClass}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
