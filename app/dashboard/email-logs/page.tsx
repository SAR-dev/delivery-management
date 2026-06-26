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
import { SearchInput } from "@/components/search-input"

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
  const { emailLogs, query, setQuery, isLoading, markAsSent } = useEmailLogs()
  const [busy, setBusy] = useState<string | null>(null)

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
      id: "error",
      header: "Error",
      cell: (l) => (
        <span className="text-muted-foreground text-xs">{l.error ?? "—"}</span>
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <SearchInput
          placeholder="Search recipient, subject, or error"
          value={query}
          onChange={setQuery}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={emailLogs}
            getRowKey={(l) => l.id}
            initialSortId="createdAt"
            initialSortDir="desc"
            emptyMessage={isLoading ? "Loading…" : "No email log entries yet."}
            csv={{
              parser: (l) => [
                formatTimestamp(l.createdAt),
                l.to,
                l.subject,
                l.status,
                l.attempts,
                l.error ?? "",
                l.markedSentBy ?? "",
              ],
              headers: [
                "When",
                "To",
                "Subject",
                "Status",
                "Attempts",
                "Error",
                "Marked sent by",
              ],
              filename: "email-logs",
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
