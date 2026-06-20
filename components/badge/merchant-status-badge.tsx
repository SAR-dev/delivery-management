import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { MerchantStatus } from "@/lib/types"

const STATUS_LABELS: Record<MerchantStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
}

const STATUS_STYLES: Record<MerchantStatus, string> = {
  PENDING: "bg-chart-3/15 text-chart-3 border-chart-3/25",
  ACTIVE: "bg-chart-2/15 text-chart-2 border-chart-2/25",
  SUSPENDED: "bg-destructive/10 text-destructive border-destructive/20",
}

export function MerchantStatusBadge({ status }: { status: MerchantStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", STATUS_STYLES[status])}
    >
      {STATUS_LABELS[status]}
    </Badge>
  )
}
