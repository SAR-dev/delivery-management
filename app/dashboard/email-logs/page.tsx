"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckCheck, Loader2 } from "lucide-react"
import { useEmailLogs } from "@/features/email-logs/hooks/use-email-logs"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { StatusBadge } from "@/components/status-badge"
import {
  EMAIL_LOG_STATUS_LABELS,
  EMAIL_LOG_STATUS_TONES,
} from "@/lib/constants"
import type { EmailLog } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { EmailLogDetailDialog } from "@/features/email-logs/dialogs/email-log-detail-dialog"

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function EmailLogsPage() {
  const {
    emailLogs,
    allEmailLogs,
    total,
    page: _page,
    setPage,
    limit: _limit,
    setLimit,
    query,
    setQuery,
    sortId,
    sortDir,
    onSortChange,
    isLoading,
    markAsSent,
  } = useEmailLogs()
  const [busy, setBusy] = useState<string | null>(null)
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  function handleRowClick(log: EmailLog) {
    setSelectedLog(log)
    setDetailOpen(true)
  }

  async function handleMarkAsSent(log: EmailLog) {
    setBusy(log.id)
    try {
      const result = await markAsSent(log.id)
      if (result.ok) {
        toast.success(`Marked email to ${log.to} as sent.`)
      } else {
        toast.error(result.error ?? "Unable to mark this email as sent.")
      }
    } finally {
      setBusy(null)
    }
  }

  const columns: DataTableColumn<EmailLog>[] = [
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
      id: "to",
      header: "To",
      sortable: true,
      sortValue: (l) => l.to,
      cell: (l) => <span className="text-sm">{l.to}</span>,
    },
    {
      id: "subject",
      header: "Subject",
      sortable: true,
      sortValue: (l) => l.subject,
      cell: (l) => <span className="text-sm">{l.subject}</span>,
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      sortValue: (l) => l.status,
      cell: (l) => (
        <div className="flex flex-col gap-1">
          <StatusBadge
            label={EMAIL_LOG_STATUS_LABELS[l.status]}
            tone={EMAIL_LOG_STATUS_TONES[l.status]}
          />
          {l.markedSentBy ? (
            <span className="text-muted-foreground text-xs">
              Marked sent by {l.markedSentBy}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "attempts",
      header: "Attempts",
      align: "right",
      sortable: true,
      sortValue: (l) => l.attempts,
      headClassName: "hidden sm:table-cell",
      cellClassName: "hidden text-right sm:table-cell",
      cell: (l) => (
        <span className="text-muted-foreground text-sm">{l.attempts}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      headClassName: "w-12",
      cell: (l) =>
        l.status === "FAILED" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMarkAsSent(l)}
            disabled={busy === l.id}
          >
            {busy === l.id ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCheck className="size-4" />
            )}
            Mark as sent
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={pageContent.dashboard.emailLogs.title}
        description={pageContent.dashboard.emailLogs.description}
      />

      <Card>
        <CardContent className="p-0">
          <DataTable
            serverPaginated
            id="dashboard-email-logs"
            searchable
            columns={columns}
            data={emailLogs}
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
            emptyMessage={isLoading ? "Loading…" : "No email log entries yet."}
            serverSortId={sortId}
            serverSortDir={sortDir}
            onSortChange={onSortChange}
            onRowClick={handleRowClick}
            csvData={allEmailLogs}
            csv={{
              filename: "email-logs",
              headers: ["When", "To", "Subject", "Status", "Attempts"],
              parser: (l) => [
                new Date(l.createdAt).toLocaleString(),
                l.to,
                l.subject,
                l.status,
                l.attempts,
              ],
            }}
          />
        </CardContent>
      </Card>

      <EmailLogDetailDialog
        log={selectedLog}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
