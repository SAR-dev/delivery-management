"use client"

import { useState } from "react"
import { UserPlus } from "lucide-react"
import { toast } from "sonner"
import { usePlatform } from "@/lib/platform-context"
import type { Role } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { FormDialog } from "@/components/dialog/form-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type CreatableRole = Extract<Role, "ADMIN" | "WAREHOUSE_ADMIN">

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "ADMIN" as CreatableRole,
  warehouseId: "" as string,
  canManagePricing: false,
}

export function CreateAccountDialog() {
  const { createAccount, warehouses } = usePlatform()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(EMPTY)

  const unassignedWarehouses = warehouses.filter((w) => !w.managedBy)

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.password
    ) {
      toast.error("Name, email, phone and password are required.")
      return
    }
    setSubmitting(true)
    try {
      await createAccount({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role,
        ...(form.role === "ADMIN"
          ? { canManagePricing: form.canManagePricing }
          : { warehouseId: form.warehouseId || null }),
      })
      toast.success(
        `${form.role === "ADMIN" ? "Admin" : "Warehouse Admin"} account created.`,
      )
      setForm(EMPTY)
      setOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setForm(EMPTY)
      }}
      trigger={
        <Button>
          <UserPlus className="size-4" />
          Create account
        </Button>
      }
      title="Create team account"
      description="Provision an Admin or Warehouse Admin. These roles cannot self register and are created only by the Super Admin."
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel="Create account"
      submitIcon={<UserPlus className="size-4" />}
      showCancel={false}
      fullWidthButtons
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="role">Role</Label>
        <Select
          value={form.role}
          onValueChange={(v) => update("role", v as CreatableRole)}
        >
          <SelectTrigger id="role" className="w-fit min-w-40">
            <SelectValue>
              {(value) => (value === "ADMIN" ? "Admin" : "Warehouse Admin")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="WAREHOUSE_ADMIN">Warehouse Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Full name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Jane Doe"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="jane@parcelflow.io"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+8801711000000"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Temporary password</Label>
        <Input
          id="password"
          type="password"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          placeholder="At least 6 characters"
          minLength={6}
        />
      </div>

      {form.role === "WAREHOUSE_ADMIN" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="warehouse">Assigned warehouse</Label>
          <Select
            value={form.warehouseId}
            onValueChange={(v) => update("warehouseId", v ?? "")}
          >
            <SelectTrigger id="warehouse">
              <SelectValue placeholder="Select a warehouse (optional)">
                {(value) => {
                  const w = unassignedWarehouses.find((x) => x.id === value)
                  return w
                    ? `${w.name} \u00B7 ${w.city}`
                    : "Select a warehouse (optional)"
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {unassignedWarehouses.length === 0 ? (
                <SelectItem value="none" disabled>
                  No unassigned warehouses
                </SelectItem>
              ) : (
                unassignedWarehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} {"\u00B7"} {w.city}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="border-border flex items-start justify-between gap-4 rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="pricing" className="text-sm">
              Can manage merchant pricing
            </Label>
            <p className="text-muted-foreground text-xs">
              Allow this Admin to set merchant base rates after approval.
            </p>
          </div>
          <Switch
            id="pricing"
            checked={form.canManagePricing}
            onCheckedChange={(v) => update("canManagePricing", v)}
          />
        </div>
      )}
    </FormDialog>
  )
}
