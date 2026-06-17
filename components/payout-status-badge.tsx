import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { PayoutRequestStatus } from "@/lib/types"

const STATUS_LABELS: Record<PayoutRequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  PAID: "Paid",
  REJECTED: "Rejected",
}

const STATUS_STYLES: Record<PayoutRequestStatus, string> = {
  PENDING: "bg-chart-3/15 text-chart-3 border-chart-3/25",
  APPROVED: "bg-chart-1/15 text-chart-1 border-chart-1/25",
  PAID: "bg-chart-2/15 text-chart-2 border-chart-2/25",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
}

export function PayoutStatusBadge({
  status,
}: {
  status: PayoutRequestStatus
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", STATUS_STYLES[status])}
    >
      {STATUS_LABELS[status]}
    </Badge>
  )
}
