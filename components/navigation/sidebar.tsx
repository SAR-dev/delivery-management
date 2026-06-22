"use client"

import { RoleSidebar } from "@/components/navigation/role-sidebar"
import { useAuth } from "@/features/account/hooks/use-auth"
import { dashboardSidebarForRole } from "@/lib/nav-config"

export function Sidebar() {
  const { currentUser } = useAuth()
  const isAdmin = currentUser?.role === "ADMIN"

  return (
    <RoleSidebar
      config={dashboardSidebarForRole(currentUser?.role)}
      fallbackName={isAdmin ? "Admin" : "Super Admin"}
      fallbackInitials={isAdmin ? "AD" : "SA"}
    />
  )
}
