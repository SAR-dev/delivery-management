"use client"

import { RoleSidebar } from "@/components/sidebar/role-sidebar"
import { usePlatform } from "@/lib/platform-context"
import { RIDER_SIDEBAR } from "@/lib/nav-config"

export function RiderSidebar() {
  const { currentRider } = usePlatform()
  return (
    <RoleSidebar config={RIDER_SIDEBAR} footerSubtitle={currentRider?.zone} />
  )
}
