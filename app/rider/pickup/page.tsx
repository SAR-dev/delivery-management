"use client"

import { useMemo, useState } from "react"
import { PackageCheck } from "lucide-react"
import { usePlatform } from "@/lib/platform-context"
import type { Order } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { OrderStatusBadge } from "@/components/badge/order-status-badge"
import { PickupConfirmDialog } from "@/components/dialog/pickup-confirm-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable, type DataTableColumn } from "@/components/data-table"

type FilterTab = "TO_COLLECT" | "COLLECTED"

export default function RiderPickupQueuePage() {
  const { currentUser, currentRider, orders, merchants, pickupLocations } =
    usePlatform()
  const [tab, setTab] = useState<FilterTab>("TO_COLLECT")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const merchant = (id: string) => merchants.find((m) => m.id === id)
  const merchantName = (id: string) => merchant(id)?.businessName ?? "Merchant"
  const pickup = (id: string) => pickupLocations.find((p) => p.id === id)

  // All orders assigned to this rider for pickup.
  const myPickups = useMemo(
    () =>
      currentRider
        ? orders.filter((o) => o.pickupRiderId === currentRider.id)
        : [],
    [orders, currentRider],
  )

  const toCollect = myPickups.filter((o) => o.status === "APPROVED")
  const collected = myPickups.filter((o) =>
    [
      "PICKED_UP",
      "IN_WAREHOUSE",
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
    ].includes(o.status),
  )

  const visible = tab === "TO_COLLECT" ? toCollect : collected

  function openConfirm(order: Order) {
    setActiveOrder(order)
    setDialogOpen(true)
  }

  // Pickup is a merchant-facing step — the rider only needs to know who
  // they're collecting from and where. Recipient/delivery details aren't
  // relevant yet, so they're left off this view entirely.
  const columns: DataTableColumn<Order>[] = [
    {
      id: "order",
      header: "Order",
      sortable: true,
      sortValue: (o) => o.code,
      cell: (o) => (
        <span className="text-muted-foreground font-mono text-xs">
          {o.code}
        </span>
      ),
    },
    {
      id: "merchant",
      header: "Merchant",
      sortable: true,
      sortValue: (o) => merchantName(o.merchantId),
      cell: (o) => {
        const m = merchant(o.merchantId)
        return (
          <div className="flex flex-col">
            <span className="font-medium">
              {m?.businessName ?? "Merchant"}
            </span>
            <span className="text-muted-foreground text-xs">{m?.phone}</span>
          </div>
        )
      },
    },
    {
      id: "pickup",
      header: "Pickup from",
      sortable: true,
      sortValue: (o) => pickup(o.pickupLocationId)?.label ?? "",
      cell: (o) => {
        const p = pickup(o.pickupLocationId)
        return (
          <div className="flex flex-col">
            <span className="font-medium">{p?.label ?? "—"}</span>
            <span className="text-muted-foreground text-xs">
              {p?.address ?? "—"}
            </span>
          </div>
        )
      },
    },
    {
      id: "parcel",
      header: "Parcel",
      cell: (o) => (
        <span className="text-muted-foreground text-sm">
          {o.parcelWeightKg} KG · {o.deliveryType} · to {o.deliveryCity}
        </span>
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
      id: "actions",
      header: "",
      align: "right",
      headClassName: "w-12",
      cell: (o) =>
        o.status === "APPROVED" ? (
          <Button size="sm" onClick={() => openConfirm(o)}>
            <PackageCheck className="size-4" />
            Mark picked up
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Pickup queue, ${currentUser?.name.split(" ")[0] ?? "Rider"}`}
        description="Collect approved parcels from merchants and mark them picked up."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="TO_COLLECT">
            To collect ({toCollect.length})
          </TabsTrigger>
          <TabsTrigger value="COLLECTED">
            Collected ({collected.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={visible}
            getRowKey={(o) => o.id}
            initialSortId="order"
            searchable
            searchPlaceholder="Search code, merchant, pickup location"
            getSearchText={(o) =>
              `${o.code} ${merchantName(o.merchantId)} ${
                pickup(o.pickupLocationId)?.label ?? ""
              } ${o.deliveryCity}`
            }
            emptyMessage={
              tab === "TO_COLLECT"
                ? "No pickups waiting. New pickups appear here once an Admin assigns them to you."
                : "Nothing collected yet."
            }
          />
        </CardContent>
      </Card>

      <PickupConfirmDialog
        order={activeOrder}
        merchantName={
          activeOrder
            ? (merchant(activeOrder.merchantId)?.businessName ?? "Merchant")
            : ""
        }
        pickupLabel={
          activeOrder
            ? (pickup(activeOrder.pickupLocationId)?.label ?? "—")
            : ""
        }
        pickupAddress={
          activeOrder
            ? (pickup(activeOrder.pickupLocationId)?.address ?? "—")
            : ""
        }
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
