"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { MapPin, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useDivisions } from "@/features/divisions/hooks/use-divisions"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { usePickupLocations } from "@/features/pickup-locations/hooks/use-pickup-locations"
import { useOrders } from "@/features/orders/hooks/use-orders"
import type { Division } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { FormDialog } from "@/components/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable, type DataTableColumn } from "@/components/data-table"

interface DivisionRow extends Division {
  usageCount: number
}

export default function DivisionsPage() {
  const router = useRouter()
  const { currentUser } = useAuth()
  const {
    divisions,
    allDivisions: _allDivisions,
    total,
    page: _page,
    setPage,
    limit: _limit,
    setLimit,
    query,
    setQuery,
    createDivision,
    updateDivision,
    deleteDivision,
    isLoading,
  } = useDivisions()
  const { allWarehouses } = useWarehouses()
  const { allMerchants } = useMerchants()
  const { pickupLocations } = usePickupLocations()
  const { allOrders } = useOrders()

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN"
  useEffect(() => {
    if (currentUser && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [currentUser, isSuperAdmin, router])

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Division | null>(null)
  const [deleting, setDeleting] = useState<DivisionRow | null>(null)
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Count how many records reference each division so admins understand the
  // impact of disabling/deleting one, and we can block deletes of in-use rows.
  // Usage counts always reflect the full sets of the other resources, never
  // narrowed by an unrelated search on those resources' own pages.
  const rows = useMemo<DivisionRow[]>(() => {
    return divisions.map((d) => {
      const usageCount =
        allWarehouses.filter((w) => w.divisionId === d.id).length +
        allMerchants.filter((m) => m.divisionId === d.id).length +
        pickupLocations.filter((p) => p.divisionId === d.id).length +
        allOrders.filter((o) => o.deliveryDivisionId === d.id).length
      return { ...d, usageCount }
    })
  }, [divisions, allWarehouses, allMerchants, pickupLocations, allOrders])

  function openCreate() {
    setName("")
    setCreateOpen(true)
  }

  function openEdit(division: Division) {
    setName(division.name)
    setEditing(division)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const res = await createDivision(name.trim())
    setSubmitting(false)
    if (!res.ok) {
      toast.error(res.error ?? "Could not create the division.")
      return
    }
    toast.success(`Division "${name.trim()}" created.`)
    setCreateOpen(false)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSubmitting(true)
    const res = await updateDivision(editing.id, { name: name.trim() })
    setSubmitting(false)
    if (!res.ok) {
      toast.error(res.error ?? "Could not rename the division.")
      return
    }
    toast.success("Division renamed.")
    setEditing(null)
  }

  async function handleToggleActive(division: Division) {
    const res = await updateDivision(division.id, {
      isActive: !division.isActive,
    })
    if (!res.ok) {
      toast.error(res.error ?? "Could not update the division.")
      return
    }
    toast.success(
      `${division.name} ${division.isActive ? "disabled" : "enabled"}.`,
    )
  }

  async function handleDelete() {
    if (!deleting) return
    setSubmitting(true)
    const res = await deleteDivision(deleting.id)
    setSubmitting(false)
    if (!res.ok) {
      toast.error(res.error ?? "Could not delete the division.")
      return
    }
    toast.success(`Division "${deleting.name}" deleted.`)
    setDeleting(null)
  }

  const columns: DataTableColumn<DivisionRow>[] = [
    {
      id: "name",
      header: "Division",
      sortable: true,
      sortValue: (d) => d.name,
      cell: (d) => (
        <div className="flex items-center gap-2 font-medium">
          <MapPin className="text-muted-foreground size-4" aria-hidden />
          {d.name}
        </div>
      ),
    },
    {
      id: "usage",
      header: "In use by",
      sortable: true,
      sortValue: (d) => d.usageCount,
      headClassName: "hidden sm:table-cell",
      cellClassName: "hidden sm:table-cell",
      cell: (d) => (
        <span className="text-muted-foreground text-sm">
          {d.usageCount} {d.usageCount === 1 ? "record" : "records"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      sortValue: (d) => (d.isActive ? 1 : 0),
      cell: (d) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={d.isActive}
            onCheckedChange={() => handleToggleActive(d)}
            aria-label={`Toggle active state for ${d.name}`}
          />
          <Badge variant={d.isActive ? "default" : "secondary"}>
            {d.isActive ? "Active" : "Disabled"}
          </Badge>
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      headClassName: "w-12",
      cell: (d) => (
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
              <DropdownMenuItem onClick={() => openEdit(d)}>
                <Pencil className="size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={d.usageCount > 0}
                onClick={() => setDeleting(d)}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  if (!isSuperAdmin) return null

  return (
    <>
      <PageHeader
        title={pageContent.dashboard.divisions.title}
        description={pageContent.dashboard.divisions.description}
      >
        <Button type="button" onClick={openCreate}>
          <Plus className="size-4" />
          Add division
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <DataTable
            id="dashboard-divisions"
            searchable
            columns={columns}
            data={rows}
            getRowKey={(d) => d.id}
            initialSortId="name"
            emptyMessage="No divisions yet. Add one to get started."
            loading={isLoading}
            serverPaginated
            total={total}
            query={query}
            onQueryChange={setQuery}
            onPageChange={(p, l) => {
              setPage(p)
              setLimit(l)
            }}
          />
        </CardContent>
      </Card>

      <p className="text-muted-foreground mt-4 text-xs">
        A division can only be deleted when no records reference it. Disable a
        division instead to stop it appearing in new address forms while keeping
        existing records intact.
      </p>

      {/* Create */}
      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add division"
        description="Create a new geographic division."
        onSubmit={handleCreate}
        submitLabel="Create division"
        submittingLabel="Creating…"
        submitting={submitting}
        submitDisabled={!name.trim()}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="division-name" className="text-sm font-medium">
            Division name
          </label>
          <Input
            id="division-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dhaka"
            autoFocus
          />
        </div>
      </FormDialog>

      {/* Edit */}
      <FormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Rename division"
        description="Update the name of this division."
        onSubmit={handleEdit}
        submitLabel="Save changes"
        submittingLabel="Saving…"
        submitting={submitting}
        submitDisabled={!name.trim()}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="division-edit-name" className="text-sm font-medium">
            Division name
          </label>
          <Input
            id="division-edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
      </FormDialog>

      {/* Delete confirm */}
      <FormDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete division"
        description={
          deleting
            ? `Permanently delete "${deleting.name}"? This cannot be undone.`
            : ""
        }
        onConfirm={handleDelete}
        submitLabel="Delete"
        submittingLabel="Deleting…"
        submitting={submitting}
        submitVariant="destructive"
      >
        <p className="text-muted-foreground text-sm">
          This division is not referenced by any records, so it is safe to
          remove.
        </p>
      </FormDialog>
    </>
  )
}
