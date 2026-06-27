"use client"

import { AnnouncementsInbox } from "@/features/announcements/components/announcements-inbox"
import { pageContent } from "@/config/content"

export default function WarehouseAnnouncementsPage() {
  return (
    <AnnouncementsInbox
      title={pageContent.warehouse.announcements.title}
      description={pageContent.warehouse.announcements.description}
    />
  )
}
