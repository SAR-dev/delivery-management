"use client"

import { useState } from "react"
import { Coins, Save, RotateCcw, Calculator } from "lucide-react"
import { toast } from "sonner"
import { usePlatform } from "@/lib/platform-context"
import { PageHeader } from "@/components/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

function calcSecurityMoney(
  productCost: number,
  threshold: number,
  flatFee: number,
  percentage: number,
) {
  if (productCost <= threshold) return flatFee
  return productCost * (percentage / 100)
}

export default function SecurityMoneyPage() {
  const { securityConfig, updateSecurityConfig } = usePlatform()

  const [threshold, setThreshold] = useState(
    String(securityConfig.lowValueThreshold),
  )
  const [flatFee, setFlatFee] = useState(String(securityConfig.lowValueFlatFee))
  const [percentage, setPercentage] = useState(
    String(securityConfig.highValuePercentage),
  )
  const [previewCost, setPreviewCost] = useState("1500")

  const parsed = {
    threshold: Number(threshold) || 0,
    flatFee: Number(flatFee) || 0,
    percentage: Number(percentage) || 0,
  }

  const dirty =
    parsed.threshold !== securityConfig.lowValueThreshold ||
    parsed.flatFee !== securityConfig.lowValueFlatFee ||
    parsed.percentage !== securityConfig.highValuePercentage

  const invalid =
    parsed.threshold <= 0 || parsed.flatFee < 0 || parsed.percentage <= 0

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (invalid) {
      toast.error("Please enter valid, positive values.")
      return
    }
    updateSecurityConfig({
      lowValueThreshold: parsed.threshold,
      lowValueFlatFee: parsed.flatFee,
      highValuePercentage: parsed.percentage,
    })
    toast.success("Security money rules updated.")
  }

  function handleReset() {
    setThreshold(String(securityConfig.lowValueThreshold))
    setFlatFee(String(securityConfig.lowValueFlatFee))
    setPercentage(String(securityConfig.highValuePercentage))
  }

  const previewValue = Number(previewCost) || 0
  const previewResult = calcSecurityMoney(
    previewValue,
    parsed.threshold,
    parsed.flatFee,
    parsed.percentage,
  )
  const previewTier =
    previewValue <= parsed.threshold ? "flat fee" : "percentage"

  return (
    <>
      <PageHeader
        title="Security Money Rules"
        description="Set how the platform calculates the refundable security amount collected on every order. These rules apply across all merchants."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Config form */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="size-5 text-primary" />
              Calculation rules
            </CardTitle>
            <CardDescription>
              Last updated{" "}
              {new Date(securityConfig.updatedAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}{" "}
              by {securityConfig.updatedBy}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="threshold">Low-value threshold (TK)</Label>
                <Input
                  id="threshold"
                  inputMode="decimal"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Orders at or below this product cost use the flat fee.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="flatFee">Flat fee (TK)</Label>
                  <Input
                    id="flatFee"
                    inputMode="decimal"
                    value={flatFee}
                    onChange={(e) => setFlatFee(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Charged when {"\u2264"} threshold.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="percentage">High-value rate (%)</Label>
                  <Input
                    id="percentage"
                    inputMode="decimal"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Charged when {">"} threshold.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                <p className="font-medium">Resulting rule</p>
                <p className="mt-1 text-muted-foreground">
                  Orders up to{" "}
                  <span className="font-medium text-foreground">
                    {parsed.threshold} TK
                  </span>{" "}
                  are charged a flat{" "}
                  <span className="font-medium text-foreground">
                    {parsed.flatFee} TK
                  </span>
                  . Orders above that are charged{" "}
                  <span className="font-medium text-foreground">
                    {parsed.percentage}%
                  </span>{" "}
                  of product cost.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={!dirty || invalid}>
                  <Save className="size-4" />
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={!dirty}
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Live preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="size-5 text-primary" />
              Preview
            </CardTitle>
            <CardDescription>
              Test the security money for a sample order value.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="previewCost">Sample product cost (TK)</Label>
              <Input
                id="previewCost"
                inputMode="decimal"
                value={previewCost}
                onChange={(e) => setPreviewCost(e.target.value)}
              />
            </div>

            <div className="rounded-lg border border-border bg-card p-5 text-center">
              <p className="text-sm text-muted-foreground">Security money</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-primary">
                {previewResult.toFixed(2)}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  TK
                </span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Using the {previewTier} tier
              </p>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Security money is collected from the recipient at delivery and is
              retained by the platform as revenue. It is not part of the
              merchant payout.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
