"use client"

import { RoleSidebar } from "@/components/sidebar/role-sidebar"
import { usePlatform } from "@/lib/platform-context"
import { WAREHOUSE_SIDEBAR } from "@/lib/nav-config"

export function WarehouseSidebar() {
  const { currentWarehouse } = usePlatform()
  return (
    <RoleSidebar
      config={WAREHOUSE_SIDEBAR}
      footerSubtitle={currentWarehouse?.name}
    />
  )
}
