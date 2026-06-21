"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Warehouse as WarehouseIcon } from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import type { Warehouse } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { FormDialog } from "@/components/dialog/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable, type DataTableColumn } from "@/components/data-table"

interface WarehouseRow extends Warehouse {
  usageCount: number
  divisionName: string
}

interface WarehouseForm {
  name: string
  address: string
  city: string
  divisionId: string
}

const emptyForm: WarehouseForm = {
  name: "",
  address: "",
  city: "",
  divisionId: "",
}

export default function WarehousesPage() {
  const router = useRouter()
  const {
    currentUser,
    warehouses,
    divisions,
    orders,
    riders,
    team,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
  } = usePlatform()

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN"
  useEffect(() => {
    if (currentUser && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [currentUser, isSuperAdmin, router])

  // Dialog state.
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Warehouse | null>(null)
  const [deleting, setDeleting] = useState<WarehouseRow | null>(null)
  const [form, setForm] = useState<WarehouseForm>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  // Active divisions, plus the one currently selected even if disabled, so the
  // edit form never silently drops a warehouse's existing division.
  const divisionOptions = useMemo(
    () => divisions.filter((d) => d.isActive || d.id === form.divisionId),
    [divisions, form.divisionId],
  )

  // Count how many records reference each warehouse so admins understand the
  // impact of disabling/deleting one, and we can block deletes of in-use rows.
  const rows = useMemo<WarehouseRow[]>(() => {
    return warehouses
      .map((w) => {
        const usageCount =
          orders.filter((o) => o.warehouseId === w.id).length +
          riders.filter((r) => r.warehouseId === w.id).length +
          team.filter((u) => u.warehouseId === w.id).length
        const divisionName =
          divisions.find((d) => d.id === w.divisionId)?.name ?? "—"
        return { ...w, usageCount, divisionName }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [warehouses, orders, riders, team, divisions])

  function openCreate() {
    setForm(emptyForm)
    setCreateOpen(true)
  }

  function openEdit(w: Warehouse) {
    setForm({
      name: w.name,
      address: w.address,
      city: w.city,
      divisionId: w.divisionId ?? "",
    })
    setEditing(w)
  }

  const formValid =
    form.name.trim() !== "" &&
    form.address.trim() !== "" &&
    form.city.trim() !== "" &&
    form.divisionId !== ""

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const res = await createWarehouse({
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      divisionId: form.divisionId,
    })
    setSubmitting(false)
    if (!res.ok) {
      toast.error(res.error ?? "Could not create the warehouse.")
      return
    }
    toast.success(`Warehouse "${form.name.trim()}" created.`)
    setCreateOpen(false)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSubmitting(true)
    const res = await updateWarehouse(editing.id, {
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      divisionId: form.divisionId,
    })
    setSubmitting(false)
    if (!res.ok) {
      toast.error(res.error ?? "Could not update the warehouse.")
      return
    }
    toast.success("Warehouse updated.")
    setEditing(null)
  }

  async function handleToggleActive(w: Warehouse) {
    const res = await updateWarehouse(w.id, { isActive: !w.isActive })
    if (!res.ok) {
      toast.error(res.error ?? "Could not update the warehouse.")
      return
    }
    toast.success(`${w.name} ${w.isActive ? "disabled" : "enabled"}.`)
  }

  async function handleDelete() {
    if (!deleting) return
    setSubmitting(true)
    const res = await deleteWarehouse(deleting.id)
    setSubmitting(false)
    if (!res.ok) {
      toast.error(res.error ?? "Could not delete the warehouse.")
      return
    }
    toast.success(`Warehouse "${deleting.name}" deleted.`)
    setDeleting(null)
  }

  const columns: DataTableColumn<WarehouseRow>[] = [
    {
      id: "name",
      header: "Warehouse",
      sortable: true,
      sortValue: (w) => w.name,
      cell: (w) => (
        <div className="flex items-center gap-2 font-medium">
          <WarehouseIcon className="text-muted-foreground size-4" aria-hidden />
          <div className="leading-tight">
            <div>{w.name}</div>
            <div className="text-muted-foreground text-xs font-normal">
              {w.address}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "city",
      header: "City",
      sortable: true,
      sortValue: (w) => w.city,
      headClassName: "hidden sm:table-cell",
      cellClassName: "hidden sm:table-cell",
      cell: (w) => <span className="text-sm">{w.city}</span>,
    },
    {
      id: "division",
      header: "Division",
      sortable: true,
      sortValue: (w) => w.divisionName,
      headClassName: "hidden md:table-cell",
      cellClassName: "hidden md:table-cell",
      cell: (w) => (
        <span className="text-muted-foreground text-sm">{w.divisionName}</span>
      ),
    },
    {
      id: "usage",
      header: "In use by",
      sortable: true,
      sortValue: (w) => w.usageCount,
      headClassName: "hidden lg:table-cell",
      cellClassName: "hidden lg:table-cell",
      cell: (w) => (
        <span className="text-muted-foreground text-sm">
          {w.usageCount} {w.usageCount === 1 ? "record" : "records"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      sortValue: (w) => (w.isActive ? 1 : 0),
      cell: (w) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={w.isActive}
            onCheckedChange={() => handleToggleActive(w)}
            aria-label={`Toggle active state for ${w.name}`}
          />
          <Badge variant={w.isActive ? "default" : "secondary"}>
            {w.isActive ? "Active" : "Disabled"}
          </Badge>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (w) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => openEdit(w)}
            aria-label={`Edit ${w.name}`}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setDeleting(w)}
            aria-label={`Delete ${w.name}`}
            disabled={w.usageCount > 0}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ]

  if (!isSuperAdmin) return null

  return (
    <>
      <PageHeader
        title="Warehouses"
        description="Manage the warehouse hubs parcels are routed through, dispatched from, and reconciled at."
      >
        <Button type="button" onClick={openCreate}>
          <Plus className="size-4" />
          Add warehouse
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={rows}
            getRowKey={(w) => w.id}
            initialSortId="name"
            emptyMessage="No warehouses yet. Add one to get started."
          />
        </CardContent>
      </Card>

      <p className="text-muted-foreground mt-4 text-xs">
        A warehouse can only be deleted when no orders, riders, or warehouse
        admins reference it. Disable a warehouse instead to keep existing
        records intact while taking it out of rotation.
      </p>

      {/* Create */}
      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add warehouse"
        description="Create a new warehouse hub."
        onSubmit={handleCreate}
        submitLabel="Create warehouse"
        submittingLabel="Creating…"
        submitting={submitting}
        submitDisabled={!formValid}
      >
        <WarehouseFields
          form={form}
          setForm={setForm}
          divisionOptions={divisionOptions}
        />
      </FormDialog>

      {/* Edit */}
      <FormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Edit warehouse"
        description="Update this warehouse's details."
        onSubmit={handleEdit}
        submitLabel="Save changes"
        submittingLabel="Saving…"
        submitting={submitting}
        submitDisabled={!formValid}
      >
        <WarehouseFields
          form={form}
          setForm={setForm}
          divisionOptions={divisionOptions}
        />
      </FormDialog>

      {/* Delete confirm */}
      <FormDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete warehouse"
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
          This warehouse is not referenced by any records, so it is safe to
          remove.
        </p>
      </FormDialog>
    </>
  )
}

function WarehouseFields({
  form,
  setForm,
  divisionOptions,
}: {
  form: WarehouseForm
  setForm: React.Dispatch<React.SetStateAction<WarehouseForm>>
  divisionOptions: { id: string; name: string }[]
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="warehouse-name" className="text-sm font-medium">
          Warehouse name
        </label>
        <Input
          id="warehouse-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Dhaka Central Hub"
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="warehouse-address" className="text-sm font-medium">
          Address
        </label>
        <Input
          id="warehouse-address"
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          placeholder="Street address"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="warehouse-city" className="text-sm font-medium">
          City
        </label>
        <Input
          id="warehouse-city"
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          placeholder="e.g. Dhaka"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="warehouse-division" className="text-sm font-medium">
          Division
        </label>
        <Select
          value={form.divisionId}
          onValueChange={(v) =>
            setForm((f) => ({ ...f, divisionId: v ?? "" }))
          }
        >
          <SelectTrigger id="warehouse-division">
            <SelectValue placeholder="Select a division">
              {divisionOptions.find((d) => d.id === form.divisionId)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {divisionOptions.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
