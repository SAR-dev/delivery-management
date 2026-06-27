"use client"

import { AnnouncementsInbox } from "@/features/announcements/components/announcements-inbox"
import { pageContent } from "@/config/content"

export default function DashboardAnnouncementsInboxPage() {
  return (
    <AnnouncementsInbox
      title={pageContent.dashboard.announcementsInbox.title}
      description={pageContent.dashboard.announcementsInbox.description}
    />
  )
}
