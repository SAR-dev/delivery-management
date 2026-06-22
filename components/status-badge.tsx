import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { BADGE_TONES, type BadgeTone } from "@/lib/constants"

export function StatusBadge({
  label,
  tone,
}: {
  label: string
  tone: BadgeTone
}) {
  return (
    <Badge variant="outline" className={cn("font-medium", BADGE_TONES[tone])}>
      {label}
    </Badge>
  )
}
