"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { Announcement } from "@/lib/types"
import { useAnnouncements } from "@/features/announcements/hooks/use-announcements"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { FormDialog } from "@/components/form-dialog"
import { ANNOUNCEMENT_TARGET_ROLE_LABELS } from "@/lib/constants"
import { announcementRoles } from "@/lib/validation"

// datetime-local inputs expect "YYYY-MM-DDTHH:mm" — strip the seconds/tz.
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ""
  return iso.slice(0, 16)
}

interface Props {
  announcement: Announcement | null
  onClose: () => void
}

export function EditAnnouncementDialog({ announcement, onClose }: Props) {
  const { updateAnnouncement } = useAnnouncements()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: "",
    content: "",
    publishedAt: "",
    expiresAt: "",
    isActive: true,
    targetRoles: [] as string[],
  })

  // Sync form fields whenever a different announcement is opened.
  useEffect(() => {
    if (!announcement) return
    setForm({
      title: announcement.title,
      content: announcement.content,
      publishedAt: toLocalInput(announcement.publishedAt),
      expiresAt: toLocalInput(announcement.expiresAt),
      isActive: announcement.isActive,
      targetRoles: announcement.targetRoles ?? [],
    })
  }, [announcement])

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleRole(role: string) {
    setForm((prev) => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter((r) => r !== role)
        : [...prev.targetRoles, role],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!announcement) return
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required.")
      return
    }
    if (form.targetRoles.length === 0) {
      toast.error("Select at least one target role.")
      return
    }
    setSubmitting(true)
    const res = await updateAnnouncement(announcement.id, {
      title: form.title.trim(),
      content: form.content.trim(),
      // Send ISO string if filled in; null to clear.
      publishedAt: form.publishedAt
        ? new Date(form.publishedAt).toISOString()
        : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      isActive: form.isActive,
      targetRoles: form.targetRoles,
    })
    setSubmitting(false)
    if (!res.ok) {
      toast.error(res.error ?? "Could not update the announcement.")
      return
    }
    toast.success("Announcement updated.")
    onClose()
  }

  return (
    <FormDialog
      open={announcement !== null}
      onOpenChange={(o) => !o && onClose()}
      title="Edit announcement"
      description="Update the announcement details."
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel="Save changes"
      submittingLabel="Saving…"
      submitDisabled={
        !form.title.trim() ||
        !form.content.trim() ||
        form.targetRoles.length === 0
      }
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-ann-title">Title</Label>
        <Input
          id="edit-ann-title"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-ann-content">Content</Label>
        <Textarea
          id="edit-ann-content"
          value={form.content}
          onChange={(e) => update("content", e.target.value)}
          rows={4}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-ann-published-at">Publish date (optional)</Label>
          <Input
            id="edit-ann-published-at"
            type="datetime-local"
            value={form.publishedAt}
            onChange={(e) => update("publishedAt", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-ann-expires-at">Expiry date (optional)</Label>
          <Input
            id="edit-ann-expires-at"
            type="datetime-local"
            value={form.expiresAt}
            onChange={(e) => update("expiresAt", e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Target roles</Label>
        <div className="flex flex-wrap gap-2">
          {announcementRoles.map((role) => {
            const active = form.targetRoles.includes(role)
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-foreground/40"
                }`}
              >
                {ANNOUNCEMENT_TARGET_ROLE_LABELS[role]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="edit-ann-active"
          checked={form.isActive}
          onCheckedChange={(v) => update("isActive", v)}
        />
        <Label htmlFor="edit-ann-active">Active</Label>
      </div>
    </FormDialog>
  )
}
