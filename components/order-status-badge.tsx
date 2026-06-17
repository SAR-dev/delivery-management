import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { OrderStatus } from "@/lib/types"

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  PICKED_UP: "Picked up",
  IN_WAREHOUSE: "In warehouse",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  FAILED_ATTEMPT: "Failed attempt",
  RETURNED: "Returned",
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-chart-3/15 text-chart-3 border-chart-3/25",
  APPROVED: "bg-chart-1/15 text-chart-1 border-chart-1/25",
  PICKED_UP: "bg-chart-1/15 text-chart-1 border-chart-1/25",
  IN_WAREHOUSE: "bg-accent text-accent-foreground border-accent-foreground/20",
  IN_TRANSIT: "bg-chart-4/15 text-chart-4 border-chart-4/25",
  OUT_FOR_DELIVERY: "bg-chart-4/15 text-chart-4 border-chart-4/25",
  DELIVERED: "bg-chart-2/15 text-chart-2 border-chart-2/25",
  FAILED_ATTEMPT: "bg-destructive/10 text-destructive border-destructive/20",
  RETURNED: "bg-muted text-muted-foreground border-border",
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
