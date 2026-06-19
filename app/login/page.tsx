"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Lock, ShieldCheck } from "lucide-react"
import { usePlatform, homeForRole } from "@/lib/platform-context"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const { login, currentUser, isReady } = usePlatform()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isReady && currentUser) {
      router.replace(homeForRole(currentUser.role))
    }
  }, [isReady, currentUser, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = await login(email, password)
    if (result.ok && result.user) {
      router.replace(homeForRole(result.user.role))
    } else if (result.ok) {
      router.replace("/dashboard")
    } else {
      setError(result.error ?? "Unable to sign in.")
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle className="bg-background/80 backdrop-blur" />
      </div>
      {/* Brand panel */}
      <section className="relative hidden flex-1 flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            ParcelFlow
          </span>
        </div>

        <div className="max-w-md">
          <p className="text-sm font-medium uppercase tracking-widest text-sidebar-primary">
            Super Admin Console
          </p>
          <h1 className="mt-4 text-balance text-4xl font-semibold leading-tight">
            Set up and govern your B2B delivery platform.
          </h1>
          <p className="mt-4 text-pretty leading-relaxed text-sidebar-foreground/70">
            Configure security money rules, provision Admin and Warehouse Admin
            accounts, and control who manages merchant pricing — all from one
            place.
          </p>
        </div>

        <p className="text-xs text-sidebar-foreground/50">
          {"\u00A9"} {new Date().getFullYear()} ParcelFlow Logistics. Internal
          use only.
        </p>
      </section>

      {/* Form panel */}
      <section className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              ParcelFlow
            </span>
          </div>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Sign in to the Super Admin console to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@parcelflow.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error ? (
                  <p
                    role="alert"
                    className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {error}
                  </p>
                ) : null}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Signing in
                    </>
                  ) : (
                    <>
                      <Lock className="size-4" />
                      Sign in
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Are you a merchant?{" "}
                <Link
                  href="/register"
                  className="font-medium text-primary hover:underline"
                >
                  Register your business
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
