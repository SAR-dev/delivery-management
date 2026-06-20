"use client"

import { useEffect, useState } from "react"
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  UserPen,
  Warehouse as WarehouseIcon,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { usePlatform } from "@/lib/platform-context"
import type { Rider } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const UNASSIGNED = "__unassigned__"

interface EditRiderDialogProps {
  rider: Rider | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditRiderDialog({
  rider,
  open,
  onOpenChange,
}: EditRiderDialogProps) {
  const { updateRider, toggleRiderActive, warehouses } = usePlatform()
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: "",
    phone: "",
    zone: "",
    warehouseId: UNASSIGNED as string,
    isActive: true,
  })

  useEffect(() => {
    if (rider) {
      setForm({
        name: rider.name,
        phone: rider.phone,
        zone: rider.zone,
        warehouseId: rider.warehouseId ?? UNASSIGNED,
        isActive: rider.isActive,
      })
    }
    // Reset to detail view when a new rider is opened
    setEditing(false)
  }, [rider])

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
    setSubmitting(true)
    try {
      await updateRider(rider.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        zone: form.zone.trim(),
        warehouseId:
          form.warehouseId === UNASSIGNED ? null : form.warehouseId || null,
      })
      // Apply active state change if it differs from the current rider state
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!editing ? (
          <>
            <DialogHeader>
              <DialogTitle>{rider.name}</DialogTitle>
              <DialogDescription>Rider details</DialogDescription>
            </DialogHeader>

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
                <WarehouseIcon className="text-muted-foreground size-4 shrink-0" />
                {assignedWarehouse ? (
                  <Badge variant="secondary" className="font-normal">
                    {assignedWarehouse.name} · {assignedWarehouse.city}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">
                    Pickup only (no warehouse)
                  </span>
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

            <DialogFooter>
              <Button
                onClick={() => setEditing(true)}
                className="w-full sm:w-auto"
              >
                <UserPen className="size-4" />
                Edit rider
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Edit rider</DialogTitle>
              <DialogDescription>
                Update rider details. Change the home warehouse to reassign them
                to a different dispatch location.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                <Label htmlFor="edit-rider-warehouse">Home warehouse</Label>
                <Select
                  value={form.warehouseId}
                  onValueChange={(v) => update("warehouseId", v ?? UNASSIGNED)}
                >
                  <SelectTrigger id="edit-rider-warehouse" className="w-full">
                    <SelectValue>
                      {(value) => {
                        if (!value || value === UNASSIGNED)
                          return "Pickup only (no warehouse)"
                        const w = warehouses.find((x) => x.id === value)
                        return w
                          ? `${w.name} \u00B7 ${w.city}`
                          : "Pickup only (no warehouse)"
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>
                      Pickup only (no warehouse)
                    </SelectItem>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} {"\u00B7"} {w.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UserPen className="size-4" />
                  )}
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
