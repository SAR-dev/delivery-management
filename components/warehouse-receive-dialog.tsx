"use client"

import { useState } from "react"
import {
  Loader2,
  Warehouse as WarehouseIcon,
  MapPin,
  Phone,
  Package,
  Bike,
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
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium leading-snug">{value}</p>
      </div>
    </div>
  )
}

export function WarehouseReceiveDialog({
  order,
  merchantName,
  riderName,
  warehouseName,
  open,
  onOpenChange,
}: {
  order: Order | null
  merchantName: string
  riderName: string
  warehouseName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { receiveOrderAtWarehouse } = usePlatform()
  const [submitting, setSubmitting] = useState(false)

  if (!order) return null

  function handleConfirm() {
    setSubmitting(true)
    const result = receiveOrderAtWarehouse(order!.id)
    if (result.ok) {
      toast.success(`${order!.code} received into ${warehouseName}.`)
      onOpenChange(false)
    } else {
      toast.error(result.error ?? "Unable to log parcel into warehouse.")
    }
    setSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receive {order.code} into warehouse</DialogTitle>
          <DialogDescription>
            Confirm the parcel has physically arrived and log it in. The order
            status updates to In warehouse and the rider&apos;s pickup duty ends.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4">
          <InfoRow
            icon={WarehouseIcon}
            label="Receiving warehouse"
            value={warehouseName}
          />
          <InfoRow icon={Bike} label="Delivered by rider" value={riderName} />
          <Separator className="my-1" />
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
                Logging in
              </>
            ) : (
              <>
                <WarehouseIcon className="size-4" />
                Receive parcel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
