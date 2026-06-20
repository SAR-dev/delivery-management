"use client"

import { RoleSidebar } from "@/components/sidebar/role-sidebar"
import { usePlatform } from "@/lib/platform-context"
import { MERCHANT_SIDEBAR } from "@/lib/nav-config"

export function MerchantSidebar() {
  const { currentMerchant } = usePlatform()
  return <RoleSidebar config={MERCHANT_SIDEBAR} footerSubtitle={currentMerchant?.businessName} />
}
