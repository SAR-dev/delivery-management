import Link from "next/link"
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Star,
  Zap,
} from "lucide-react"
import { siteConfig, SiteIcon } from "@/config/site"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

// ─── Merchant count at which the early-bird deal closes ───────────────────────
const EARLY_BIRD_CAP = 100
const ORDER_CAP = 1_000

// ─── Static data ──────────────────────────────────────────────────────────────
const merchantBenefits = [
  "Transparent per-order pricing — no hidden fees",
  "Real-time tracking from pickup to doorstep",
  "Flexible pickup locations across every division",
  "Dedicated merchant dashboard for order management",
]

const riderPerks = [
  "Flexible hours — pick up & deliver on your schedule",
  "Competitive per-delivery earnings",
  "Assigned warehouse for structured routing",
  "Mobile-friendly delivery tools built for the road",
]

const howItWorks = [
  {
    step: "Register",
    icon: <Package className="size-5" />,
    desc: "Fill out the merchant form in under two minutes. Our team reviews and activates your account.",
  },
  {
    step: "Get your rates",
    icon: <Star className="size-5" />,
    desc: "An admin assigns your delivery pricing once approved. First 100 merchants lock in 10% off, forever.",
  },
  {
    step: "Start shipping",
    icon: <Zap className="size-5" />,
    desc: "Book your first order and watch real-time status updates roll in as riders move your parcels.",
  },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="bg-background text-foreground min-h-screen font-sans antialiased">
      {/* ── Nav ── */}
      <header className="border-border/60 bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="border-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg border">
              <SiteIcon className="size-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              {siteConfig.name}
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/login" />}
              nativeButton={false}
            >
              Sign in
            </Button>
            <Button
              size="sm"
              render={<Link href="/register" />}
              nativeButton={false}
            >
              Create merchant account
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          {/* Subtle grid background */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 text-center">
            {/* Early-bird pill */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
              <Star className="size-3 fill-current" />
              Early-bird offer — first {EARLY_BIRD_CAP} merchants get&nbsp;
              <span className="text-amber-900 dark:text-amber-300">
                10% off, forever
              </span>
              &nbsp;(up to {ORDER_CAP.toLocaleString()} orders)
            </div>

            <h1 className="mx-auto max-w-3xl text-4xl leading-tight font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Ship anything.
              <br />
              <span className="text-primary">Track everything.</span>
            </h1>

            <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-base leading-relaxed text-pretty sm:text-lg">
              {siteConfig.name} is a B2B courier platform built for Bangladeshi
              merchants. Register your business, book deliveries, and follow
              every parcel in real time — all from one place.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="gap-2"
                render={<Link href="/register" />}
                nativeButton={false}
              >
                Create your merchant account
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2"
                render={<Link href="mailto:riders@parcelflow.io" />}
                nativeButton={false}
              >
                <Bike className="size-4" />
                Join as a rider
              </Button>
            </div>

            <p className="text-muted-foreground mt-4 text-xs">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </section>

        {/* ── Split CTAs ── */}
        <section className="border-border/60 bg-muted/30 border-y">
          <div className="divide-border/60 mx-auto grid max-w-6xl grid-cols-1 divide-y lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            {/* Merchant card */}
            <div className="flex flex-col gap-6 px-8 py-14 lg:py-16">
              <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl">
                <Package className="size-6" />
              </div>
              <div>
                <p className="text-primary text-xs font-semibold tracking-widest uppercase">
                  For Merchants
                </p>
                <h2 className="mt-2 text-2xl leading-snug font-bold sm:text-3xl">
                  Grow your business without the delivery headache
                </h2>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                  Register your business and let us handle last-mile logistics
                  across every division. You focus on selling — we handle the
                  rest.
                </p>
              </div>

              <ul className="space-y-2.5">
                {merchantBenefits.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>

              {/* Early-bird highlight */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/30 dark:bg-amber-900/10">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                  🎉 First {EARLY_BIRD_CAP} merchants — 10% off, forever
                </p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Lock in a permanent 10% discount on every delivery charge.
                  Applies to your first {ORDER_CAP.toLocaleString()} orders.
                  Register before spots fill up.
                </p>
              </div>

              <div>
                <Button
                  className="w-full gap-2 sm:w-auto"
                  render={<Link href="/register" />}
                  nativeButton={false}
                >
                  Register your business
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>

            {/* Rider card */}
            <div className="flex flex-col gap-6 px-8 py-14 lg:py-16">
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Bike className="size-6" />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
                  For Riders
                </p>
                <h2 className="mt-2 text-2xl leading-snug font-bold sm:text-3xl">
                  Deliver more. Earn on your terms.
                </h2>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                  Join our growing fleet of pickup and delivery riders. A
                  warehouse team supports you end-to-end — so you spend less
                  time figuring out logistics and more time earning.
                </p>
              </div>

              <ul className="space-y-2.5">
                {riderPerks.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    {p}
                  </li>
                ))}
              </ul>

              <div className="border-border bg-muted/50 rounded-lg border p-4">
                <p className="text-sm font-semibold">How to apply</p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Send your CV to{" "}
                  <a
                    href="mailto:riders@parcelflow.io"
                    className="text-primary hover:underline"
                  >
                    riders@parcelflow.io
                  </a>{" "}
                  with your name, phone number, and division. Our ops team will
                  reach out within 2–3 business days.
                </p>
              </div>

              <div>
                <Button
                  variant="outline"
                  className="w-full gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 sm:w-auto dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                  render={<Link href="mailto:riders@parcelflow.io" />}
                  nativeButton={false}
                >
                  <Bike className="size-4" />
                  Send your CV
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 text-center">
            <p className="text-primary text-xs font-semibold tracking-widest uppercase">
              For merchants
            </p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              Up and running in three steps
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {howItWorks.map(({ step, icon, desc }, i) => (
              <div key={step} className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                    {icon}
                  </div>
                  <span className="text-muted-foreground text-sm font-medium">
                    Step {i + 1}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold">{step}</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features strip ── */}
        <section className="border-border/60 bg-muted/20 border-y">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-0 px-6 py-12 sm:grid-cols-4">
            {[
              {
                icon: <MapPin className="size-5" />,
                label: "Multi-division coverage",
              },
              {
                icon: <Clock className="size-5" />,
                label: "Real-time order tracking",
              },
              {
                icon: <Package className="size-5" />,
                label: "Bulk order support",
              },
              {
                icon: <Zap className="size-5" />,
                label: "Fast approval process",
              },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 px-4 py-6 text-center"
              >
                <div className="text-primary">{icon}</div>
                <p className="text-sm leading-tight font-medium">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Ready to start shipping?
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-relaxed">
            Join {siteConfig.name} today. Merchant accounts are approved within
            one business day — and the first {EARLY_BIRD_CAP} get a permanent
            10% rate discount.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="gap-2"
              render={<Link href="/register" />}
              nativeButton={false}
            >
              Create merchant account
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              render={<Link href="mailto:riders@parcelflow.io" />}
              nativeButton={false}
            >
              <Bike className="size-4" />
              Apply as a rider
            </Button>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-border/60 border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs sm:flex-row">
          <div className="flex items-center gap-2">
            <SiteIcon className="text-muted-foreground size-4" />
            <span className="text-muted-foreground">
              © {new Date().getFullYear()} {siteConfig.name}. All rights
              reserved.
            </span>
          </div>
          <div className="text-muted-foreground flex gap-5">
            <Link
              href="/login"
              className="hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="hover:text-foreground transition-colors"
            >
              Register
            </Link>
            <Link
              href="/track"
              className="hover:text-foreground transition-colors"
            >
              Track a parcel
            </Link>
            <a
              href="mailto:riders@parcelflow.io"
              className="hover:text-foreground transition-colors"
            >
              Rider applications
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
