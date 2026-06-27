"use client"

import { useAuditLogs } from "@/features/audit-logs/hooks/use-audit-logs"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { RoleBadge } from "@/components/role-badge"
import type { AuditLog } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
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
  const {
    auditLogs,
    allAuditLogs,
    total,
    page: _page,
    setPage,
    limit: _limit,
    setLimit,
    query,
    setQuery,
    isLoading,
  } = useAuditLogs()

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
    <div className="flex flex-col gap-6">
      <PageHeader
        title={pageContent.dashboard.auditLogs.title}
        description={pageContent.dashboard.auditLogs.description}
      />

      <Card>
        <CardContent className="p-0">
          <DataTable
            serverPaginated
            id="dashboard-audit-logs"
            searchable
            columns={columns}
            data={auditLogs}
            total={total}
            loading={isLoading}
            query={query}
            onQueryChange={(q) => {
              setQuery(q)
              setPage(1)
            }}
            onPageChange={(p, l) => {
              setPage(p)
              setLimit(l)
            }}
            getRowKey={(l) => l.id}
            initialSortId="createdAt"
            initialSortDir="desc"
            emptyMessage={isLoading ? "Loading…" : "No audit log entries yet."}
            csvData={allAuditLogs}
            csv={{
              filename: "audit-logs",
              headers: [
                "When",
                "Actor",
                "Role",
                "Action",
                "Entity",
                "Description",
              ],
              parser: (l) => [
                new Date(l.createdAt).toLocaleString(),
                l.actorName,
                l.actorRole,
                l.action,
                l.entityType,
                l.description,
              ],
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
