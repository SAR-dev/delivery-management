"use client"

import { Search } from "lucide-react"
import { useAuditLogs } from "@/features/audit-logs/hooks/use-audit-logs"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { RoleBadge } from "@/components/role-badge"
import type { AuditLog } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DataTable, type DataTableColumn } from "@/components/data-table"

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AuditLogsPage() {
  const { auditLogs, query, setQuery, isLoading } = useAuditLogs()

  const columns: DataTableColumn<AuditLog>[] = [
    {
      id: "createdAt",
      header: "When",
      sortable: true,
      sortValue: (l) => l.createdAt,
      cell: (l) => (
        <span className="text-muted-foreground text-sm whitespace-nowrap">
          {formatTimestamp(l.createdAt)}
        </span>
      ),
    },
    {
      id: "actor",
      header: "Actor",
      sortable: true,
      sortValue: (l) => l.actorName,
      cell: (l) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium">{l.actorName}</span>
          <RoleBadge role={l.actorRole} />
        </div>
      ),
    },
    {
      id: "action",
      header: "Action",
      sortable: true,
      sortValue: (l) => l.action,
      cell: (l) => (
        <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
          {l.action}
        </code>
      ),
    },
    {
      id: "entity",
      header: "Entity",
      sortable: true,
      sortValue: (l) => l.entityType,
      headClassName: "hidden sm:table-cell",
      cellClassName: "hidden sm:table-cell",
      cell: (l) => (
        <span className="text-muted-foreground text-sm">{l.entityType}</span>
      ),
    },
    {
      id: "description",
      header: "Description",
      cell: (l) => <span className="text-sm">{l.description}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title={pageContent.dashboard.auditLogs.title}
        description={pageContent.dashboard.auditLogs.description}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search actor, action, entity, description"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={auditLogs}
            getRowKey={(l) => l.id}
            initialSortId="createdAt"
            initialSortDir="desc"
            emptyMessage={isLoading ? "Loading…" : "No audit log entries yet."}
            csv={{
              parser: (l) => [
                formatTimestamp(l.createdAt),
                l.actorName,
                l.actorRole,
                l.action,
                l.entityType,
                l.entityId ?? "",
                l.description,
              ],
              headers: [
                "When",
                "Actor",
                "Role",
                "Action",
                "Entity type",
                "Entity ID",
                "Description",
              ],
              filename: "audit-logs",
            }}
          />
        </CardContent>
      </Card>
    </>
  )
}
