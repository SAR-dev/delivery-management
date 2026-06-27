import type { Metadata } from "next"
import { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Create Merchant Account",
  description:
    "Register your business on ParcelFlow and start booking deliveries across Bangladesh. First 100 merchants get 10% off forever.",
  alternates: {
    canonical: "/register",
  },
  openGraph: {
    title: "Create Merchant Account – ParcelFlow",
    description:
      "Register your business and start shipping with ParcelFlow. Transparent pricing, real-time tracking, and fast approval.",
    url: "/register",
  },
  twitter: {
    title: "Create Merchant Account – ParcelFlow",
    description:
      "Register your business and start shipping with ParcelFlow. Transparent pricing, real-time tracking, and fast approval.",
  },
}

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
