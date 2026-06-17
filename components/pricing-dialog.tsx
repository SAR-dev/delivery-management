"use client"

import { useState } from "react"
import { Loader2, Calculator } from "lucide-react"
import { toast } from "sonner"
import { usePlatform } from "@/lib/platform-context"
import { calcDeliveryCharge, formatTk } from "@/lib/pricing"
import type { Merchant } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

export function PricingDialog({
  merchant,
  open,
  onOpenChange,
}: {
  merchant: Merchant | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { setMerchantPricing } = usePlatform()
  const [submitting, setSubmitting] = useState(false)
  const [baseRate, setBaseRate] = useState("0")
  const [extraRatePerKg, setExtraRatePerKg] = useState("15")
  const [freeWeightKg, setFreeWeightKg] = useState("1")
  const [maxWeightKg, setMaxWeightKg] = useState("3")
  const [previewWeight, setPreviewWeight] = useState("2")
  // Track which merchant the form is currently synced to.
  const [syncedId, setSyncedId] = useState<string | null>(null)

  // Sync form fields when a new merchant is opened.
  if (merchant && merchant.id !== syncedId) {
    setSyncedId(merchant.id)
    setBaseRate(String(merchant.baseRate))
    setExtraRatePerKg(String(merchant.extraRatePerKg))
    setFreeWeightKg(String(merchant.freeWeightKg))
    setMaxWeightKg(String(merchant.maxWeightKg))
    setPreviewWeight(String(merchant.maxWeightKg))
  }

  if (!merchant) return null

  const pricing = {
    baseRate: Number(baseRate) || 0,
    extraRatePerKg: Number(extraRatePerKg) || 0,
    freeWeightKg: Number(freeWeightKg) || 0,
    maxWeightKg: Number(maxWeightKg) || 0,
  }
  const weight = Number(previewWeight) || 0
  const breakdown = calcDeliveryCharge(pricing, weight)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (pricing.baseRate <= 0) {
      toast.error("Base rate must be greater than 0.")
      return
    }
    setSubmitting(true)
    setMerchantPricing(merchant!.id, pricing)
    toast.success(`Pricing updated for ${merchant!.businessName}.`)
    setSubmitting(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Set delivery pricing</DialogTitle>
          <DialogDescription>
            Assign rates for{" "}
            <span className="font-medium text-foreground">
              {merchant.businessName}
            </span>
            . The merchant&apos;s live calculator reflects these instantly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="baseRate">Base rate (TK)</Label>
              <Input
                id="baseRate"
                type="number"
                min="0"
                step="1"
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="extraRate">Extra per KG (TK)</Label>
              <Input
                id="extraRate"
                type="number"
                min="0"
                step="1"
                value={extraRatePerKg}
                onChange={(e) => setExtraRatePerKg(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="freeWeight">Free weight (KG)</Label>
              <Input
                id="freeWeight"
                type="number"
                min="0"
                step="0.5"
                value={freeWeightKg}
                onChange={(e) => setFreeWeightKg(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxWeight">Max weight (KG)</Label>
              <Input
                id="maxWeight"
                type="number"
                min="0"
                step="0.5"
                value={maxWeightKg}
                onChange={(e) => setMaxWeightKg(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Live calculator */}
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calculator className="size-4 text-primary" />
              Live charge preview
            </div>
            <div className="mt-3 flex items-end gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="previewWeight" className="text-xs text-muted-foreground">
                  Sample parcel weight (KG)
                </Label>
                <Input
                  id="previewWeight"
                  type="number"
                  min="0"
                  step="0.1"
                  value={previewWeight}
                  onChange={(e) => setPreviewWeight(e.target.value)}
                />
              </div>
            </div>

            {breakdown.exceedsMax ? (
              <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Parcel exceeds the {pricing.maxWeightKg} KG maximum — this order
                would be rejected.
              </p>
            ) : (
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    Base ({pricing.freeWeightKg} KG included)
                  </dt>
                  <dd className="tabular-nums">{formatTk(breakdown.baseRate)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    Extra weight ({breakdown.billableExtraKg} KG &times;{" "}
                    {formatTk(pricing.extraRatePerKg)})
                  </dt>
                  <dd className="tabular-nums">
                    {formatTk(breakdown.extraWeightCharge)}
                  </dd>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between font-semibold">
                  <dt>Delivery charge</dt>
                  <dd className="tabular-nums text-primary">
                    {formatTk(breakdown.total)}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving
                </>
              ) : (
                "Save pricing"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
