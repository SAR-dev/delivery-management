import siteData from "@/config/site.json"
import { ParcelIcon } from "@/icons/ParcelIcon"

// Single source of truth for the site's identity (name, tagline, brand icon).
// The icon is an inline SVG React component sourced from /public/icon.svg so
// it renders identically on every page — login, register, nav, and all app
// sidebars — without relying on a Lucide component.

export interface SiteConfig {
  /** Product / brand name, shown in nav, login, and metadata. */
  name: string
  /** Short positioning line, e.g. shown on the login brand panel. */
  tagline: string
  /** Used as the default <meta name="description"> for the app. */
  description: string
  /** Canonical origin, used for metadataBase and OG URLs. */
  siteUrl: string
  /** The brand mark as an inline-SVG React component. */
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

export const siteConfig: SiteConfig = {
  name: siteData.name,
  tagline: siteData.tagline,
  description: siteData.description,
  siteUrl: siteData.siteUrl,
  icon: ParcelIcon,
}

// Convenience alias so callers can render <SiteIcon /> directly.
export const SiteIcon = ParcelIcon
