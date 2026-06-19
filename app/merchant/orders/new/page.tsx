"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Loader2,
  Calculator,
  ArrowLeft,
  AlertTriangle,
  PackageCheck,
} from "lucide-react"
import { toast } from "sonner"
import { usePlatform } from "@/lib/platform-context"
import { calcDeliveryCharge, calcSecurityMoney, formatTk } from "@/lib/pricing"
import type { DeliveryType } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FormState {
  pickupLocationId: string
  recipientName: string
  recipientPhone: string
  deliveryAddress: string
  deliveryCity: string
  parcelWeightKg: string
  deliveryType: DeliveryType
  productCost: string
}

export default function NewOrderPage() {
  const router = useRouter()
  const {
    currentMerchant,
    pickupLocations,
    securityConfig,
    createOrder,
  } = usePlatform()

  const myLocations = useMemo(
    () =>
      currentMerchant
        ? pickupLocations.filter((p) => p.merchantId === currentMerchant.id)
        : [],
    [pickupLocations, currentMerchant],
  )

  const [form, setForm] = useState<FormState>({
    pickupLocationId: "",
    recipientName: "",
    recipientPhone: "",
    deliveryAddress: "",
    deliveryCity: "",
    parcelWeightKg: "1",
    deliveryType: "STANDARD",
    productCost: "",
  })
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const weight = Number(form.parcelWeightKg) || 0
  const productCost = Number(form.productCost) || 0

  // Live pricing — mirrors the exact logic createOrder will apply.
  const breakdown = currentMerchant
    ? calcDeliveryCharge(currentMerchant, weight)
    : null
  const securityMoney = securityConfig
    ? calcSecurityMoney(securityConfig, productCost)
    : 0
  const exceedsMax = breakdown?.exceedsMax ?? false
  const deliveryCharge = breakdown && !exceedsMax ? breakdown.total : 0
  const totalCollectible = exceedsMax
    ? 0
    : productCost + deliveryCharge + securityMoney

  if (!currentMerchant) return null

  const notActive = currentMerchant.status !== "ACTIVE"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.pickupLocationId) {
      toast.error("Select a pickup location.")
      return
    }
    if (weight <= 0) {
      toast.error("Parcel weight must be greater than 0.")
      return
    }
    if (exceedsMax) {
      toast.error(
        `Parcel weight exceeds the ${currentMerchant!.maxWeightKg} KG limit.`,
      )
      return
    }
    setSubmitting(true)
    const result = createOrder({
      pickupLocationId: form.pickupLocationId,
      recipientName: form.recipientName.trim(),
      recipientPhone: form.recipientPhone.trim(),
      deliveryAddress: form.deliveryAddress.trim(),
      deliveryCity: form.deliveryCity.trim(),
      parcelWeightKg: weight,
      deliveryType: form.deliveryType,
      productCost,
    })
    if (result.ok && result.order) {
      toast.success(`Order ${result.order.code} created.`)
      router.push("/merchant")
    } else {
      toast.error(result.error ?? "Unable to create order.")
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Create order"
        description="Fill in the parcel details. Charges update live as you type."
      >
        <Button
          variant="outline"
          render={<Link href="/merchant" />}
          nativeButton={false}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </PageHeader>

      {notActive ? (
        <Card className="border-chart-3/30 bg-chart-3/5">
          <CardContent className="flex items-start gap-3 p-5">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-chart-3" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your account is{" "}
              <span className="font-medium text-foreground">
                {currentMerchant.status}
              </span>
              . Orders can only be created once your account is active.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Parcel details</CardTitle>
              <CardDescription>
                Maximum parcel weight is {currentMerchant.maxWeightKg} KG.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                id="order-form"
                onSubmit={handleSubmit}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pickup">Pickup location</Label>
                  <Select
                    value={form.pickupLocationId}
                    onValueChange={(v) => update("pickupLocationId", v ?? "")}
                  >
                    <SelectTrigger id="pickup">
                      <SelectValue placeholder="Select a pickup location" />
                    </SelectTrigger>
                    <SelectContent>
                      {myLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="recipientName">Recipient name</Label>
                    <Input
                      id="recipientName"
                      value={form.recipientName}
                      onChange={(e) => update("recipientName", e.target.value)}
                      placeholder="Sumaiya Islam"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="recipientPhone">Recipient phone</Label>
                    <Input
                      id="recipientPhone"
                      type="tel"
                      value={form.recipientPhone}
                      onChange={(e) => update("recipientPhone", e.target.value)}
                      placeholder="+8801811112233"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="deliveryAddress">Delivery address</Label>
                  <Input
                    id="deliveryAddress"
                    value={form.deliveryAddress}
                    onChange={(e) => update("deliveryAddress", e.target.value)}
                    placeholder="Flat B2, Road 11, Banani"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="deliveryCity">Delivery city</Label>
                    <Input
                      id="deliveryCity"
                      value={form.deliveryCity}
                      onChange={(e) => update("deliveryCity", e.target.value)}
                      placeholder="Dhaka"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="deliveryType">Delivery type</Label>
                    <Select
                      value={form.deliveryType}
                      onValueChange={(v) =>
                        update("deliveryType", v as DeliveryType)
                      }
                    >
                      <SelectTrigger id="deliveryType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STANDARD">Standard</SelectItem>
                        <SelectItem value="FRAGILE">Fragile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="weight">
                      Parcel weight (KG) — max {currentMerchant.maxWeightKg}
                    </Label>
                    <Input
                      id="weight"
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.parcelWeightKg}
                      onChange={(e) => update("parcelWeightKg", e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="productCost">Product cost (TK)</Label>
                    <Input
                      id="productCost"
                      type="number"
                      min="0"
                      step="1"
                      value={form.productCost}
                      onChange={(e) => update("productCost", e.target.value)}
                      placeholder="5000"
                      required
                    />
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Live calculator */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="size-5 text-primary" />
                  Charge breakdown
                </CardTitle>
                <CardDescription>
                  Base {formatTk(currentMerchant.baseRate)} ·{" "}
                  {formatTk(currentMerchant.extraRatePerKg)}/Kg over{" "}
                  {currentMerchant.freeWeightKg} KG
                </CardDescription>
              </CardHeader>
              <CardContent>
                {exceedsMax ? (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-3 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>
                      Parcel exceeds the {currentMerchant.maxWeightKg} KG maximum
                      — this order will be rejected.
                    </span>
                  </div>
                ) : (
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Product cost</dt>
                      <dd className="tabular-nums">{formatTk(productCost)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        Delivery charge
                        {breakdown && breakdown.billableExtraKg > 0
                          ? ` (+${breakdown.billableExtraKg} KG)`
                          : ""}
                      </dt>
                      <dd className="tabular-nums">{formatTk(deliveryCharge)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Security money</dt>
                      <dd className="tabular-nums">{formatTk(securityMoney)}</dd>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between text-base font-semibold">
                      <dt>Total collectible</dt>
                      <dd className="tabular-nums text-primary">
                        {formatTk(totalCollectible)}
                      </dd>
                    </div>
                  </dl>
                )}

                <Button
                  type="submit"
                  form="order-form"
                  className="mt-5 w-full"
                  disabled={submitting || exceedsMax}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating
                    </>
                  ) : (
                    <>
                      <PackageCheck className="size-4" />
                      Confirm order
                    </>
                  )}
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Cash collected on delivery from the recipient.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
