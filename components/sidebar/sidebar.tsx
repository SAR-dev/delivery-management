"use client"

import { RoleSidebar } from "@/components/sidebar/role-sidebar"
import { ADMIN_SIDEBAR } from "@/lib/nav-config"

export function Sidebar() {
  return (
    <RoleSidebar
      config={ADMIN_SIDEBAR}
      fallbackName="Super Admin"
      fallbackInitials="SA"
    />
  )
}
