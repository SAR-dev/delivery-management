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
  MapPin,
  ImageIcon,
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
  deliveryDivisionId: string
  deliveryMapLink: string
  deliveryImageLinks: string[]
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
    deliveryDivisionId: "",
    deliveryMapLink: "",
    deliveryImageLinks: [""],
    parcelWeightKg: "1",
    deliveryType: "STANDARD",
    productCost: "",
  }
}

export default function NewOrderPage() {
  const router = useRouter()
  const {
    currentMerchant,
    pickupLocations,
    divisions,
    securityConfig,
    createOrders,
  } = usePlatform()

  // Only active divisions can be chosen for a new order's receiver.
  const activeDivisions = useMemo(
    () => divisions.filter((d) => d.isActive),
    [divisions],
  )

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

  function updateImageLink(parcelId: string, index: number, value: string) {
    setParcels((prev) =>
      prev.map((p) =>
        p.id === parcelId
          ? {
              ...p,
              deliveryImageLinks: p.deliveryImageLinks.map((link, i) =>
                i === index ? value : link,
              ),
            }
          : p,
      ),
    )
  }

  function addImageLink(parcelId: string) {
    setParcels((prev) =>
      prev.map((p) =>
        p.id === parcelId
          ? { ...p, deliveryImageLinks: [...p.deliveryImageLinks, ""] }
          : p,
      ),
    )
  }

  function removeImageLink(parcelId: string, index: number) {
    setParcels((prev) =>
      prev.map((p) =>
        p.id === parcelId
          ? {
              ...p,
              deliveryImageLinks:
                p.deliveryImageLinks.length === 1
                  ? [""]
                  : p.deliveryImageLinks.filter((_, i) => i !== index),
            }
          : p,
      ),
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
        {
          productCost: 0,
          deliveryCharge: 0,
          securityMoney: 0,
          totalCollectible: 0,
        },
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
    if (parcels.some((p) => !p.deliveryDivisionId)) {
      toast.error("Select a delivery division for every parcel.")
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
      deliveryDivisionId: p.deliveryDivisionId,
      deliveryMapLink: p.deliveryMapLink.trim() || null,
      deliveryImageLinks: p.deliveryImageLinks
        .map((link) => link.trim())
        .filter((link) => link.length > 0),
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
        title="New delivery order"
        description="Add one or more parcels and watch delivery charges update live as you enter details."
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
            <AlertTriangle className="text-chart-3 mt-0.5 size-5 shrink-0" />
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your account is{" "}
              <span className="text-foreground font-medium">
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
                    <SelectTrigger id="pickup" className="min-w-64">
                      <SelectValue placeholder="Select a pickup location">
                        {(value) => {
                          const loc = myLocations.find((l) => l.id === value)
                          return loc ? loc.label : "Select a pickup location"
                        }}
                      </SelectValue>
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
                          <Trash2 className="text-muted-foreground size-4" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor={`name-${p.id}`}>
                              Recipient name
                            </Label>
                            <Input
                              id={`name-${p.id}`}
                              value={p.recipientName}
                              onChange={(e) =>
                                updateParcel(
                                  p.id,
                                  "recipientName",
                                  e.target.value,
                                )
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
                                updateParcel(
                                  p.id,
                                  "recipientPhone",
                                  e.target.value,
                                )
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
                              updateParcel(
                                p.id,
                                "deliveryAddress",
                                e.target.value,
                              )
                            }
                            placeholder="Flat B2, Road 11, Banani"
                            required
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor={`city-${p.id}`}>
                              Delivery city
                            </Label>
                            <Input
                              id={`city-${p.id}`}
                              value={p.deliveryCity}
                              onChange={(e) =>
                                updateParcel(
                                  p.id,
                                  "deliveryCity",
                                  e.target.value,
                                )
                              }
                              placeholder="Dhaka"
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor={`division-${p.id}`}>
                              Delivery division
                            </Label>
                            <Select
                              value={p.deliveryDivisionId}
                              onValueChange={(v) =>
                                updateParcel(
                                  p.id,
                                  "deliveryDivisionId",
                                  v ?? "",
                                )
                              }
                            >
                              <SelectTrigger
                                id={`division-${p.id}`}
                                className="w-full"
                                aria-invalid={
                                  p.deliveryDivisionId.length === 0
                                }
                              >
                                <SelectValue placeholder="Select a division">
                                  {activeDivisions.find((d) => d.id === p.deliveryDivisionId)?.name}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {activeDivisions.map((d) => (
                                  <SelectItem key={d.id} value={d.id}>
                                    {d.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor={`type-${p.id}`}>
                              Delivery type
                            </Label>
                            <Select
                              value={p.deliveryType}
                              onValueChange={(v) =>
                                updateParcel(
                                  p.id,
                                  "deliveryType",
                                  v as DeliveryType,
                                )
                              }
                            >
                              <SelectTrigger id={`type-${p.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="STANDARD">
                                  Standard
                                </SelectItem>
                                <SelectItem value="FRAGILE">Fragile</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label htmlFor={`map-${p.id}`}>
                            <span className="flex items-center gap-1.5">
                              <MapPin className="text-muted-foreground size-3.5" />
                              Map link
                              <span className="text-muted-foreground font-normal">
                                (optional)
                              </span>
                            </span>
                          </Label>
                          <Input
                            id={`map-${p.id}`}
                            type="url"
                            value={p.deliveryMapLink}
                            onChange={(e) =>
                              updateParcel(
                                p.id,
                                "deliveryMapLink",
                                e.target.value,
                              )
                            }
                            placeholder="https://maps.google.com/?q=..."
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label>
                            <span className="flex items-center gap-1.5">
                              <ImageIcon className="text-muted-foreground size-3.5" />
                              Image links
                              <span className="text-muted-foreground font-normal">
                                (optional)
                              </span>
                            </span>
                          </Label>
                          <div className="flex flex-col gap-2">
                            {p.deliveryImageLinks.map((link, linkIndex) => (
                              <div
                                key={linkIndex}
                                className="flex items-center gap-2"
                              >
                                <Input
                                  type="url"
                                  value={link}
                                  onChange={(e) =>
                                    updateImageLink(
                                      p.id,
                                      linkIndex,
                                      e.target.value,
                                    )
                                  }
                                  placeholder="https://example.com/location-photo.jpg"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    removeImageLink(p.id, linkIndex)
                                  }
                                  aria-label={`Remove image link ${linkIndex + 1}`}
                                  disabled={
                                    p.deliveryImageLinks.length === 1 &&
                                    link.trim() === ""
                                  }
                                >
                                  <Trash2 className="text-muted-foreground size-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="self-start"
                            onClick={() => addImageLink(p.id)}
                          >
                            <Plus className="size-3.5" />
                            Add image link
                          </Button>
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
                                updateParcel(
                                  p.id,
                                  "parcelWeightKg",
                                  e.target.value,
                                )
                              }
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor={`cost-${p.id}`}>
                              Product cost (TK)
                            </Label>
                            <Input
                              id={`cost-${p.id}`}
                              type="number"
                              min="0"
                              step="1"
                              value={p.productCost}
                              onChange={(e) =>
                                updateParcel(
                                  p.id,
                                  "productCost",
                                  e.target.value,
                                )
                              }
                              placeholder="5000"
                              required
                            />
                          </div>
                        </div>

                        {row.exceedsMax && (
                          <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-md px-3 py-2 text-sm">
                            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                            <span>
                              Parcel exceeds the {currentMerchant.maxWeightKg}{" "}
                              KG maximum and will be rejected.
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
                  <Calculator className="text-primary size-5" />
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
                  <div className="bg-destructive/10 text-destructive mb-4 flex items-start gap-2 rounded-md px-3 py-3 text-sm">
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
                    <dd className="text-primary tabular-nums">
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
                <p className="text-muted-foreground mt-3 text-center text-xs">
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
