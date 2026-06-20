"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2, Store, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface FormState {
  businessName: string
  ownerName: string
  email: string
  phone: string
  address: string
  password: string
}

const EMPTY: FormState = {
  businessName: "",
  ownerName: "",
  email: "",
  phone: "",
  address: "",
  password: "",
}

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [submittedName, setSubmittedName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const businessName = form.businessName.trim()
    try {
      const res = await fetch("/api/merchants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          ownerName: form.ownerName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          password: form.password,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(
          data?.error ?? "Could not complete registration. Please try again.",
        )
        return
      }
      setSubmittedName(businessName)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel */}
      <section className="bg-sidebar text-sidebar-foreground relative hidden flex-1 flex-col justify-between p-12 lg:flex">
        <div className="flex items-center gap-2">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-9 items-center justify-center rounded-lg">
            <Store className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            ParcelFlow
          </span>
        </div>

        <div className="max-w-md">
          <p className="text-sidebar-primary text-sm font-medium tracking-widest uppercase">
            Merchant Onboarding
          </p>
          <h1 className="mt-4 text-4xl leading-tight font-semibold text-balance">
            Start shipping with a nationwide delivery network.
          </h1>
          <p className="text-sidebar-foreground/70 mt-4 leading-relaxed text-pretty">
            Register your business in minutes. Once our team approves your
            account, you&apos;ll get your assigned delivery rates and can begin
            creating orders right away.
          </p>
          <ul className="text-sidebar-foreground/80 mt-8 space-y-3 text-sm">
            {[
              "Transparent per-order pricing",
              "Real-time order tracking",
              "Flexible pickup locations",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CheckCircle2 className="text-sidebar-primary size-4" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sidebar-foreground/50 text-xs">
          {"\u00A9"} {new Date().getFullYear()} ParcelFlow Logistics.
        </p>
      </section>

      {/* Form panel */}
      <section className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
              <Store className="size-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              ParcelFlow
            </span>
          </div>

          {submittedName ? (
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="flex flex-col gap-3">
                <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
                  <CheckCircle2 className="size-6" />
                </div>
                <CardTitle className="text-2xl text-balance">
                  Registration received
                </CardTitle>
                <CardDescription className="leading-relaxed text-pretty">
                  Thanks,{" "}
                  <span className="text-foreground font-medium">
                    {submittedName}
                  </span>
                  . Your account has been created with a{" "}
                  <span className="text-foreground font-medium">PENDING</span>{" "}
                  status. A Super Admin will review and approve your business,
                  after which an Admin will assign your delivery rates. You can
                  log in once your account is active.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Button
                  render={<Link href="/login" />}
                  nativeButton={false}
                  className="w-full"
                >
                  Go to login
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setForm(EMPTY)
                    setSubmittedName(null)
                  }}
                >
                  Register another business
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="flex flex-col gap-1">
                <CardTitle className="text-2xl">
                  Create your merchant account
                </CardTitle>
                <CardDescription>
                  Tell us about your business. Approval is required before you
                  can start shipping.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="businessName">Business name</Label>
                    <Input
                      id="businessName"
                      placeholder="Threadline Apparel"
                      value={form.businessName}
                      onChange={(e) => update("businessName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="ownerName">Owner / contact name</Label>
                    <Input
                      id="ownerName"
                      placeholder="Imran Kabir"
                      value={form.ownerName}
                      onChange={(e) => update("ownerName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@business.com"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+8801712345678"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="address">Business address</Label>
                    <Input
                      id="address"
                      placeholder="House 14, Road 7, Dhanmondi, Dhaka"
                      value={form.address}
                      onChange={(e) => update("address", e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Choose a password"
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  {error ? (
                    <p
                      role="alert"
                      className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm"
                    >
                      {error}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Submitting
                      </>
                    ) : (
                      "Submit registration"
                    )}
                  </Button>
                </form>

                <p className="text-muted-foreground mt-6 text-center text-sm">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="text-primary font-medium hover:underline"
                  >
                    Log in
                  </Link>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </main>
  )
}
