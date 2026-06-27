import type { Metadata } from "next"
import { WarehouseShell } from "./warehouse-shell"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function WarehouseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <WarehouseShell>{children}</WarehouseShell>
}
