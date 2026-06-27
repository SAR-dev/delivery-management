import type { Metadata } from "next"
import { MerchantShell } from "./merchant-shell"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MerchantShell>{children}</MerchantShell>
}
