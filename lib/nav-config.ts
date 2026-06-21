import {
  LayoutDashboard,
  Coins,
  Users,
  Store,
  Package,
  Wallet,
  PackagePlus,
  Truck,
  AlertTriangle,
  PackageCheck,
  Bike,
  ListChecks,
  ShieldCheck,
  Shield,
  Warehouse as WarehouseIcon,
  UserCog,
  Building2,
  Map as MapIcon,
  type LucideIcon,
} from "lucide-react"
import type { Role } from "@/lib/types"

export interface SidebarNavItem {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

export interface SidebarConfig {
  brandIcon: LucideIcon
  roleLabel: string
  items: SidebarNavItem[]
  // Optional override for the mobile dropdown nav; falls back to `items`.
  mobileItems?: SidebarNavItem[]
}

// Super Admins oversee the whole platform and are the only role that can
// provision Admin / Warehouse Admin accounts (the "Admins" page).
export const SUPER_ADMIN_SIDEBAR: SidebarConfig = {
  brandIcon: ShieldCheck,
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
    { href: "/dashboard/merchants", label: "Merchants", icon: Store },
    { href: "/dashboard/divisions", label: "Divisions", icon: MapIcon },
    {
      href: "/dashboard/warehouses",
      label: "Warehouses",
      icon: WarehouseIcon,
    },
    { href: "/dashboard/payouts", label: "Payouts", icon: Wallet },
    {
      href: "/dashboard/account",
      label: "Account",
      icon: UserCog,
      exact: true,
    },
  ],
  mobileItems: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/orders", label: "Orders", icon: Package },
    { href: "/dashboard/security-money", label: "Security Money", icon: Coins },
    { href: "/dashboard/team", label: "Admins", icon: Users },
    { href: "/dashboard/merchants", label: "Merchants", icon: Store },
    { href: "/dashboard/divisions", label: "Divisions", icon: MapIcon },
    {
      href: "/dashboard/warehouses",
      label: "Warehouses",
      icon: WarehouseIcon,
    },
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
  brandIcon: Shield,
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
  brandIcon: Store,
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
  brandIcon: WarehouseIcon,
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
  brandIcon: Bike,
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
