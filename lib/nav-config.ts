import {
  AlertTriangle,
  Bike,
  Building2,
  Coins,
  LayoutDashboard,
  ListChecks,
  type LucideIcon,
  Mail,
  Map as MapIcon,
  Package,
  PackageCheck,
  PackagePlus,
  ScrollText,
  Store,
  Truck,
  UserCog,
  Users,
  Wallet,
  Warehouse as WarehouseIcon,
} from "lucide-react"
import type { Role } from "@/lib/types"
import { ParcelIcon } from "@/icons/ParcelIcon"

export interface SidebarNavItem {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

export interface SidebarConfig {
  // The brand mark accepts either a Lucide icon or the inline SVG ParcelIcon —
  // both satisfy React.ComponentType<React.SVGProps<SVGSVGElement>>.
  brandIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  roleLabel: string
  items: SidebarNavItem[]
}

// Super Admins oversee the whole platform and are the only role that can
// provision Admin / Warehouse Admin accounts (the "Admins" page).
export const SUPER_ADMIN_SIDEBAR: SidebarConfig = {
  brandIcon: ParcelIcon,
  roleLabel: "Super Admin",
  items: [
    {
      href: "/dashboard",
      label: "Overview",
      icon: LayoutDashboard,
      exact: true,
    },
    { href: "/dashboard/orders", label: "Orders", icon: Package },
    { href: "/dashboard/security-money", label: "Security Money", icon: Coins },
    { href: "/dashboard/team", label: "Admins", icon: Users },
    { href: "/dashboard/riders", label: "Riders", icon: Bike },
    { href: "/dashboard/merchants", label: "Merchants", icon: Store },
    { href: "/dashboard/divisions", label: "Divisions", icon: MapIcon },
    {
      href: "/dashboard/warehouses",
      label: "Warehouses",
      icon: WarehouseIcon,
    },
    { href: "/dashboard/payouts", label: "Payouts", icon: Wallet },
    { href: "/dashboard/audit-logs", label: "Audit Logs", icon: ScrollText },
    { href: "/dashboard/email-logs", label: "Email Logs", icon: Mail },
    {
      href: "/dashboard/account",
      label: "Account",
      icon: UserCog,
      exact: true,
    },
  ],
}

// Admins handle day-to-day operations: order approval, merchant pricing, and
// managing the rider roster (the "Riders" page).
export const ADMIN_SIDEBAR: SidebarConfig = {
  brandIcon: ParcelIcon,
  roleLabel: "Admin",
  items: [
    {
      href: "/dashboard",
      label: "Overview",
      icon: LayoutDashboard,
      exact: true,
    },
    { href: "/dashboard/orders", label: "Orders", icon: Package },
    { href: "/dashboard/riders", label: "Riders", icon: Bike },
    { href: "/dashboard/merchants", label: "Merchants", icon: Store },
    { href: "/dashboard/payouts", label: "Payouts", icon: Wallet },
    { href: "/dashboard/audit-logs", label: "Audit Logs", icon: ScrollText },
    { href: "/dashboard/email-logs", label: "Email Logs", icon: Mail },
    {
      href: "/dashboard/account",
      label: "Account",
      icon: UserCog,
      exact: true,
    },
  ],
}

// Picks the correct console sidebar for the two admin-tier roles. Defaults to
// the Super Admin layout for any other role that reaches the dashboard shell.
export function dashboardSidebarForRole(role: Role | undefined): SidebarConfig {
  return role === "ADMIN" ? ADMIN_SIDEBAR : SUPER_ADMIN_SIDEBAR
}

export const MERCHANT_SIDEBAR: SidebarConfig = {
  brandIcon: ParcelIcon,
  roleLabel: "Merchant",
  items: [
    {
      href: "/merchant",
      label: "Overview",
      icon: LayoutDashboard,
      exact: true,
    },
    { href: "/merchant/orders/new", label: "Create Order", icon: PackagePlus },
    { href: "/merchant/finance", label: "Finance", icon: Wallet },
    {
      href: "/merchant/business",
      label: "Business",
      icon: Building2,
      exact: true,
    },
    {
      href: "/merchant/account",
      label: "Account",
      icon: UserCog,
      exact: true,
    },
  ],
}

export const WAREHOUSE_SIDEBAR: SidebarConfig = {
  brandIcon: ParcelIcon,
  roleLabel: "Warehouse",
  items: [
    {
      href: "/warehouse",
      label: "Intake queue",
      icon: PackagePlus,
      exact: true,
    },
    {
      href: "/warehouse/dispatch",
      label: "Dispatch desk",
      icon: Truck,
      exact: true,
    },
    {
      href: "/warehouse/orders",
      label: "Order progress",
      icon: Package,
      exact: true,
    },
    {
      href: "/warehouse/riders",
      label: "Riders",
      icon: Bike,
      exact: true,
    },
    {
      href: "/warehouse/exceptions",
      label: "Exceptions",
      icon: AlertTriangle,
      exact: true,
    },
    {
      href: "/warehouse/reconciliation",
      label: "COD reconciliation",
      icon: Wallet,
      exact: true,
    },
    {
      href: "/warehouse/account",
      label: "Account",
      icon: UserCog,
      exact: true,
    },
  ],
}

export const RIDER_SIDEBAR: SidebarConfig = {
  brandIcon: ParcelIcon,
  roleLabel: "Rider",
  items: [
    { href: "/rider", label: "To-do", icon: ListChecks, exact: true },
    {
      href: "/rider/pickup",
      label: "Pickup queue",
      icon: PackageCheck,
      exact: true,
    },
    {
      href: "/rider/delivery",
      label: "Delivery queue",
      icon: Truck,
      exact: true,
    },
    {
      href: "/rider/account",
      label: "Account",
      icon: UserCog,
      exact: true,
    },
  ],
}
