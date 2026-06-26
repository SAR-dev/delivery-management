import type { Metadata } from "next"
import { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your ParcelFlow account to manage deliveries, track parcels, and access your dashboard.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
