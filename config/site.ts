import { ShieldCheck, type LucideIcon } from "lucide-react"
import siteData from "@/config/site.json"

// Single source of truth for the site's identity (name, tagline, brand icon).
// Plain text lives in config/site.json so it can be edited without touching
// code; the icon can't live in JSON, so we map the JSON `icon` name to a
// concrete lucide component here. Add an entry to ICONS if you change the icon
// in site.json.
const ICONS: Record<string, LucideIcon> = {
  ShieldCheck,
}

export interface SiteConfig {
  /** Product / brand name, shown in nav, login, and metadata. */
  name: string
  /** Short positioning line, e.g. shown on the login brand panel. */
  tagline: string
  /** Used as the default <meta name="description"> for the app. */
  description: string
  /** The brand mark, resolved from the JSON icon name. */
  icon: LucideIcon
}

export const siteConfig: SiteConfig = {
  name: siteData.name,
  tagline: siteData.tagline,
  description: siteData.description,
  icon: ICONS[siteData.icon] ?? ShieldCheck,
}

// Convenience alias so callers can render <SiteIcon /> directly.
export const SiteIcon = siteConfig.icon
