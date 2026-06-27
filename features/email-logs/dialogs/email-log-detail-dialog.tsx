"use client"

import { AlertTriangle, CheckCircle2, Clock, Mail, User } from "lucide-react"
import type { EmailLog } from "@/lib/types"
import {
  EMAIL_LOG_STATUS_LABELS,
  EMAIL_LOG_STATUS_TONES,
} from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { FormDialog } from "@/components/form-dialog"

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface EmailLogDetailDialogProps {
  log: EmailLog | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EmailLogDetailDialog({
  log,
  open,
  onOpenChange,
}: EmailLogDetailDialogProps) {
  if (!log) return null

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Email log details"
      description={log.subject}
      size="lg"
      showCancel={false}
      submitLabel="Close"
      onConfirm={() => onOpenChange(false)}
      fullWidthButtons
    >
      <div className="flex flex-col gap-3 py-2">
        <div className="flex items-center gap-3 text-sm">
          <Clock className="text-muted-foreground size-4 shrink-0" />
          <span>{formatTimestamp(log.createdAt)}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Mail className="text-muted-foreground size-4 shrink-0" />
          <span className="break-all">{log.to}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <CheckCircle2 className="text-muted-foreground size-4 shrink-0" />
          <Badge
            variant="secondary"
            className={`font-normal ${
              EMAIL_LOG_STATUS_TONES[log.status] === "success"
                ? "bg-chart-2/15 text-chart-2"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            {EMAIL_LOG_STATUS_LABELS[log.status]}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Clock className="text-muted-foreground size-4 shrink-0" />
          <span>
            {log.attempts} attempt{log.attempts !== 1 ? "s" : ""}
          </span>
        </div>
        {log.markedSentBy ? (
          <div className="flex items-center gap-3 text-sm">
            <User className="text-muted-foreground size-4 shrink-0" />
            <span>
              Marked sent by {log.markedSentBy}
              {log.markedSentAt
                ? ` on ${formatTimestamp(log.markedSentAt)}`
                : ""}
            </span>
          </div>
        ) : null}
        {log.error ? (
          <div className="flex items-start gap-3 text-sm">
            <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
            <span className="text-destructive break-all">{log.error}</span>
          </div>
        ) : null}
      </div>

      {log.body ? (
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-medium uppercase">
            Email body
          </span>
          <div className="border-input overflow-hidden rounded-md border">
            <iframe
              title="Email body"
              srcDoc={log.body}
              sandbox="allow-same-origin"
              className="h-80 w-full bg-white"
            />
          </div>
        </div>
      ) : null}
    </FormDialog>
  )
}
