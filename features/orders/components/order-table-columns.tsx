"use client"

import Link from "next/link"
import { Bike } from "lucide-react"
import { useMerchants } from "@/features/merchants/hooks/use-merchants"
import { useRiders } from "@/features/riders/hooks/use-riders"
import { usePickupLocations } from "@/features/pickup-locations/hooks/use-pickup-locations"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import { cn } from "@/lib/utils"
import { formatTk } from "@/lib/pricing"
import type { Order } from "@/lib/types"
import type { DataTableColumn } from "@/components/data-table"
import { OrderStatusBadge } from "./order-status-badge"
import { AddressModal } from "./address-modal"
import { PickupLocationModal } from "@/features/pickup-locations/components/pickup-location-modal"

export function useOrderColumns(): DataTableColumn<Order>[] {
  const { merchants } = useMerchants()
  const { riders } = useRiders()
  const { pickupLocations } = usePickupLocations()
  const { warehouses } = useWarehouses()

  const merchantName = (id: string) =>
    merchants.find((m) => m.id === id)?.businessName ?? "Unknown"
  const riderName = (id?: string | null) =>
    id ? (riders.find((r) => r.id === id)?.name ?? "—") : "—"
  const pickupLocation = (id: string) =>
    pickupLocations.find((p) => p.id === id) ?? null
  const warehouse = (id?: string | null) =>
    id ? (warehouses.find((w) => w.id === id) ?? null) : null
  const warehouseDisplay = (id?: string | null) => {
    const w = warehouse(id)
    if (!w) return "—"
    return `${w.name} — ${w.city}`
  }

  const columns: DataTableColumn<Order>[] = [
    {
      id: "order",
      header: "Order",
      sortable: true,
      sortValue: (o) => o.code,
      cell: (o) => (
        <div className="flex flex-col">
          <Link
            href={`/dashboard/orders/${o.id}`}
            className="text-primary font-medium hover:underline"
          >
            {o.code}
          </Link>
          <span className="text-muted-foreground text-xs">
            {o.recipientName}
          </span>
        </div>
      ),
    },
    {
      id: "merchant",
      header: "Merchant",
      sortable: true,
      sortValue: (o) => merchantName(o.merchantId),
      cell: (o) => merchantName(o.merchantId),
    },
    {
      id: "warehouse",
      header: "Warehouse",
      sortable: true,
      sortValue: (o) => warehouseDisplay(o.warehouseId),
      cell: (o) => {
        const w = warehouse(o.warehouseId)
        if (!w) return <span className="text-muted-foreground text-sm">—</span>
        return (
          <div className="flex flex-col">
            <span className="text-sm">{w.name}</span>
            <span className="text-muted-foreground text-xs">{w.city}</span>
          </div>
        )
      },
    },
    {
      id: "city",
      header: "Delivery City",
      sortable: true,
      sortValue: (o) => o.deliveryCity,
      cell: (o) => (
        <AddressModal order={o}>
          <span className="text-sm underline decoration-dotted underline-offset-4">
            {o.deliveryCity}
          </span>
        </AddressModal>
      ),
    },
    {
      id: "pickup",
      header: "Pickup Location",
      sortable: true,
      sortValue: (o) => pickupLocation(o.pickupLocationId)?.label ?? "",
      cell: (o) => {
        const p = pickupLocation(o.pickupLocationId)
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
    },
    {
      id: "weight",
      header: "Weight",
      align: "right",
      sortable: true,
      sortValue: (o) => o.parcelWeightKg,
      cell: (o) => {
        const merchant = merchants.find((m) => m.id === o.merchantId)
        const exceedsWeight = merchant
          ? o.parcelWeightKg > merchant.maxWeightKg
          : false
        return (
          <span
            className={cn(
              "tabular-nums",
              exceedsWeight && "text-destructive font-medium",
            )}
          >
            {o.parcelWeightKg} KG
          </span>
        )
      },
    },
    {
      id: "collectible",
      header: "Collectible",
      align: "right",
      sortable: true,
      sortValue: (o) => o.totalCollectible,
      cell: (o) => (
        <span className="tabular-nums">{formatTk(o.totalCollectible)}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      sortValue: (o) => o.status,
      cell: (o) => <OrderStatusBadge status={o.status} />,
    },
    {
      id: "pickupRider",
      header: "Pickup Rider",
      sortable: true,
      sortValue: (o) => riderName(o.pickupRiderId),
      cell: (o) =>
        o.pickupRiderId ? (
          <span className="flex items-center gap-1.5 text-sm">
            <Bike className="text-muted-foreground size-4" />
            {riderName(o.pickupRiderId)}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      id: "deliveryRider",
      header: "Delivery Rider",
      sortable: true,
      sortValue: (o) => riderName(o.deliveryRiderId),
      cell: (o) =>
        o.deliveryRiderId ? (
          <span className="flex items-center gap-1.5 text-sm">
            <Bike className="text-muted-foreground size-4" />
            {riderName(o.deliveryRiderId)}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
  ]

  return columns
}
