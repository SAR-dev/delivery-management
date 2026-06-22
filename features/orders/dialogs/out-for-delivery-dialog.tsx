"use client"

import { useState } from "react"
import { Navigation, MapPin, User, Phone } from "lucide-react"
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

export function OutForDeliveryDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { markOutForDelivery } = useOrders()
  const [submitting, setSubmitting] = useState(false)

  if (!order) return null

  async function handleConfirm() {
    setSubmitting(true)
    try {
      const result = await markOutForDelivery(order!.id)
      if (result.ok) {
        toast.success(`${order!.code} is now out for delivery.`)
        onOpenChange(false)
      } else {
        toast.error(result.error ?? "Unable to start delivery.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Start delivery for ${order.code}`}
      description="Confirm you have the parcel with you and are heading out now. This updates the status to Out for delivery."
      onConfirm={handleConfirm}
      submitting={submitting}
      submittingLabel="Updating"
      submitLabel="Confirm, out for delivery"
      submitIcon={<Navigation className="size-4" />}
    >
      <div className="border-border bg-muted/40 flex flex-col gap-3 rounded-lg border p-4">
        <InfoRow icon={User} label="Recipient" value={order.recipientName} />
        <InfoRow icon={Phone} label="Phone" value={order.recipientPhone} />
        <Separator className="my-1" />
        <InfoRow
          icon={MapPin}
          label="Destination"
          value={`${order.deliveryAddress}, ${order.deliveryCity}`}
        />
      </div>
    </FormDialog>
  )
}
