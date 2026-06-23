// Gmail SMTP mailer with retry logic and exponential backoff.
//
// Uses nodemailer under the hood. Requires GMAIL_USER and GMAIL_APP_PASSWORD
// env vars (App Password, not your real Gmail password — needs 2FA enabled).
//
// Usage:
//   await sendMail({ to: "x@y.com", subject: "Hi", html: "<b>Hello</b>" })

import nodemailer, { type SendMailOptions } from "nodemailer"

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

  throw new Error(
    `[mailer] Failed after ${totalAttempts} attempts. Last error: ${lastError?.message}`,
  )
}
