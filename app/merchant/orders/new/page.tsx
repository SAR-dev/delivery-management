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
  Plus,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { usePlatform } from "@/lib/platform-context"
import { calcDeliveryCharge, calcSecurityMoney, formatTk } from "@/lib/pricing"
import type { CreateOrderInput, DeliveryType } from "@/lib/types"
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

interface ParcelState {
  id: string
  recipientName: string
  recipientPhone: string
  deliveryAddress: string
  deliveryCity: string
  parcelWeightKg: string
  deliveryType: DeliveryType
  productCost: string
}

function emptyParcel(): ParcelState {
  return {
    id: crypto.randomUUID(),
    recipientName: "",
    recipientPhone: "",
    deliveryAddress: "",
    deliveryCity: "",
    parcelWeightKg: "1",
    deliveryType: "STANDARD",
    productCost: "",
  }
}

export default function NewOrderPage() {
  const router = useRouter()
  const { currentMerchant, pickupLocations, securityConfig, createOrders } =
    usePlatform()

  const myLocations = useMemo(
    () =>
      currentMerchant
        ? pickupLocations.filter((p) => p.merchantId === currentMerchant.id)
        : [],
    [pickupLocations, currentMerchant],
  )

  const [pickupLocationId, setPickupLocationId] = useState("")
  const [parcels, setParcels] = useState<ParcelState[]>([emptyParcel()])
  const [submitting, setSubmitting] = useState(false)

  function updateParcel<K extends keyof ParcelState>(
    id: string,
    key: K,
    value: ParcelState[K],
  ) {
    setParcels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [key]: value } : p)),
    )
  }

  function addParcel() {
    setParcels((prev) => [...prev, emptyParcel()])
  }

  function removeParcel(id: string) {
    setParcels((prev) =>
      prev.length === 1 ? prev : prev.filter((p) => p.id !== id),
    )
  }

  // Per-parcel + aggregate pricing — mirrors the exact server logic.
  const rows = useMemo(() => {
    return parcels.map((p) => {
      const weight = Number(p.parcelWeightKg) || 0
      const productCost = Number(p.productCost) || 0
      const breakdown = currentMerchant
        ? calcDeliveryCharge(currentMerchant, weight)
        : null
      const exceedsMax = breakdown?.exceedsMax ?? false
      const deliveryCharge = breakdown && !exceedsMax ? breakdown.total : 0
      const securityMoney = securityConfig
        ? calcSecurityMoney(securityConfig, productCost)
        : 0
      const totalCollectible = exceedsMax
        ? 0
        : productCost + deliveryCharge + securityMoney
      return {
        parcel: p,
        weight,
        productCost,
        billableExtraKg: breakdown?.billableExtraKg ?? 0,
        exceedsMax,
        deliveryCharge,
        securityMoney,
        totalCollectible,
      }
    })
  }, [parcels, currentMerchant, securityConfig])

  const anyExceeds = rows.some((r) => r.exceedsMax)
  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          productCost: acc.productCost + r.productCost,
          deliveryCharge: acc.deliveryCharge + r.deliveryCharge,
          securityMoney: acc.securityMoney + r.securityMoney,
          totalCollectible: acc.totalCollectible + r.totalCollectible,
        }),
        { productCost: 0, deliveryCharge: 0, securityMoney: 0, totalCollectible: 0 },
      ),
    [rows],
  )

  if (!currentMerchant) return null

  const notActive = currentMerchant.status !== "ACTIVE"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pickupLocationId) {
      toast.error("Select a pickup location.")
      return
    }
    if (rows.some((r) => r.weight <= 0)) {
      toast.error("Every parcel weight must be greater than 0.")
      return
    }
    if (anyExceeds) {
      toast.error(
        `One or more parcels exceed the ${currentMerchant!.maxWeightKg} KG limit.`,
      )
      return
    }

    const payload: CreateOrderInput[] = parcels.map((p) => ({
      pickupLocationId,
      recipientName: p.recipientName.trim(),
      recipientPhone: p.recipientPhone.trim(),
      deliveryAddress: p.deliveryAddress.trim(),
      deliveryCity: p.deliveryCity.trim(),
      parcelWeightKg: Number(p.parcelWeightKg) || 0,
      deliveryType: p.deliveryType,
      productCost: Number(p.productCost) || 0,
    }))

    setSubmitting(true)
    const result = await createOrders(payload)
    if (result.ok && result.orders) {
      toast.success(
        `${result.orders.length} order${result.orders.length > 1 ? "s" : ""} created.`,
      )
      router.push("/merchant")
    } else {
      toast.error(result.error ?? "Unable to create orders.")
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Create orders"
        description="Add one or more parcels. Charges update live as you type."
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
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Pickup location</CardTitle>
                <CardDescription>
                  All parcels in this batch are collected from this location.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pickup">Location</Label>
                  <Select
                    value={pickupLocationId}
                    onValueChange={(v) => setPickupLocationId(v ?? "")}
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
              </CardContent>
            </Card>

            <form
              id="order-form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-6"
            >
              {rows.map((row, index) => {
                const p = row.parcel
                return (
                  <Card key={p.id}>
                    <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                      <div>
                        <CardTitle className="text-base">
                          Parcel {index + 1}
                        </CardTitle>
                        <CardDescription>
                          Max weight {currentMerchant.maxWeightKg} KG ·{" "}
                          {row.exceedsMax ? (
                            <span className="text-destructive">
                              exceeds limit
                            </span>
                          ) : (
                            <span>
                              collectible {formatTk(row.totalCollectible)}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      {parcels.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeParcel(p.id)}
                          aria-label={`Remove parcel ${index + 1}`}
                        >
                          <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor={`name-${p.id}`}>Recipient name</Label>
                            <Input
                              id={`name-${p.id}`}
                              value={p.recipientName}
                              onChange={(e) =>
                                updateParcel(p.id, "recipientName", e.target.value)
                              }
                              placeholder="Sumaiya Islam"
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor={`phone-${p.id}`}>
                              Recipient phone
                            </Label>
                            <Input
                              id={`phone-${p.id}`}
                              type="tel"
                              value={p.recipientPhone}
                              onChange={(e) =>
                                updateParcel(p.id, "recipientPhone", e.target.value)
                              }
                              placeholder="+8801811112233"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label htmlFor={`address-${p.id}`}>
                            Delivery address
                          </Label>
                          <Input
                            id={`address-${p.id}`}
                            value={p.deliveryAddress}
                            onChange={(e) =>
                              updateParcel(p.id, "deliveryAddress", e.target.value)
                            }
                            placeholder="Flat B2, Road 11, Banani"
                            required
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor={`city-${p.id}`}>Delivery city</Label>
                            <Input
                              id={`city-${p.id}`}
                              value={p.deliveryCity}
                              onChange={(e) =>
                                updateParcel(p.id, "deliveryCity", e.target.value)
                              }
                              placeholder="Dhaka"
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor={`type-${p.id}`}>Delivery type</Label>
                            <Select
                              value={p.deliveryType}
                              onValueChange={(v) =>
                                updateParcel(p.id, "deliveryType", v as DeliveryType)
                              }
                            >
                              <SelectTrigger id={`type-${p.id}`}>
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
                            <Label htmlFor={`weight-${p.id}`}>
                              Parcel weight (KG)
                            </Label>
                            <Input
                              id={`weight-${p.id}`}
                              type="number"
                              min="0"
                              step="0.1"
                              value={p.parcelWeightKg}
                              onChange={(e) =>
                                updateParcel(p.id, "parcelWeightKg", e.target.value)
                              }
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor={`cost-${p.id}`}>Product cost (TK)</Label>
                            <Input
                              id={`cost-${p.id}`}
                              type="number"
                              min="0"
                              step="1"
                              value={p.productCost}
                              onChange={(e) =>
                                updateParcel(p.id, "productCost", e.target.value)
                              }
                              placeholder="5000"
                              required
                            />
                          </div>
                        </div>

                        {row.exceedsMax && (
                          <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                            <span>
                              Parcel exceeds the {currentMerchant.maxWeightKg} KG
                              maximum and will be rejected.
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </form>

            <Button
              type="button"
              variant="outline"
              onClick={addParcel}
              className="self-start"
            >
              <Plus className="size-4" />
              Add another parcel
            </Button>
          </div>

          {/* Live calculator */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="size-5 text-primary" />
                  Batch summary
                </CardTitle>
                <CardDescription>
                  {parcels.length} parcel{parcels.length > 1 ? "s" : ""} · Base{" "}
                  {formatTk(currentMerchant.baseRate)} ·{" "}
                  {formatTk(currentMerchant.extraRatePerKg)}/Kg over{" "}
                  {currentMerchant.freeWeightKg} KG
                </CardDescription>
              </CardHeader>
              <CardContent>
                {anyExceeds && (
                  <div className="mb-4 flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-3 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>
                      Some parcels exceed the {currentMerchant.maxWeightKg} KG
                      maximum. Fix them before submitting.
                    </span>
                  </div>
                )}
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Product cost</dt>
                    <dd className="tabular-nums">
                      {formatTk(totals.productCost)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Delivery charges</dt>
                    <dd className="tabular-nums">
                      {formatTk(totals.deliveryCharge)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Security money</dt>
                    <dd className="tabular-nums">
                      {formatTk(totals.securityMoney)}
                    </dd>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between text-base font-semibold">
                    <dt>Total collectible</dt>
                    <dd className="tabular-nums text-primary">
                      {formatTk(totals.totalCollectible)}
                    </dd>
                  </div>
                </dl>

                <Button
                  type="submit"
                  form="order-form"
                  className="mt-5 w-full"
                  disabled={submitting || anyExceeds}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating
                    </>
                  ) : (
                    <>
                      <PackageCheck className="size-4" />
                      Confirm {parcels.length} order
                      {parcels.length > 1 ? "s" : ""}
                    </>
                  )}
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Cash collected on delivery from each recipient.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
