"use client"

import { useEffect, useState } from "react"
import { Loader2, Wallet, Package } from "lucide-react"
import { toast } from "sonner"
import { usePlatform } from "@/lib/platform-context"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

const PAYOUT_METHODS = ["bKash", "Nagad", "Rocket", "Bank transfer"]

export function PayoutRequestDialog({
  payableOrders,
  open,
  onOpenChange,
}: {
  payableOrders: Order[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { requestPayout } = usePlatform()
  const [method, setMethod] = useState("bKash")
  const [details, setDetails] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setMethod("bKash")
      setDetails("")
    }
  }, [open])

  const total = payableOrders.reduce((sum, o) => sum + o.productCost, 0)
  const detailsLabel =
    method === "Bank transfer" ? "Bank account details" : `${method} number`

  async function handleSubmit() {
    if (!details.trim()) {
      toast.error("Enter your payout account details.")
      return
    }
    setSubmitting(true)
    try {
      const result = await requestPayout({
        payoutMethod: method,
        payoutDetails: details,
      })
      if (result.ok) {
        toast.success(
          `Payout request ${result.request?.code} submitted for ${formatTk(total)}.`,
        )
        onOpenChange(false)
      } else {
        toast.error(result.error ?? "Unable to submit payout request.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request payout</DialogTitle>
          <DialogDescription>
            Request the product cost from your delivered, settled
            orders. Delivery charge and security money are platform revenue and
            are not paid out.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="size-4" />
              {payableOrders.length} order
              {payableOrders.length === 1 ? "" : "s"} included
            </span>
            <span className="text-sm text-muted-foreground">Payout amount</span>
          </div>
          <div className="mt-2 flex items-end justify-between">
            <p className="font-mono text-xs text-muted-foreground">
              {payableOrders.map((o) => o.code).join(", ")}
            </p>
            <p className="text-2xl font-semibold tabular-nums text-primary">
              {formatTk(total)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="payout-method">Payout method</Label>
            <Select
              value={method}
              onValueChange={(value) => setMethod(value ?? "bKash")}
            >
              <SelectTrigger id="payout-method">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {PAYOUT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="payout-details">{detailsLabel}</Label>
            <Input
              id="payout-details"
              placeholder={
                method === "Bank transfer"
                  ? "Bank · A/C number"
                  : "+8801XXXXXXXXX"
              }
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
        </div>

        <Separator />

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
            onClick={handleSubmit}
            disabled={submitting || payableOrders.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Submitting
              </>
            ) : (
              <>
                <Wallet className="size-4" />
                Submit request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
