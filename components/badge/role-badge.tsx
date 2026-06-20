import type { Role } from "@/lib/types"
import { ROLE_LABELS, ROLE_TONES } from "@/lib/constants"
import { StatusBadge } from "@/components/badge/status-badge"

export function RoleBadge({ role }: { role: Role }) {
  return <StatusBadge label={ROLE_LABELS[role]} tone={ROLE_TONES[role]} />
}
