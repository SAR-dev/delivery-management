"use client"

import { useState } from "react"
import {
  Loader2,
  PackageCheck,
  MapPin,
  Package,
  Store,
} from "lucide-react"
import { toast } from "sonner"
import { usePlatform } from "@/lib/platform-context"
import type { Order } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
      <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-sm leading-snug font-medium">{value}</p>
      </div>
    </div>
  )
}

export function PickupConfirmDialog({
  order,
  merchantName,
  pickupLabel,
  pickupAddress,
  open,
  onOpenChange,
}: {
  order: Order | null
  merchantName: string
  pickupLabel: string
  pickupAddress: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { markOrderPickedUp } = usePlatform()
  const [submitting, setSubmitting] = useState(false)

  if (!order) return null

  async function handleConfirm() {
    setSubmitting(true)
    try {
      const result = await markOrderPickedUp(order!.id)
      if (result.ok) {
        toast.success(`${order!.code} marked as picked up.`)
        onOpenChange(false)
      } else {
        toast.error(result.error ?? "Unable to update pickup.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm pickup of {order.code}</DialogTitle>
          <DialogDescription>
            Collect the parcel from the merchant, then confirm to update the
            status to Picked up. The merchant sees this change in real time.
          </DialogDescription>
        </DialogHeader>

        <div className="border-border bg-muted/40 flex flex-col gap-3 rounded-lg border p-4">
          <InfoRow icon={Store} label="Merchant" value={merchantName} />
          <InfoRow
            icon={MapPin}
            label="Pickup location"
            value={`${pickupLabel} — ${pickupAddress}`}
          />
          <Separator className="my-1" />
          <InfoRow
            icon={Package}
            label="Parcel"
            value={`${order.parcelWeightKg} KG · ${order.deliveryType}`}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Updating
              </>
            ) : (
              <>
                <PackageCheck className="size-4" />
                Confirm pickup
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
