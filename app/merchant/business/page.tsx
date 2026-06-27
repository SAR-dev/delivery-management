"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Building2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Tag,
  User,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/features/account/hooks/use-auth"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { useDivisions } from "@/features/divisions/hooks/use-divisions"
import { formatTk } from "@/lib/pricing"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { MerchantStatusBadge } from "@/features/merchants/components/merchant-status-badge"
import { PickupLocationsManager } from "@/features/pickup-locations/components/pickup-locations-manager"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function PricingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  )
}

export default function MerchantBusinessPage() {
  const { isReady } = useAuth()
  const {
    currentMerchant,
    updateMerchantProfile,
    isLoading: merchantsLoading,
  } = useMerchants()
  const { divisions, isLoading: divisionsLoading } = useDivisions()
  const isDataReady = !merchantsLoading && !divisionsLoading

  const [businessName, setBusinessName] = useState(
    () => currentMerchant?.businessName ?? "",
  )
  const [email, setEmail] = useState(() => currentMerchant?.email ?? "")
  const [phone, setPhone] = useState(() => currentMerchant?.phone ?? "")
  const [address, setAddress] = useState(() => currentMerchant?.address ?? "")
  const [divisionId, setDivisionId] = useState(
    () => currentMerchant?.divisionId ?? "",
  )
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!currentMerchant) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBusinessName(currentMerchant.businessName)
    setEmail(currentMerchant.email)
    setPhone(currentMerchant.phone)
    setAddress(currentMerchant.address)
    setDivisionId(currentMerchant.divisionId ?? "")
  }, [currentMerchant])

  // Active divisions, plus the merchant's current one even if since disabled.
  const divisionOptions = useMemo(
    () => divisions.filter((d) => d.isActive || d.id === divisionId),
    [divisions, divisionId],
  )

  if (!isReady || !isDataReady) return null

  if (!currentMerchant) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title={pageContent.merchant.business.title}
          description={pageContent.merchant.business.missingDescription}
        />
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            We couldn&apos;t find a business linked to your account.
          </CardContent>
        </Card>
      </div>
    )
  }

  const trimmed = {
    businessName: businessName.trim(),
    email: email.trim(),
    phone: phone.trim(),
    address: address.trim(),
    divisionId,
  }

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.email)
  const requiredFilled =
    trimmed.businessName.length > 0 &&
    trimmed.phone.length > 0 &&
    trimmed.address.length > 0 &&
    trimmed.divisionId.length > 0
  const unchanged =
    trimmed.businessName === currentMerchant.businessName &&
    trimmed.email === currentMerchant.email &&
    trimmed.phone === currentMerchant.phone &&
    trimmed.address === currentMerchant.address &&
    trimmed.divisionId === (currentMerchant.divisionId ?? "")
  const formValid = requiredFilled && emailValid && !unchanged

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formValid || !currentMerchant) return
    setSaving(true)
    try {
      const result = await updateMerchantProfile(currentMerchant.id, trimmed)
      if (result.ok) {
        toast.success("Your business details have been updated.")
      } else {
        toast.error(result.error ?? "Could not update your business details.")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={pageContent.merchant.business.title}
        description={pageContent.merchant.business.description}
      >
        <MerchantStatusBadge status={currentMerchant.status} />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Editable business contact details */}
        <Card className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="contents">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-4" />
                Business details
              </CardTitle>
              <CardDescription>
                These details appear on pickups, labels, and merchant
                communications.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="business-name">Business name</Label>
                <Input
                  id="business-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your business name"
                  aria-invalid={trimmed.businessName.length === 0}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="business-email">Email</Label>
                <Input
                  id="business-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  autoComplete="email"
                  aria-invalid={email.length > 0 && !emailValid}
                />
                {email.length > 0 && !emailValid ? (
                  <p className="text-destructive text-xs">
                    Enter a valid email address.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="business-phone">Phone</Label>
                <Input
                  id="business-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  autoComplete="tel"
                  aria-invalid={trimmed.phone.length === 0}
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="business-address">Address</Label>
                <Textarea
                  id="business-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, area, city"
                  rows={3}
                  aria-invalid={trimmed.address.length === 0}
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="business-division">Division</Label>
                <Select
                  value={divisionId}
                  onValueChange={(v) => setDivisionId(v ?? "")}
                >
                  <SelectTrigger
                    id="business-division"
                    className="w-full"
                    aria-invalid={divisionId.length === 0}
                  >
                    <SelectValue placeholder="Select a division">
                      {divisionOptions.find((d) => d.id === divisionId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {divisionOptions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={saving || !formValid}>
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Read-only owner + pricing summary */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-4" />
                Account owner
              </CardTitle>
              <CardDescription>
                Set at registration and managed by the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="text-muted-foreground size-4 shrink-0" />
                <span className="font-medium">{currentMerchant.ownerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="text-muted-foreground size-4 shrink-0" />
                <span className="truncate">{currentMerchant.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="text-muted-foreground size-4 shrink-0" />
                <span>{currentMerchant.phone}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <span className="leading-snug">{currentMerchant.address}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="size-4" />
                Delivery pricing
              </CardTitle>
              <CardDescription>
                Set by the platform. Contact an admin to make changes.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-border divide-y py-0">
              <PricingRow
                label="Base rate"
                value={formatTk(currentMerchant.baseRate)}
              />
              <PricingRow
                label="Extra per kg"
                value={formatTk(currentMerchant.extraRatePerKg)}
              />
              <PricingRow
                label="Free weight"
                value={`${currentMerchant.freeWeightKg} KG`}
              />
              <PricingRow
                label="Max weight"
                value={`${currentMerchant.maxWeightKg} KG`}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <PickupLocationsManager
        merchantId={currentMerchant.id}
        merchantDivisionId={currentMerchant.divisionId ?? null}
      />
    </div>
  )
}
