"use client"

import { useState } from "react"
import { UserPlus } from "lucide-react"
import { toast } from "sonner"
import { useRiders } from "@/features/riders/hooks/use-riders"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormDialog } from "@/components/form-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { RiderTaskType } from "@/lib/types"
import { TASK_TYPE_OPTIONS, taskTypeLabel } from "./task-type"

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  zone: "",
  warehouseId: "",
  taskType: "DELIVERY" as RiderTaskType,
}

export function CreateRiderDialog() {
  const { createRider } = useRiders()
  const { warehouses } = useWarehouses()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(EMPTY)

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
      !form.zone.trim()
    ) {
      toast.error("Name, email, phone and zone are required.")
      return
    }
    if (!form.warehouseId) {
      toast.error("Select a home warehouse.")
      return
    }
    setSubmitting(true)
    try {
      await createRider({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        zone: form.zone.trim(),
        warehouseId: form.warehouseId,
        taskType: form.taskType,
      })
      toast.success(`Rider ${form.name.trim()} added.`)
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
          Add rider
        </Button>
      }
      title="Add rider"
      description="Creates a rider profile and a login account. The rider's name will be set as their initial password."
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel="Add rider"
      submitIcon={<UserPlus className="size-4" />}
      showCancel={false}
      fullWidthButtons
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="rider-name">Full name</Label>
        <Input
          id="rider-name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Karim Hossain"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="rider-email">Email</Label>
        <Input
          id="rider-email"
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="karim@example.com"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="rider-phone">Phone</Label>
          <Input
            id="rider-phone"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+8801711000000"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="rider-zone">Service zone</Label>
          <Input
            id="rider-zone"
            value={form.zone}
            onChange={(e) => update("zone", e.target.value)}
            placeholder="Dhaka North"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="rider-warehouse">Home warehouse</Label>
          <Select
            value={form.warehouseId}
            onValueChange={(v) => update("warehouseId", v ?? "")}
          >
            <SelectTrigger id="rider-warehouse" className="w-full">
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="rider-task-type">Task type</Label>
          <Select
            value={form.taskType}
            onValueChange={(v) =>
              update("taskType", (v as RiderTaskType) ?? "DELIVERY")
            }
          >
            <SelectTrigger id="rider-task-type" className="w-full">
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
      </div>
    </FormDialog>
  )
}
