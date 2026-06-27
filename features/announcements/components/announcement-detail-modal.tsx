"use client"

import type { Announcement } from "@/lib/types"
import { ANNOUNCEMENT_TARGET_ROLE_LABELS } from "@/lib/constants"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Props {
  announcement: Announcement | null
  onClose: () => void
}

export function AnnouncementDetailModal({ announcement, onClose }: Props) {
  if (!announcement) return null

  const publishedDate = announcement.publishedAt
    ? new Date(announcement.publishedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  const expiresDate = announcement.expiresAt
    ? new Date(announcement.expiresAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

  return (
    <Dialog open={announcement !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-6 leading-snug">
            {announcement.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta row */}
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {publishedDate && <span>Published {publishedDate}</span>}
            {expiresDate && (
              <>
                <span aria-hidden>·</span>
                <span>Expires {expiresDate}</span>
              </>
            )}
          </div>

          {/* Audience chips */}
          <div className="flex flex-wrap gap-1.5">
            {(announcement.targetRoles as string[]).map((role) => (
              <span
                key={role}
                className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium"
              >
                {ANNOUNCEMENT_TARGET_ROLE_LABELS[role] ?? role}
              </span>
            ))}
          </div>

          {/* Body */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {announcement.content}
          </p>

          {/* Footer meta */}
          <p className="text-muted-foreground/70 text-xs">
            Posted by {announcement.createdBy}
          </p>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" onClick={onClose} />}>
            Close
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
