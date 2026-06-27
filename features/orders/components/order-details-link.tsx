import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

export function OrderDetailsLink({ orderId }: { orderId: string }) {
  return (
    <Link
      href={`/warehouse/orders/${orderId}`}
      className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
    >
      Order Details
      <ArrowUpRight className="size-3" />
    </Link>
  )
}
