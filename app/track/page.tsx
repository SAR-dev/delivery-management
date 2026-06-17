"use client"

import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Package, Search, MapPin, Store, PackageX } from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import type { Order } from "@/lib/types"
import { OrderStatusBadge } from "@/components/order-status-badge"
import { TrackingTimeline } from "@/components/tracking-timeline"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

// Mask a phone number so only the last 3 digits are visible on a public page.
function maskPhone(phone: string) {
  const digits = phone.replace(/\s+/g, "")
  if (digits.length <= 3) return digits
  return `••• ••• ${digits.slice(-3)}`
}

// Reduce an address to its general area (city / last segment) for privacy.
function generalArea(order: Order) {
  const parts = order.deliveryAddress.split(",").map((p) => p.trim()).filter(Boolean)
  const area = parts.length > 1 ? parts[parts.length - 2] : parts[0]
  return [area, order.deliveryCity].filter(Boolean).join(", ")
}

export default function TrackPage() {
  return (
    <Suspense fallback={null}>
      <TrackContent />
    </Suspense>
  )
}

function TrackContent() {
  const { orders, merchants } = usePlatform()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialCode = (searchParams.get("code") ?? "").trim()

  const [query, setQuery] = useState(initialCode)
  const [searched, setSearched] = useState(Boolean(initialCode))

  const submittedCode = searched ? initialCode || query : ""

  const order = useMemo(() => {
    const normalized = submittedCode.trim().toUpperCase()
    if (!normalized) return null
    return (
      orders.find(
        (o) =>
          o.code.toUpperCase() === normalized ||
          o.code.toUpperCase() === `PF-${normalized}` ||
          o.id.toUpperCase() === normalized,
      ) ?? null
    )
  }, [orders])

  const merchant = useMemo(
    () => (order ? merchants.find((m) => m.id === order.merchantId) ?? null : null),
    [merchants, order],
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    setSearched(true)
    // Keep the URL shareable.
    router.replace(trimmed ? `/track?code=${encodeURIComponent(trimmed)}` : "/track")
  }

  const notFound = searched && submittedCode.trim() !== "" && !order

  return (
    <main className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/track" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
              <Package className="size-4" />
            </span>
            <span className="text-base font-semibold">ParcelFlow</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">Track your parcel</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Hero + search */}
        <div className="text-center">
          <h1 className="text-balance text-2xl font-semibold sm:text-3xl">
            Where is my order?
          </h1>
          <p className="mt-2 text-pretty text-muted-foreground">
            Enter your tracking code to see the latest delivery status. No account needed.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mx-auto mt-6 flex max-w-md gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. PF-100231"
              className="pl-9"
              aria-label="Tracking code"
              autoFocus
            />
          </div>
          <Button type="submit">Track</Button>
        </form>

        {/* Results */}
        <div className="mx-auto mt-8 max-w-md">
          {notFound && (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <PackageX className="size-6" />
                </span>
                <div>
                  <p className="font-medium">No parcel found</p>
                  <p className="text-sm text-muted-foreground">
                    We couldn&apos;t find a parcel for{" "}
                    <span className="font-mono">{submittedCode}</span>. Double-check the
                    tracking code and try again.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {order && (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {/* Summary */}
                <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Tracking code
                    </p>
                    <p className="font-mono text-lg font-semibold">{order.code}</p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                {/* Meta */}
                <dl className="grid grid-cols-1 gap-4 border-b border-border p-5 sm:grid-cols-2">
                  {merchant && (
                    <div className="flex items-start gap-2">
                      <Store className="mt-0.5 size-4 text-muted-foreground" />
                      <div>
                        <dt className="text-xs text-muted-foreground">Sender</dt>
                        <dd className="text-sm font-medium">{merchant.businessName}</dd>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Delivering to</dt>
                      <dd className="text-sm font-medium">{generalArea(order)}</dd>
                      <dd className="text-xs text-muted-foreground">
                        {order.recipientName.split(" ")[0]} · {maskPhone(order.recipientPhone)}
                      </dd>
                    </div>
                  </div>
                </dl>

                {/* Timeline */}
                <div className="p-5">
                  <p className="mb-4 text-sm font-medium">Delivery progress</p>
                  <TrackingTimeline order={order} />
                </div>
              </CardContent>
            </Card>
          )}

          {!order && !notFound && (
            <p className="text-center text-sm text-muted-foreground">
              Your tracking code looks like{" "}
              <span className="font-mono text-foreground">PF-100231</span>.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
