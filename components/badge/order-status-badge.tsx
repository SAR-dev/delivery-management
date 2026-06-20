import type { OrderStatus } from "@/lib/types"
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from "@/lib/constants"
import { StatusBadge } from "@/components/badge/status-badge"

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <StatusBadge label={ORDER_STATUS_LABELS[status]} tone={ORDER_STATUS_TONES[status]} />
}
