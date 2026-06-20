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

// Claude-style nav link: quiet by default, soft neutral fill on hover,
// and a gentle tonal fill (not a saturated brand color) when active.
const navLinkClass =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150"
const navLinkActive = "bg-sidebar-accent text-sidebar-accent-foreground"
const navLinkIdle =
  "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
const footerActionClass =
  "mt-0.5 w-full justify-start gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"

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
    <aside className="bg-sidebar text-sidebar-foreground sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-hidden md:flex">
      {/* Brand — logo sized with the text, role badge in accent color */}
      <div className="flex h-16 items-center gap-2 px-4">
        <BrandIcon className="size-4 shrink-0" />
        <p className="text-[13px] font-semibold">{BRAND_NAME}</p>
        <span className="bg-sidebar-primary text-sidebar-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
          {config.roleLabel}
        </span>
      </div>

      {/* Nav — no rules, no boxes, just rhythm and spacing */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
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
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer — separated by spacing/tone, not a hard border line */}
      <div className="px-3 pt-2 pb-3">
        <div className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="size-7">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-[11px] font-medium">
              {currentUser ? initials(currentUser.name) : fallbackInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-medium">
              {currentUser?.name ?? fallbackName}
            </p>
            <p className="text-sidebar-foreground/50 truncate text-[11px]">
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
