"use client"

import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import type { Rider } from "@/lib/types"
import type { DataTableColumn } from "@/components/data-table"
import { taskTypeLabel } from "@/features/riders/dialogs/task-type"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

interface UseRiderColumnsOptions {
  showWarehouse?: boolean
}

export function useRiderColumns({
  showWarehouse = false,
}: UseRiderColumnsOptions = {}): DataTableColumn<Rider>[] {
  const { warehouses } = useWarehouses()

  function warehouseName(id?: string | null) {
    if (!id) return null
    return warehouses.find((w) => w.id === id)?.name ?? "Unknown"
  }

  const columns: DataTableColumn<Rider>[] = [
    {
      id: "name",
      header: "Name",
      sortable: true,
      sortValue: (r) => r.name,
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-medium">{r.name}</span>
          <span className="text-muted-foreground text-xs sm:hidden">
            {r.phone}
          </span>
        </div>
      ),
    },
    {
      id: "phone",
      header: "Phone",
      sortable: true,
      sortValue: (r) => r.phone,
      headClassName: "hidden sm:table-cell",
      cellClassName: "hidden sm:table-cell",
      cell: (r) => <span className="text-sm tabular-nums">{r.phone}</span>,
    },
    {
      id: "zone",
      header: "Zone",
      sortable: true,
      sortValue: (r) => r.zone,
      cell: (r) => <span className="text-sm">{r.zone}</span>,
    },
    {
      id: "taskType",
      header: "Task type",
      sortable: true,
      sortValue: (r) => r.taskType,
      cell: (r) => (
        <Badge variant="outline" className="font-normal">
          {taskTypeLabel(r.taskType)}
        </Badge>
      ),
    },
  ]

  if (showWarehouse) {
    columns.push({
      id: "assignment",
      header: "Warehouse",
      sortable: true,
      sortValue: (r) => warehouseName(r.warehouseId) ?? "",
      cell: (r) => {
        const name = warehouseName(r.warehouseId)
        return name ? (
          <Badge variant="secondary" className="font-normal">
            {name}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )
      },
    })
  }

  columns.push({
    id: "status",
    header: "Status",
    align: "right",
    sortable: true,
    sortValue: (r) => (r.isActive ? 1 : 0),
    cell: (r) => (
      <Switch
        checked={r.isActive}
        disabled
        className="data-[state=checked]:bg-chart-2 disabled:opacity-100"
        aria-label={r.isActive ? "Active" : "Disabled"}
      />
    ),
  })

  return columns
}
