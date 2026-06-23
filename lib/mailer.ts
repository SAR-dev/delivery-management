// Gmail SMTP mailer with retry logic and exponential backoff.
//
// Uses nodemailer under the hood. Requires GMAIL_USER and GMAIL_APP_PASSWORD
// env vars (App Password, not your real Gmail password — needs 2FA enabled).
//
// Usage:
//   await sendMail({ to: "x@y.com", subject: "Hi", html: "<b>Hello</b>" })
//
// Failed mails (exhausted all retries) are stored in the `failed_mail` table.

import nodemailer, { type SendMailOptions } from "nodemailer"
import { db } from "@/lib/db"
import { failedMail } from "@/lib/db/schema"

export interface MailPayload {
  to: string | string[]
  subject: string
  html?: string
  text?: string
}

export interface SendMailOptions_ {
  maxRetries?: number // default: 3
  baseDelayMs?: number // default: 1000 — doubles on each retry
  onRetry?: (attempt: number, error: Error) => void
}

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export async function sendMail(
  payload: MailPayload,
  options: SendMailOptions_ = {},
): Promise<void> {
  const { maxRetries = 3, baseDelayMs = 1000, onRetry } = options

  const transporter = createTransporter()

  const mailOptions: SendMailOptions = {
    from: `"Delivery Management" <${process.env.GMAIL_USER}>`,
    ...payload,
  }

  let lastError: Error | null = null
  const totalAttempts = maxRetries + 1

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      await transporter.sendMail(mailOptions)
      console.log(`[mailer] Email sent to ${payload.to} (attempt ${attempt})`)
      return
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.error(
        `[mailer] Attempt ${attempt}/${totalAttempts} failed:`,
        lastError.message,
      )

      if (attempt === totalAttempts) break

      const delay = baseDelayMs * Math.pow(2, attempt - 1)
      console.log(`[mailer] Retrying in ${delay}ms…`)
      onRetry?.(attempt, lastError)
      await sleep(delay)
    }
  }

  // All retries exhausted — persist to DB so it can be investigated / re-sent.
  try {
    await db.insert(failedMail).values({
      to: Array.isArray(payload.to) ? payload.to.join(", ") : payload.to,
      subject: payload.subject,
      html: payload.html ?? null,
      text: payload.text ?? null,
      error: lastError?.message ?? "Unknown error",
      attempts: totalAttempts,
    })
    console.error(`[mailer] Logged failed email to DB (to: ${payload.to})`)
  } catch (dbErr) {
    // Don't let a DB failure swallow the original mail error.
    console.error("[mailer] Failed to log failed email to DB:", dbErr)
  }

  throw new Error(
    `[mailer] Failed after ${totalAttempts} attempts. Last error: ${lastError?.message}`,
  )
}
