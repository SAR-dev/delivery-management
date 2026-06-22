"use client"

import { useState } from "react"
import {
  Warehouse as WarehouseIcon,
  MapPin,
  Phone,
  Package,
  Bike,
} from "lucide-react"
import { toast } from "sonner"
import { useOrders } from "@/features/orders/hooks/use-orders"
import type { Order } from "@/lib/types"
import { Separator } from "@/components/ui/separator"
import { FormDialog } from "@/components/form-dialog"

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
  const { receiveOrderAtWarehouse } = useOrders()
  const [submitting, setSubmitting] = useState(false)

  if (!order) return null

  async function handleConfirm() {
    setSubmitting(true)
    try {
      const result = await receiveOrderAtWarehouse(order!.id)
      if (result.ok) {
        toast.success(`${order!.code} received into ${warehouseName}.`)
        onOpenChange(false)
      } else {
        toast.error(result.error ?? "Unable to log parcel into warehouse.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Receive ${order.code} into warehouse`}
      description="Confirm the parcel has physically arrived and log it in. The order status updates to In warehouse and the rider's pickup duty ends."
      onConfirm={handleConfirm}
      submitting={submitting}
      submittingLabel="Logging in"
      submitLabel="Receive parcel"
      submitIcon={<WarehouseIcon className="size-4" />}
    >
      <div className="border-border bg-muted/40 flex flex-col gap-3 rounded-lg border p-4">
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
    </FormDialog>
  )
}
