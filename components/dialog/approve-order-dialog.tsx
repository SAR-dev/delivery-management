"use client"

import { useState } from "react"
import { Loader2, ShieldCheck, AlertTriangle, Bike } from "lucide-react"
import { toast } from "sonner"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}

export function ApproveOrderDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { merchants, pickupLocations, riders, approveAndAssignOrder } =
    usePlatform()
  const [submitting, setSubmitting] = useState(false)
  const [riderId, setRiderId] = useState("")
  const [syncedId, setSyncedId] = useState<string | null>(null)

  // Reset rider selection whenever a different order is opened.
  if (order && order.id !== syncedId) {
    setSyncedId(order.id)
    setRiderId("")
  }

  if (!order) return null

  const merchant = merchants.find((m) => m.id === order.merchantId)
  const pickup = pickupLocations.find((p) => p.id === order.pickupLocationId)
  const activeRiders = riders.filter((r) => r.isActive)
  const exceedsWeight = merchant
    ? order.parcelWeightKg > merchant.maxWeightKg
    : false

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault()
    if (!riderId) {
      toast.error("Assign a pickup rider before approving.")
      return
    }
    setSubmitting(true)
    try {
      const result = await approveAndAssignOrder(order!.id, riderId)
      if (result.ok) {
        const rider = activeRiders.find((r) => r.id === riderId)
        toast.success(
          `${order!.code} approved and assigned to ${rider?.name ?? "rider"}.`,
        )
        onOpenChange(false)
      } else {
        toast.error(result.error ?? "Unable to approve order.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Approve order {order.code}</DialogTitle>
          <DialogDescription>
            Verify the parcel details, then assign a pickup rider to collect it
            from{" "}
            <span className="font-medium text-foreground">
              {merchant?.businessName ?? "the merchant"}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleApprove} className="flex flex-col gap-4">
          {/* Order summary */}
          <dl className="space-y-2 rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <DetailRow
              label="Recipient"
              value={`${order.recipientName} · ${order.recipientPhone}`}
            />
            <DetailRow
              label="Deliver to"
              value={`${order.deliveryAddress}, ${order.deliveryCity}`}
            />
            <DetailRow
              label="Pickup from"
              value={pickup ? `${pickup.label}` : "—"}
            />
            <Separator className="my-1" />
            <DetailRow
              label="Parcel weight"
              value={`${order.parcelWeightKg} KG${
                merchant ? ` / ${merchant.maxWeightKg} KG max` : ""
              }`}
            />
            <DetailRow label="Delivery type" value={order.deliveryType} />
            <DetailRow
              label="Total collectible"
              value={formatTk(order.totalCollectible)}
            />
          </dl>

          {exceedsWeight ? (
            <p className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              Parcel exceeds the weight limit and cannot be approved.
            </p>
          ) : (
            <p className="flex items-center gap-2 rounded-md bg-chart-2/10 px-3 py-2 text-sm text-chart-2">
              <ShieldCheck className="size-4 shrink-0" />
              Weight compliant — ready for approval.
            </p>
          )}

          {/* Rider assignment */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="rider">Assign pickup rider</Label>
            <Select value={riderId} onValueChange={(v) => setRiderId(v ?? "")}>
              <SelectTrigger id="rider" className="w-full">
                <SelectValue placeholder="Select a rider">
                  {(value) => {
                    const r = activeRiders.find((x) => x.id === value)
                    return r ? `${r.name} — ${r.zone}` : "Select a rider"
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {activeRiders.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <Bike className="size-4 text-muted-foreground" />
                    <span>
                      {r.name} — {r.zone}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || exceedsWeight}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Approving
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  Approve & assign
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
