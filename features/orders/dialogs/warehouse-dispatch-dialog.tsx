"use client"

import { useEffect, useRef, useState } from "react"
import {
  Bike,
  MapPin,
  Package,
  Phone,
  Truck,
  Warehouse as WarehouseIcon,
} from "lucide-react"
import { toast } from "sonner"
import { useOrders } from "@/features/orders/hooks/use-orders"
import type { Order, Rider } from "@/lib/types"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { FormDialog } from "@/components/form-dialog"
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
      <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-sm leading-snug font-medium">{value}</p>
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
  const { assignDeliveryRider } = useOrders()
  const [riderId, setRiderId] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [openCount, setOpenCount] = useState(0)
  const prevOpen = useRef(open)
  useEffect(() => {
    if (open && !prevOpen.current) setOpenCount((c) => c + 1)
    prevOpen.current = open
  }, [open])

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
    <FormDialog
      key={`${order.id}-${openCount}`}
      open={open}
      onOpenChange={onOpenChange}
      title={`Dispatch ${order.code} for delivery`}
      description={`Assign a delivery rider from ${warehouseName}. The order status updates to In transit and the rider becomes responsible for handoff.`}
      onConfirm={handleConfirm}
      submitting={submitting}
      submittingLabel="Dispatching"
      submitLabel="Dispatch parcel"
      submitIcon={<Truck className="size-4" />}
      submitDisabled={deliveryRiders.length === 0}
    >
      <div className="border-border bg-muted/40 flex flex-col gap-3 rounded-lg border p-4">
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
          <p className="border-border text-muted-foreground rounded-md border border-dashed px-3 py-3 text-sm">
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
          <div className="border-border bg-muted/40 mt-1 flex flex-col gap-2 rounded-lg border p-3">
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
    </FormDialog>
  )
}
