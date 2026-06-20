"use client"

import { useEffect, useState } from "react"
import {
  Loader2,
  Truck,
  MapPin,
  Phone,
  Package,
  Bike,
  Warehouse as WarehouseIcon,
} from "lucide-react"
import { toast } from "sonner"
import { usePlatform } from "@/lib/platform-context"
import type { Order, Rider } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium leading-snug">{value}</p>
      </div>
    </div>
  )
}

export function WarehouseDispatchDialog({
  order,
  merchantName,
  warehouseName,
  deliveryRiders,
  open,
  onOpenChange,
}: {
  order: Order | null
  merchantName: string
  warehouseName: string
  deliveryRiders: Rider[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { assignDeliveryRider } = usePlatform()
  const [riderId, setRiderId] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)

  // Reset the selection whenever a new order is opened.
  useEffect(() => {
    if (open) setRiderId("")
  }, [open, order?.id])

  if (!order) return null

  const selectedRider = deliveryRiders.find((r) => r.id === riderId)

  async function handleConfirm() {
    if (!riderId) {
      toast.error("Select a delivery rider first.")
      return
    }
    setSubmitting(true)
    try {
      const result = await assignDeliveryRider(order!.id, riderId)
      if (result.ok) {
        toast.success(
          `${order!.code} dispatched with ${selectedRider?.name ?? "rider"}.`,
        )
        onOpenChange(false)
      } else {
        toast.error(result.error ?? "Unable to dispatch parcel.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dispatch {order.code} for delivery</DialogTitle>
          <DialogDescription>
            Assign a delivery rider from {warehouseName}. The order status
            updates to In transit and the rider becomes responsible for handoff.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4">
          <InfoRow
            icon={Package}
            label="Parcel"
            value={`${order.parcelWeightKg} KG · ${order.deliveryType} · from ${merchantName}`}
          />
          <InfoRow
            icon={MapPin}
            label="Final destination"
            value={`${order.deliveryAddress}, ${order.deliveryCity}`}
          />
          <InfoRow
            icon={Phone}
            label="Recipient"
            value={`${order.recipientName} · ${order.recipientPhone}`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="delivery-rider">Delivery rider</Label>
          {deliveryRiders.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
              No active delivery riders are based at this warehouse.
            </p>
          ) : (
            <Select value={riderId} onValueChange={(v) => setRiderId(v ?? "")}>
              <SelectTrigger id="delivery-rider">
                <SelectValue placeholder="Select a delivery rider" />
              </SelectTrigger>
              <SelectContent>
                {deliveryRiders.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} · {r.zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedRider ? (
            <div className="mt-1 flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
              <InfoRow
                icon={Bike}
                label="Assigned rider"
                value={`${selectedRider.name} · ${selectedRider.phone}`}
              />
              <Separator className="my-0.5" />
              <InfoRow
                icon={WarehouseIcon}
                label="Dispatching from"
                value={warehouseName}
              />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || deliveryRiders.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Dispatching
              </>
            ) : (
              <>
                <Truck className="size-4" />
                Dispatch parcel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
