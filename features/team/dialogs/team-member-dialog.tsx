"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { toast } from "sonner"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RoleBadge } from "@/components/role-badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const UNASSIGNED = "__unassigned__"

interface TeamMemberDialogProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onToggleActive: (user: User) => Promise<void>
  onTogglePricing: (user: User) => Promise<void>
  onUpdateWarehouse: (user: User, warehouseId: string | null) => Promise<void>
}

export function TeamMemberDialog({
  user,
  open,
  onOpenChange,
  onToggleActive,
  onTogglePricing,
  onUpdateWarehouse,
}: TeamMemberDialogProps) {
  const { warehouses } = useWarehouses()
  const [saving, setSaving] = useState(false)

  async function handleToggleActive() {
    if (!user) return
    setSaving(true)
    await onToggleActive(user)
    setSaving(false)
    onOpenChange(false)
  }

  async function handleTogglePricing() {
    if (!user) return
    setSaving(true)
    await onTogglePricing(user)
    setSaving(false)
    onOpenChange(false)
  }

  async function handleChangeWarehouse(warehouseId: string | null) {
    if (!user) return
    if ((user.warehouseId ?? null) === warehouseId) return
    setSaving(true)
    await onUpdateWarehouse(user, warehouseId)
    toast.success(
      warehouseId
        ? `${user.name} now manages ${warehouses.find((w) => w.id === warehouseId)?.name ?? "a warehouse"}.`
        : `${user.name} is no longer assigned to a warehouse.`,
    )
    setSaving(false)
    onOpenChange(false)
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4" />
            Edit team member
          </DialogTitle>
          <DialogDescription>
            Update settings for {user.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-medium">{user.name}</span>
              <span className="text-muted-foreground text-xs">
                {user.email}
              </span>
            </div>
            <RoleBadge role={user.role} />
          </div>

          <div className="border-border border-t" />

          {user.role === "ADMIN" && (
            <div className="flex items-center justify-between">
              <Label htmlFor="pricing-toggle" className="text-sm">
                Pricing access
              </Label>
              <Switch
                id="pricing-toggle"
                checked={Boolean(user.canManagePricing)}
                disabled={saving}
                onCheckedChange={handleTogglePricing}
              />
            </div>
          )}

          {user.role === "WAREHOUSE_ADMIN" && (
            <div className="flex items-center justify-between gap-4">
              <Label className="text-sm">Warehouse</Label>
              <Select
                value={user.warehouseId ?? UNASSIGNED}
                disabled={saving}
                onValueChange={(v) =>
                  handleChangeWarehouse(v === UNASSIGNED ? null : v)
                }
              >
                <SelectTrigger className="w-fit min-w-44">
                  <SelectValue>
                    {(value) => {
                      if (!value || value === UNASSIGNED) return "Unassigned"
                      const w = warehouses.find((x) => x.id === value)
                      return w ? `${w.name} \u00B7 ${w.city}` : "Unknown"
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} {"\u00B7"} {w.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="active-toggle" className="text-sm">
              Account active
            </Label>
            <Switch
              id="active-toggle"
              checked={user.isActive}
              disabled={saving}
              onCheckedChange={handleToggleActive}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
