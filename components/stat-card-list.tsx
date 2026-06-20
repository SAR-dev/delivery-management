import { Card, CardContent } from "@/components/ui/card"

export type StatCardItem = {
  /** Unique key for the list item. Falls back to `label` if omitted. */
  key?: string
  label: string
  value: string | number
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  /** Tailwind classes for the icon badge, e.g. "bg-chart-1/15 text-chart-1". */
  tone?: string
}

const DEFAULT_TONE = "bg-primary/10 text-primary"

function StatCard({ label, value, hint, icon: Icon, tone }: StatCardItem) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex size-11 items-center justify-center rounded-lg ${tone ?? DEFAULT_TONE}`}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          {hint ? (
            <p className="text-muted-foreground text-xs">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function StatCardList({
  items,
  columns = 3,
  className = "",
}: {
  items: StatCardItem[]
  /** Max columns at the `sm` breakpoint and up. 3 or 4. Defaults to 3. */
  columns?: 3 | 4
  className?: string
}) {
  const gridCols =
    columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"

  return (
    <div className={`grid grid-cols-1 gap-4 ${gridCols} ${className}`.trim()}>
      {items.map((item, i) => (
        <StatCard key={item.key ?? item.label ?? i} {...item} />
      ))}
    </div>
  )
}
