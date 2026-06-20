"use client"

import Link from "next/link"
import { LogOut } from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BRAND_NAME } from "@/lib/constants"
import type { SidebarConfig, SidebarNavItem } from "@/lib/nav-config"

export function MobileHeader({
  config,
  items,
}: {
  config: SidebarConfig
  items?: SidebarNavItem[]
}) {
  const { logout } = usePlatform()
  const BrandIcon = config.brandIcon
  const navItems = items ?? config.mobileItems ?? config.items

  return (
    <header className="border-border flex h-16 items-center justify-between border-b px-4 md:hidden">
      <div className="flex items-center gap-2">
        <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
          <BrandIcon className="size-5" />
        </div>
        <span className="font-semibold">{BRAND_NAME}</span>
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
          {navItems.map((item) => {
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
  )
}
