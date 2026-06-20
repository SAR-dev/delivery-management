"use client"

import { useState } from "react"
import { UserPlus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { usePlatform } from "@/lib/platform-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const UNASSIGNED = "__unassigned__"

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  zone: "",
  warehouseId: UNASSIGNED as string,
}

export function CreateRiderDialog() {
  const { createRider, warehouses } = usePlatform()
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
    setSubmitting(true)
    try {
      await createRider({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        zone: form.zone.trim(),
        warehouseId:
          form.warehouseId === UNASSIGNED ? null : form.warehouseId || null,
      })
      toast.success(`Rider ${form.name.trim()} added.`)
      setForm(EMPTY)
      setOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setForm(EMPTY)
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <UserPlus className="size-4" />
            Add rider
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add rider</DialogTitle>
          <DialogDescription>
            Creates a rider profile and a login account. The rider's name will
            be set as their initial password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="rider-warehouse">Home warehouse</Label>
            <Select
              value={form.warehouseId}
              onValueChange={(v) => update("warehouseId", v ?? UNASSIGNED)}
            >
              <SelectTrigger id="rider-warehouse" className="w-full">
                <SelectValue>
                  {(value) => {
                    if (!value || value === UNASSIGNED) {
                      return "Pickup only (no warehouse)"
                    }
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

          <DialogFooter>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              Add rider
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
