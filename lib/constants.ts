import type {
  EmailLogStatus,
  MerchantStatus,
  OrderStatus,
  PayoutRequestStatus,
  Role,
} from "@/lib/types"
import { siteConfig } from "@/config/site"

// Re-exported from the centralized site config (config/site.json) so the brand
// name has a single source of truth across the app.
export const BRAND_NAME = siteConfig.name
export const CURRENCY_SUFFIX = "TK"
export const MAX_BULK_ORDERS = 50

// DataTable rows-per-page: stored per-account on profile.tableRowsPerPage.
// Single source of truth for the bounds — used by validation, the API
// fallback, the seed script, and DataTable's own defensive clamp.
export const DEFAULT_TABLE_ROWS_PER_PAGE = 20
export const MAX_TABLE_ROWS_PER_PAGE = 250

export const BADGE_TONES = {
  pending: "bg-chart-3/15 text-chart-3 border-chart-3/25",
  info: "bg-chart-1/15 text-chart-1 border-chart-1/25",
  success: "bg-chart-2/15 text-chart-2 border-chart-2/25",
  transit: "bg-chart-4/15 text-chart-4 border-chart-4/25",
  warehouse: "bg-accent text-accent-foreground border-accent-foreground/20",
  neutral: "bg-muted text-muted-foreground border-border",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  brand: "bg-primary/10 text-primary border-primary/20",
} as const

export type BadgeTone = keyof typeof BADGE_TONES

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  PICKED_UP: "Picked up",
  IN_WAREHOUSE: "In warehouse",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  FAILED_ATTEMPT: "Failed attempt",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
}

export const ORDER_STATUS_TONES: Record<OrderStatus, BadgeTone> = {
  PENDING: "pending",
  APPROVED: "info",
  PICKED_UP: "info",
  IN_WAREHOUSE: "warehouse",
  IN_TRANSIT: "transit",
  OUT_FOR_DELIVERY: "transit",
  DELIVERED: "success",
  FAILED_ATTEMPT: "danger",
  RETURNED: "neutral",
  CANCELLED: "danger",
}

export const MERCHANT_STATUS_LABELS: Record<MerchantStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
}

export const MERCHANT_STATUS_TONES: Record<MerchantStatus, BadgeTone> = {
  PENDING: "pending",
  ACTIVE: "success",
  SUSPENDED: "danger",
}

export const PAYOUT_STATUS_LABELS: Record<PayoutRequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  PAID: "Paid",
  REJECTED: "Rejected",
}

export const PAYOUT_STATUS_TONES: Record<PayoutRequestStatus, BadgeTone> = {
  PENDING: "pending",
  APPROVED: "info",
  PAID: "success",
  REJECTED: "danger",
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  WAREHOUSE_ADMIN: "Warehouse Admin",
  MERCHANT: "Merchant",
  RIDER: "Rider",
}

export const ROLE_TONES: Record<Role, BadgeTone> = {
  SUPER_ADMIN: "brand",
  ADMIN: "pending",
  WAREHOUSE_ADMIN: "warehouse",
  MERCHANT: "neutral",
  RIDER: "neutral",
}

export const EMAIL_LOG_STATUS_LABELS: Record<EmailLogStatus, string> = {
  SENT: "Sent",
  FAILED: "Failed",
}

export const EMAIL_LOG_STATUS_TONES: Record<EmailLogStatus, BadgeTone> = {
  SENT: "success",
  FAILED: "danger",
}
