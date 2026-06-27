"use client"

import { useEffect, useRef, useState } from "react"
import {
  CheckCircle2,
  ClipboardList,
  MapPin,
  Phone,
  UserPen,
  Warehouse as WarehouseIcon,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { useRiders } from "@/features/riders/hooks/use-riders"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import type { RiderTaskType } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { FormDialog } from "@/components/form-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TASK_TYPE_OPTIONS, taskTypeLabel } from "../task-type"
import type { EditRiderDialogProps } from "./types"

export function EditRiderDialog({
  rider,
  open,
  onOpenChange,
  canReassignWarehouse = true,
}: EditRiderDialogProps) {
  const { updateRider, toggleRiderActive } = useRiders()
  const { warehouses } = useWarehouses()
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: "",
    phone: "",
    zone: "",
    warehouseId: "",
    taskType: "DELIVERY" as RiderTaskType,
    isActive: true,
  })
  const [openCount, setOpenCount] = useState(0)
  const prevOpen = useRef(open)
  useEffect(() => {
    if (open && !prevOpen.current) {
      setOpenCount((c) => c + 1)
      setEditing(false)
    }
    prevOpen.current = open
  }, [open])

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleClose(next: boolean) {
    onOpenChange(next)
    if (!next) setEditing(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rider) return
    if (!form.name.trim() || !form.phone.trim() || !form.zone.trim()) {
      toast.error("Name, phone and zone are required.")
      return
    }
    if (canReassignWarehouse && !form.warehouseId) {
      toast.error("Select a home warehouse.")
      return
    }
    setSubmitting(true)
    try {
      await updateRider(rider.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        zone: form.zone.trim(),
        taskType: form.taskType,
        ...(canReassignWarehouse ? { warehouseId: form.warehouseId } : {}),
      })
      if (form.isActive !== rider.isActive) {
        await toggleRiderActive(rider.id)
      }
      toast.success(`${form.name.trim()} updated.`)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  if (!rider) return null

  const assignedWarehouse = warehouses.find((w) => w.id === rider.warehouseId)

  if (!editing) {
    return (
      <FormDialog
        key={`${rider.id}-${openCount}`}
        open={open}
        onOpenChange={handleClose}
        title={rider.name}
        description="Rider details"
        onConfirm={() => setEditing(true)}
        submitLabel="Edit rider"
        submitIcon={<UserPen className="size-4" />}
        showCancel={false}
        fullWidthButtons
      >
        <div className="flex flex-col gap-3 py-2">
          <div className="flex items-center gap-3 text-sm">
            <Phone className="text-muted-foreground size-4 shrink-0" />
            <span className="tabular-nums">{rider.phone}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="text-muted-foreground size-4 shrink-0" />
            <span>{rider.zone}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <ClipboardList className="text-muted-foreground size-4 shrink-0" />
            <Badge variant="secondary" className="font-normal">
              {taskTypeLabel(rider.taskType)}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <WarehouseIcon className="text-muted-foreground size-4 shrink-0" />
            {assignedWarehouse ? (
              <Badge variant="secondary" className="font-normal">
                {assignedWarehouse.name} · {assignedWarehouse.city}
              </Badge>
            ) : (
              <span className="text-muted-foreground">No warehouse</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3">
              {rider.isActive ? (
                <CheckCircle2 className="text-chart-2 size-4 shrink-0" />
              ) : (
                <XCircle className="text-muted-foreground size-4 shrink-0" />
              )}
              <span
                className={
                  rider.isActive ? "text-chart-2" : "text-muted-foreground"
                }
              >
                {rider.isActive ? "Active" : "Disabled"}
              </span>
            </div>
            <Switch
              checked={rider.isActive}
              disabled
              aria-label={`Active state for ${rider.name}`}
            />
          </div>
        </div>
      </FormDialog>
    )
  }

  return (
    <FormDialog
      key={`${rider.id}-${openCount}`}
      open={open}
      onOpenChange={handleClose}
      title="Edit rider"
      description={
        canReassignWarehouse
          ? "Update rider details, task type, and home warehouse."
          : "Update rider details and task type."
      }
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel="Save changes"
      submitIcon={<UserPen className="size-4" />}
      cancelLabel="Cancel"
      onCancel={() => setEditing(false)}
      fullWidthButtons
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-rider-name">Full name</Label>
        <Input
          id="edit-rider-name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Karim Hossain"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-rider-phone">Phone</Label>
          <Input
            id="edit-rider-phone"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+8801711000000"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-rider-zone">Service zone</Label>
          <Input
            id="edit-rider-zone"
            value={form.zone}
            onChange={(e) => update("zone", e.target.value)}
            placeholder="Dhaka North"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-rider-task-type">Task type</Label>
        <Select
          value={form.taskType}
          onValueChange={(v) =>
            update("taskType", (v as RiderTaskType) ?? "DELIVERY")
          }
        >
          <SelectTrigger id="edit-rider-task-type" className="w-full">
            <SelectValue>
              {(value) => taskTypeLabel(value as RiderTaskType)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TASK_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {canReassignWarehouse && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-rider-warehouse">Home warehouse</Label>
          <Select
            value={form.warehouseId}
            onValueChange={(v) => update("warehouseId", v ?? "")}
          >
            <SelectTrigger id="edit-rider-warehouse" className="w-full">
              <SelectValue placeholder="Select a warehouse">
                {(value) => {
                  const w = warehouses.find((x) => x.id === value)
                  return w ? `${w.name} \u00B7 ${w.city}` : "Select a warehouse"
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name} {"\u00B7"} {w.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="edit-rider-active" className="cursor-pointer">
            Active status
          </Label>
          <span className="text-muted-foreground text-xs">
            {form.isActive
              ? "Rider is currently active"
              : "Rider is currently disabled"}
          </span>
        </div>
        <Switch
          id="edit-rider-active"
          checked={form.isActive}
          onCheckedChange={(checked) => update("isActive", checked)}
          aria-label="Toggle active status"
        />
      </div>
    </FormDialog>
  )
}
