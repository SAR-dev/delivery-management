import type { Metadata } from "next"
import { RiderShell } from "./rider-shell"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function RiderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RiderShell>{children}</RiderShell>
}
