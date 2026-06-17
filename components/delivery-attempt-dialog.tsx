"use client"

import { useState } from "react"
import {
  Loader2,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Package,
  User,
} from "lucide-react"
import { toast } from "sonner"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

type Outcome = "DELIVERED" | "FAILED"

export function DeliveryAttemptDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { markDelivered, markDeliveryFailed } = usePlatform()
  const [outcome, setOutcome] = useState<Outcome>("DELIVERED")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (!order) return null

  function reset() {
    setOutcome("DELIVERED")
    setNote("")
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function handleSubmit() {
    setSubmitting(true)
    if (outcome === "DELIVERED") {
      const result = markDelivered(order!.id)
      if (result.ok) {
        toast.success(
          `${order!.code} delivered. ${formatTk(order!.totalCollectible)} collected.`,
        )
        handleOpenChange(false)
      } else {
        toast.error(result.error ?? "Unable to mark delivered.")
      }
    } else {
      const result = markDeliveryFailed(order!.id, note)
      if (result.ok) {
        toast.success(`${order!.code} marked as a failed attempt.`)
        handleOpenChange(false)
      } else {
        toast.error(result.error ?? "Unable to record failed attempt.")
      }
    }
    setSubmitting(false)
  }

  const failedNeedsNote = outcome === "FAILED" && !note.trim()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delivery attempt — {order.code}</DialogTitle>
          <DialogDescription>
            Record the outcome of this delivery attempt. The merchant and admins
            see the result in real time.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4">
          <InfoRow
            icon={User}
            label="Recipient"
            value={order.recipientName}
          />
          <InfoRow icon={Phone} label="Phone" value={order.recipientPhone} />
          <InfoRow
            icon={MapPin}
            label="Deliver to"
            value={`${order.deliveryAddress}, ${order.deliveryCity}`}
          />
          <Separator className="my-1" />
          <InfoRow
            icon={Package}
            label="Collect on delivery"
            value={formatTk(order.totalCollectible)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setOutcome("DELIVERED")}
            className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
              outcome === "DELIVERED"
                ? "border-chart-2 bg-chart-2/10 text-chart-2"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <CheckCircle2 className="size-4" />
            Delivered
          </button>
          <button
            type="button"
            onClick={() => setOutcome("FAILED")}
            className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
              outcome === "FAILED"
                ? "border-destructive bg-destructive/10 text-destructive"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <XCircle className="size-4" />
            Failed
          </button>
        </div>

        {outcome === "DELIVERED" ? (
          <p className="text-sm text-muted-foreground">
            Confirm you collected {formatTk(order.totalCollectible)} and captured
            proof of delivery from {order.recipientName.split(" ")[0]}.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="failure-note">
              Reason for failed attempt <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="failure-note"
              placeholder="e.g. Recipient not available, phone switched off, wrong address…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              The parcel returns to the warehouse queue for the admin to process.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || failedNeedsNote}
            variant={outcome === "FAILED" ? "destructive" : "default"}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving
              </>
            ) : outcome === "DELIVERED" ? (
              <>
                <CheckCircle2 className="size-4" />
                Confirm delivery
              </>
            ) : (
              <>
                <XCircle className="size-4" />
                Record failure
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
