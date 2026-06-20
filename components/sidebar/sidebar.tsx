"use client"

import { RoleSidebar } from "@/components/sidebar/role-sidebar"
import { usePlatform } from "@/lib/platform-context"
import { dashboardSidebarForRole } from "@/lib/nav-config"

export function Sidebar() {
  const { currentUser } = usePlatform()
  const isAdmin = currentUser?.role === "ADMIN"

  return (
    <RoleSidebar
      config={dashboardSidebarForRole(currentUser?.role)}
      fallbackName={isAdmin ? "Admin" : "Super Admin"}
      fallbackInitials={isAdmin ? "AD" : "SA"}
    />
  )
}
