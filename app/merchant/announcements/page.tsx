"use client"

import { AnnouncementsInbox } from "@/features/announcements/components/announcements-inbox"
import { pageContent } from "@/config/content"

export default function MerchantAnnouncementsPage() {
  return (
    <AnnouncementsInbox
      title={pageContent.merchant.announcements.title}
      description={pageContent.merchant.announcements.description}
    />
  )
}
