"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Loader2,
  Megaphone,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useAnnouncements } from "@/features/announcements/hooks/use-announcements"
import { CreateAnnouncementDialog } from "@/features/announcements/dialogs/create-announcement-dialog"
import { EditAnnouncementDialog } from "@/features/announcements/dialogs/edit-announcement-dialog"
import { AnnouncementStatusBadge } from "@/features/announcements/components/announcement-status-badge"
import type { Announcement } from "@/lib/types"
import { ANNOUNCEMENT_TARGET_ROLE_LABELS } from "@/lib/constants"
import { PageHeader } from "@/components/page-header"
import { FormDialog } from "@/components/form-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { pageContent } from "@/config/content"

export default function AnnouncementsPage() {
  const { currentUser } = useAuth()
  const {
    announcements,
    total,
    page,
    setPage,
    limit,
    setLimit,
    query,
    setQuery,
    sortId,
    sortDir,
    onSortChange,
    updateAnnouncement,
    deleteAnnouncement,
    isLoading,
  } = useAnnouncements()

  const [editing, setEditing] = useState<Announcement | null>(null)
  const [deleting, setDeleting] = useState<Announcement | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const canManage =
    currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ADMIN"

  async function handleToggleActive(a: Announcement) {
    setTogglingId(a.id)
    const res = await updateAnnouncement(a.id, { isActive: !a.isActive })
    if (!res.ok) toast.error(res.error ?? "Could not update the announcement.")
    else
      toast.success(`"${a.title}" ${a.isActive ? "deactivated" : "activated"}.`)
    setTogglingId(null)
  }

  async function handleDelete() {
    if (!deleting) return
    setSubmitting(true)
    const res = await deleteAnnouncement(deleting.id)
    setSubmitting(false)
    if (!res.ok) {
      toast.error(res.error ?? "Could not delete the announcement.")
      return
    }
    toast.success(`Announcement "${deleting.title}" deleted.`)
    setDeleting(null)
  }

  const columns: DataTableColumn<Announcement>[] = [
    {
      id: "title",
      header: "Title",
      sortable: true,
      sortValue: (a) => a.title,
      cell: (a) => (
        <div className="flex items-center gap-2 font-medium">
          <Megaphone className="text-muted-foreground size-4 shrink-0" />
          <span className="truncate">{a.title}</span>
        </div>
      ),
    },
    {
      id: "targetRoles",
      header: "Audience",
      headClassName: "hidden md:table-cell",
      cellClassName: "hidden md:table-cell",
      cell: (a) => (
        <div className="flex flex-wrap gap-1">
          {(a.targetRoles ?? []).map((role: string) => (
            <span
              key={role}
              className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs"
            >
              {ANNOUNCEMENT_TARGET_ROLE_LABELS[role] ?? role}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: "publishedAt",
      header: "Publishes",
      sortable: true,
      sortValue: (a) => a.publishedAt ?? "",
      headClassName: "hidden lg:table-cell",
      cellClassName: "hidden lg:table-cell",
      cell: (a) => (
        <span className="text-muted-foreground text-sm">
          {a.publishedAt
            ? new Date(a.publishedAt).toLocaleDateString()
            : "Draft"}
        </span>
      ),
    },
    {
      id: "expiresAt",
      header: "Expires",
      sortable: true,
      sortValue: (a) => a.expiresAt ?? "",
      headClassName: "hidden lg:table-cell",
      cellClassName: "hidden lg:table-cell",
      cell: (a) => (
        <span className="text-muted-foreground text-sm">
          {a.expiresAt ? new Date(a.expiresAt).toLocaleDateString() : "Never"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      sortValue: (a) => (a.isActive ? 1 : 0),
      cell: (a) => (
        <div className="flex items-center gap-2">
          {canManage && (
            <Switch
              checked={a.isActive}
              disabled={togglingId === a.id}
              onCheckedChange={() => handleToggleActive(a)}
              aria-label={`Toggle active state for ${a.title}`}
            />
          )}
          {togglingId === a.id ? (
            <Loader2 className="text-muted-foreground size-3 animate-spin" />
          ) : (
            <AnnouncementStatusBadge announcement={a} />
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      headClassName: "w-12",
      cell: (a) =>
        canManage ? (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setEditing(a)}>
                  <Pencil className="size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleting(a)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null,
    },
  ]

  return (
    <>
      <PageHeader
        title={pageContent.dashboard.announcements.title}
        description={pageContent.dashboard.announcements.description}
      >
        {canManage && <CreateAnnouncementDialog />}
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <DataTable
            id="dashboard-announcements"
            searchable
            columns={columns}
            data={announcements}
            getRowKey={(a) => a.id}
            initialSortId="createdAt"
            emptyMessage="No announcements yet."
            loading={isLoading}
            serverPaginated
            total={total}
            query={query}
            onQueryChange={setQuery}
            onPageChange={(p, l) => {
              setPage(p)
              setLimit(l)
            }}
            serverSortId={sortId}
            serverSortDir={sortDir}
            onSortChange={onSortChange}
          />
        </CardContent>
      </Card>

      <EditAnnouncementDialog
        announcement={editing}
        onClose={() => setEditing(null)}
      />

      {/* Delete confirm */}
      <FormDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete announcement"
        description={
          deleting
            ? `Permanently delete "${deleting.title}"? This cannot be undone.`
            : ""
        }
        onConfirm={handleDelete}
        submitLabel="Delete"
        submittingLabel="Deleting…"
        submitting={submitting}
        submitVariant="destructive"
      >
        <p className="text-muted-foreground text-sm">
          This will permanently remove the announcement from the platform.
        </p>
      </FormDialog>
    </>
  )
}
