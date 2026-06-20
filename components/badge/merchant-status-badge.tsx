import type { MerchantStatus } from "@/lib/types"
import { MERCHANT_STATUS_LABELS, MERCHANT_STATUS_TONES } from "@/lib/constants"
import { StatusBadge } from "@/components/badge/status-badge"

export function MerchantStatusBadge({ status }: { status: MerchantStatus }) {
  return <StatusBadge label={MERCHANT_STATUS_LABELS[status]} tone={MERCHANT_STATUS_TONES[status]} />
}
