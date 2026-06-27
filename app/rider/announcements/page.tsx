"use client"

import { AnnouncementsInbox } from "@/features/announcements/components/announcements-inbox"
import { pageContent } from "@/config/content"

export default function RiderAnnouncementsPage() {
  return (
    <AnnouncementsInbox
      title={pageContent.rider.announcements.title}
      description={pageContent.rider.announcements.description}
    />
  )
}
