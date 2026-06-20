import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Role } from "@/lib/types"

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  WAREHOUSE_ADMIN: "Warehouse Admin",
  MERCHANT: "Merchant",
  RIDER: "Rider",
}

const ROLE_STYLES: Record<Role, string> = {
  SUPER_ADMIN: "bg-primary/10 text-primary border-primary/20",
  ADMIN: "bg-chart-3/15 text-chart-3 border-chart-3/25",
  WAREHOUSE_ADMIN: "bg-accent text-accent-foreground border-accent-foreground/20",
  MERCHANT: "bg-muted text-muted-foreground border-border",
  RIDER: "bg-muted text-muted-foreground border-border",
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", ROLE_STYLES[role])}
    >
      {ROLE_LABELS[role]}
    </Badge>
  )
}
