"use client"

import { useState } from "react"
import {
  PackageCheck,
  MapPin,
  Package,
  Store,
  ExternalLink,
  ImageOff,
} from "lucide-react"
import { toast } from "sonner"
import { useOrders } from "@/features/orders/hooks/use-orders"
import type { Order, PickupLocation } from "@/lib/types"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { FormDialog } from "@/components/form-dialog"
import { ImageGalleryUpload } from "@/components/image-upload"
import { ImageZoom } from "@/components/image-zoom"

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
  pickupLocation,
  open,
  onOpenChange,
}: {
  order: Order | null
  merchantName: string
  pickupLocation: PickupLocation | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { markOrderPickedUp } = useOrders()
  const [submitting, setSubmitting] = useState(false)
  const [proofUrls, setProofUrls] = useState<string[]>([])

  if (!order) return null

  const pickupLabel = pickupLocation?.label ?? "—"
  const pickupAddress = pickupLocation?.address ?? "—"
  const mapLink = pickupLocation?.mapLink?.trim() || null
  const photos = (pickupLocation?.imageLinks ?? []).filter(
    (link) => link.trim().length > 0,
  )

  function handleOpenChange(next: boolean) {
    if (!next) setProofUrls([])
    onOpenChange(next)
  }

  async function handleConfirm() {
    setSubmitting(true)
    try {
      const result = await markOrderPickedUp(order!.id, proofUrls)
      if (result.ok) {
        toast.success(`${order!.code} marked as picked up.`)
        handleOpenChange(false)
      } else {
        toast.error(result.error ?? "Unable to update pickup.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={`Confirm pickup of ${order.code}`}
      description="Collect the parcel from the merchant, then confirm to update the status to Picked up. The merchant sees this change in real time."
      onConfirm={handleConfirm}
      submitting={submitting}
      submittingLabel="Updating"
      submitDisabled={proofUrls.length === 0}
      submitLabel="Confirm pickup"
      submitIcon={<PackageCheck className="size-4" />}
    >
      <div className="border-border bg-muted/40 flex flex-col gap-3 rounded-lg border p-4">
        <InfoRow icon={Store} label="Merchant" value={merchantName} />
        <InfoRow
          icon={MapPin}
          label="Pickup location"
          value={`${pickupLabel} — ${pickupAddress}`}
        />

        {mapLink ? (
          <a
            href={mapLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary ml-7 inline-flex w-fit items-center gap-1.5 text-sm hover:underline"
          >
            <ExternalLink className="size-3.5 shrink-0" />
            Open in maps
          </a>
        ) : null}

        <div className="ml-7 flex flex-col gap-1.5">
          <p className="text-muted-foreground text-xs">
            Photos {photos.length > 0 ? `(${photos.length})` : ""}
          </p>
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((link, i) => (
                <ImageZoom
                  key={i}
                  src={link}
                  alt={`Pickup location reference ${i + 1}`}
                  className="size-full object-cover transition-transform group-hover:scale-105"
                />
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground/60 inline-flex items-center gap-1.5 text-xs italic">
              <ImageOff className="size-3.5" />
              No photos provided.
            </span>
          )}
        </div>

        <Separator className="my-1" />
        <InfoRow
          icon={Package}
          label="Parcel"
          value={`${order.parcelWeightKg} KG · ${order.deliveryType}`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">
          Capture photos of the parcel as proof you collected it from the
          merchant.
        </p>
        <Label>
          Pickup proof photos <span className="text-destructive">*</span>
        </Label>
        <ImageGalleryUpload
          value={proofUrls}
          onChange={setProofUrls}
          folder="pickups"
        />
      </div>
    </FormDialog>
  )
}
