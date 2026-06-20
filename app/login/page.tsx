"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Lock, ShieldCheck, FlaskConical } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SEED_CREDENTIALS } from "@/lib/db/seed-credentials"

const ROLES_ORDER = [
  "Super Admin",
  "Admin",
  "Warehouse Admin",
  "Merchant",
  "Rider",
]
const grouped = ROLES_ORDER.map((role) => ({
  role,
  users: SEED_CREDENTIALS.filter((u) => u.role === role),
}))

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

  function fillCredentials(value: string | null) {
    if (!value) return
    const cred = SEED_CREDENTIALS.find((c) => c.email === value)
    if (!cred) return
    setEmail(cred.email)
    setPassword(cred.password)
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
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
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle className="bg-background/80 backdrop-blur" />
      </div>
      {/* Brand panel */}
      <section className="bg-sidebar text-sidebar-foreground relative hidden flex-1 flex-col justify-between p-12 lg:flex">
        <div className="flex items-center gap-2">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-9 items-center justify-center rounded-lg">
            <ShieldCheck className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            ParcelFlow
          </span>
        </div>

        <div className="max-w-md">
          <p className="text-sidebar-primary text-sm font-medium tracking-widest uppercase">
            B2B Delivery Platform
          </p>
          <h1 className="mt-4 text-4xl leading-tight font-semibold text-balance">
            Everything you need, in one place.
          </h1>
          <p className="text-sidebar-foreground/70 mt-4 leading-relaxed text-pretty">
            Whether you're managing deliveries, tracking orders, or running
            operations — sign in to access your workspace.
          </p>
        </div>

        <p className="text-sidebar-foreground/50 text-xs">
          {"\u00A9"} {new Date().getFullYear()} ParcelFlow. Internal use only.
        </p>
      </section>

      {/* Form panel */}
      <section className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
              <ShieldCheck className="size-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              ParcelFlow
            </span>
          </div>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-col gap-1">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Sign in to access your workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Dev credentials picker */}
              <div className="border-border bg-muted/40 mb-4 rounded-md border border-dashed p-3">
                <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium">
                  <FlaskConical className="size-3.5" />
                  Dev — fill seed credentials
                </p>
                <Select onValueChange={fillCredentials}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="Pick a user…" />
                  </SelectTrigger>
                  <SelectContent>
                    {grouped.map(({ role, users }) => (
                      <SelectGroup key={role}>
                        <SelectLabel className="text-xs">{role}</SelectLabel>
                        {users.map((u) => (
                          <SelectItem
                            key={u.email}
                            value={u.email}
                            className="text-xs"
                          >
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                    className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm"
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

              <p className="text-muted-foreground mt-6 text-center text-sm">
                Are you a merchant?{" "}
                <Link
                  href="/register"
                  className="text-primary font-medium hover:underline"
                >
                  Create an account
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
