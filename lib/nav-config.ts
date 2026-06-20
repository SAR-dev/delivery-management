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
  ShieldCheck,
  Warehouse as WarehouseIcon,
  type LucideIcon,
} from "lucide-react"

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

export const ADMIN_SIDEBAR: SidebarConfig = {
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
    { href: "/dashboard/team", label: "Team Accounts", icon: Users },
    { href: "/dashboard/merchants", label: "Merchants", icon: Store },
    { href: "/dashboard/payouts", label: "Payouts", icon: Wallet },
  ],
  mobileItems: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/orders", label: "Orders", icon: Package },
    { href: "/dashboard/security-money", label: "Security Money", icon: Coins },
    { href: "/dashboard/team", label: "Team Accounts", icon: Users },
    { href: "/dashboard/merchants", label: "Merchants", icon: Store },
  ],
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
  ],
}

export const RIDER_SIDEBAR: SidebarConfig = {
  brandIcon: Bike,
  roleLabel: "Rider",
  items: [
    { href: "/rider", label: "Pickup queue", icon: PackageCheck, exact: true },
    {
      href: "/rider/deliveries",
      label: "Delivery queue",
      icon: Truck,
      exact: true,
    },
  ],
}
