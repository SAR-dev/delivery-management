"use client"

import { Bike, CheckCircle2 } from "lucide-react"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { useRiders } from "@/features/riders/hooks/use-riders"
import { usePickupLocations } from "@/features/pickup-locations/hooks/use-pickup-locations"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import type { DataTableColumn } from "@/components/data-table"
import { OrderStatusBadge } from "./order-status-badge"
import { AddressModal } from "./address-modal"
import { OrderDetailsLink } from "./order-details-link"
import { PickupLocationModal } from "@/features/pickup-locations/components/pickup-location-modal"

// ---------------------------------------------------------------------------
// Column factory functions — each owns one visual design
// ---------------------------------------------------------------------------

/**
 * Order code column with an optional subtitle line.
 *
 * - "merchant" — shows the merchant name below the code (pass merchantName lookup)
 * - "none" (default) — code only, no subtitle
 *
 * When `link` is true (default) the code renders as an OrderDetailsLink row
 * beneath the code; when false it renders the code as plain text only.
 */
export interface OrderCodeColumnOptions {
  subtitle?: "merchant" | "none"
  /** Lookup used when subtitle === "merchant" */
  merchantName?: (id: string) => string
  /**
   * When true (default) an OrderDetailsLink is shown beneath the code.
   * Dashboard passes false because it uses a different detail route.
   */
  showDetailsLink?: boolean
}

export function orderCodeColumn(
  options: OrderCodeColumnOptions = {},
): DataTableColumn<Order> {
  const { subtitle = "none", merchantName, showDetailsLink = true } = options

  return {
    id: "order",
    header: "Order",
    sortable: true,
    sortValue: (o) => o.code,
    cell: (o) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-xs font-medium">{o.code}</span>
        {subtitle === "merchant" && merchantName && (
          <span className="font-medium">{merchantName(o.merchantId)}</span>
        )}
        {showDetailsLink && <OrderDetailsLink orderId={o.id} />}
      </div>
    ),
  }
}

/** Merchant business name. */
export function merchantColumn(
  merchantName: (id: string) => string,
): DataTableColumn<Order> {
  return {
    id: "merchant",
    header: "Merchant",
    cell: (o) => <span className="text-sm">{merchantName(o.merchantId)}</span>,
  }
}

/** Recipient name + phone. */
export function receiverColumn(): DataTableColumn<Order> {
  return {
    id: "receiver",
    header: "Receiver",
    cell: (o) => (
      <div className="flex flex-col">
        <span className="text-sm">{o.recipientName}</span>
        <span className="text-muted-foreground text-xs">
          {o.recipientPhone}
        </span>
      </div>
    ),
  }
}

/**
 * Rider column — pickup or delivery variant.
 *
 * @param kind       Which rider field to display.
 * @param riderName  Lookup: riderId → display name (or "—").
 * @param header     Override the column header (defaults to "Pickup Rider" / "Delivery Rider").
 */
export function riderColumn(
  kind: "pickup" | "delivery",
  riderName: (id?: string | null) => string,
  header?: string,
): DataTableColumn<Order> {
  const riderId = kind === "pickup" ? "pickupRiderId" : "deliveryRiderId"
  const defaultHeader = kind === "pickup" ? "Pickup Rider" : "Delivery Rider"

  return {
    id: kind === "pickup" ? "pickupRider" : "deliveryRider",
    header: header ?? defaultHeader,
    cell: (o) => {
      const name = riderName(o[riderId])
      return name !== "—" ? (
        <span className="flex items-center gap-1.5 text-sm">
          <Bike className="text-muted-foreground size-4" />
          {name}
        </span>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      )
    },
  }
}

/** Parcel weight + delivery type. */
export function parcelColumn(): DataTableColumn<Order> {
  return {
    id: "parcel",
    header: "Parcel",
    cell: (o) => (
      <span className="text-muted-foreground text-sm">
        {o.parcelWeightKg} KG · {o.deliveryType}
      </span>
    ),
  }
}

/**
 * Warehouse name (and optional city).
 *
 * @param warehouseName  Lookup: warehouseId → display string.
 */
export function warehouseColumn(
  warehouseName: (id?: string | null) => string,
): DataTableColumn<Order> {
  return {
    id: "warehouse",
    header: "Warehouse",
    cell: (o) => {
      const name = warehouseName(o.warehouseId)
      return name === "—" ? (
        <span className="text-muted-foreground text-sm">—</span>
      ) : (
        <span className="text-sm">{name}</span>
      )
    },
  }
}

/**
 * Delivery address — always wrapped in AddressModal.
 * Header is always "Delivery Address".
 */
export function deliveryAddressColumn(): DataTableColumn<Order> {
  return {
    id: "city",
    header: "Delivery Address",
    sortable: true,
    sortValue: (o) => o.deliveryCity,
    cell: (o) => (
      <AddressModal order={o}>
        <div className="flex flex-col">
          <span className="underline decoration-dotted underline-offset-4">
            {o.deliveryCity}
          </span>
          <span className="text-muted-foreground text-xs">
            {o.deliveryAddress}
          </span>
        </div>
      </AddressModal>
    ),
  }
}

/** Total collectible amount. */
export function collectibleColumn(): DataTableColumn<Order> {
  return {
    id: "collectible",
    header: "Collectible",
    align: "right",
    sortable: true,
    sortValue: (o) => o.totalCollectible,
    cell: (o) => (
      <span className="tabular-nums">{formatTk(o.totalCollectible)}</span>
    ),
  }
}

/** Merchant note (M badge) + receiver note (R badge). */
export function notesColumn(): DataTableColumn<Order> {
  return {
    id: "notes",
    header: "Notes",
    cell: (o) => (
      <div className="flex items-center gap-1.5">
        {o.merchantNote ? (
          <span
            title={o.merchantNote}
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-600 dark:bg-blue-950 dark:text-blue-400"
          >
            M
          </span>
        ) : null}
        {o.receiverNote ? (
          <span
            title={o.receiverNote}
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-[11px] font-semibold text-red-600 dark:bg-red-950 dark:text-red-400"
          >
            R
          </span>
        ) : null}
        {!o.merchantNote && !o.receiverNote ? (
          <span className="text-muted-foreground/50 text-xs">—</span>
        ) : null}
      </div>
    ),
  }
}

export interface StatusColumnOptions {
  /**
   * When true the cell renders "Settled by <name>" for orders that have
   * codSettledAt set, falling back to the standard OrderStatusBadge otherwise.
   * Used by the reconciliation page.
   */
  settledOverride?: boolean
}

/** Order status badge, with an optional "Settled by …" override. */
export function statusColumn(
  options: StatusColumnOptions = {},
): DataTableColumn<Order> {
  const { settledOverride = false } = options

  return {
    id: "status",
    header: "Status",
    sortable: true,
    sortValue: (o) =>
      settledOverride && o.codSettledAt ? "settled" : o.status,
    cell: (o) => {
      if (settledOverride && o.codSettledAt) {
        return (
          <span className="text-chart-2 flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="size-4" />
            Settled by {o.codSettledBy ?? "Admin"}
          </span>
        )
      }
      return <OrderStatusBadge status={o.status} />
    },
  }
}

// ---------------------------------------------------------------------------
// useOrderColumns — convenience hook for dashboard/orders/page.tsx
// ---------------------------------------------------------------------------

interface UseOrderColumnsOptions {
  linkOrders?: boolean
}

/**
 * Composed convenience hook used by dashboard/orders/page.tsx.
 * Calls the domain hooks itself so callers need zero setup.
 * All other pages use the factory functions directly.
 */
export function useOrderColumns({
  linkOrders = true,
}: UseOrderColumnsOptions = {}): DataTableColumn<Order>[] {
  const { merchants } = useMerchants()
  const { riders } = useRiders()
  const { pickupLocations } = usePickupLocations()
  const { warehouses } = useWarehouses()

  const merchantNameFn = (id: string) =>
    merchants.find((m) => m.id === id)?.businessName ?? "Unknown"

  const riderNameFn = (id?: string | null) =>
    id ? (riders.find((r) => r.id === id)?.name ?? "—") : "—"

  const pickupLocationFn = (id: string) =>
    pickupLocations.find((p) => p.id === id) ?? null

  const warehouseFn = (id?: string | null) =>
    id ? (warehouses.find((w) => w.id === id) ?? null) : null

  const warehouseDisplayFn = (id?: string | null) => {
    const w = warehouseFn(id)
    if (!w) return "—"
    return `${w.name} — ${w.city}`
  }

  // Merchant-scoped weight check used only on the dashboard.
  const weightColumn: DataTableColumn<Order> = {
    id: "weight",
    header: "Weight",
    align: "right",
    sortable: true,
    sortValue: (o) => o.parcelWeightKg,
    cell: (o) => {
      const merchant = merchants.find((m) => m.id === o.merchantId)
      const exceeds = merchant ? o.parcelWeightKg > merchant.maxWeightKg : false
      return (
        <span
          className={
            exceeds
              ? "text-destructive font-medium tabular-nums"
              : "tabular-nums"
          }
        >
          {o.parcelWeightKg} KG
        </span>
      )
    },
  }

  // Pickup location column used only on the dashboard.
  const pickupColumn: DataTableColumn<Order> = {
    id: "pickup",
    header: "Pickup Location",
    cell: (o) => {
      const p = pickupLocationFn(o.pickupLocationId)
      if (!p) return <span className="text-muted-foreground text-sm">—</span>
      return (
        <PickupLocationModal location={p}>
          <div className="flex flex-col">
            <span className="underline decoration-dotted underline-offset-4">
              {p.label}
            </span>
            <span className="text-muted-foreground text-xs">{p.address}</span>
          </div>
        </PickupLocationModal>
      )
    },
  }

  // Dashboard order cell: links to /dashboard/orders/<id> when linkOrders=true.
  const orderCell: DataTableColumn<Order> = {
    id: "order",
    header: "Order",
    sortable: true,
    sortValue: (o) => o.code,
    cell: (o) => (
      <div className="flex flex-col">
        {linkOrders ? (
          <a
            href={`/dashboard/orders/${o.id}`}
            className="text-primary font-medium hover:underline"
          >
            {o.code}
          </a>
        ) : (
          <span className="font-medium">{o.code}</span>
        )}
        <span className="text-muted-foreground text-xs">{o.recipientName}</span>
      </div>
    ),
  }

  // Warehouse column for dashboard uses name + city two-line layout.
  const warehouseTwoLineColumn: DataTableColumn<Order> = {
    id: "warehouse",
    header: "Warehouse",
    cell: (o) => {
      const w = warehouseFn(o.warehouseId)
      if (!w) return <span className="text-muted-foreground text-sm">—</span>
      return (
        <div className="flex flex-col">
          <span className="text-sm">{w.name}</span>
          <span className="text-muted-foreground text-xs">{w.city}</span>
        </div>
      )
    },
  }

  return [
    orderCell,
    merchantColumn(merchantNameFn),
    warehouseTwoLineColumn,
    deliveryAddressColumn(),
    pickupColumn,
    weightColumn,
    collectibleColumn(),
    statusColumn(),
    riderColumn("pickup", riderNameFn),
    riderColumn("delivery", riderNameFn),
  ]
}
