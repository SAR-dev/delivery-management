"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { usePlatform } from "@/lib/platform-context"
import type { User } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { RoleBadge } from "@/components/badge/role-badge"
import { CreateAccountDialog } from "@/components/dialog/create-account-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { DataTable, type DataTableColumn } from "@/components/data-table"

function StatusToggle({
  user,
  onToggle,
}: {
  user: User
  onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={user.isActive}
        onCheckedChange={onToggle}
        aria-label={`Toggle active state for ${user.name}`}
      />
      <span className="text-muted-foreground text-xs">
        {user.isActive ? "Active" : "Disabled"}
      </span>
    </div>
  )
}

export default function TeamPage() {
  const router = useRouter()
  const {
    currentUser,
    team,
    warehouses,
    toggleAccountActive,
    togglePricingPermission,
  } = usePlatform()

  // Managing Admin accounts is a Super Admin-only capability. Admins who reach
  // this route directly are redirected back to their console overview.
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN"
  useEffect(() => {
    if (currentUser && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [currentUser, isSuperAdmin, router])

  function warehouseName(id?: string | null) {
    if (!id) return "Unassigned"
    return warehouses.find((w) => w.id === id)?.name ?? "Unknown"
  }

  const admins = team.filter((u) => u.role === "ADMIN")
  const warehouseAdmins = team.filter((u) => u.role === "WAREHOUSE_ADMIN")

  function handleToggleActive(user: User) {
    toggleAccountActive(user.id)
    toast.success(`${user.name} ${user.isActive ? "disabled" : "enabled"}.`)
  }

  function handleTogglePricing(user: User) {
    togglePricingPermission(user.id)
    toast.success(
      `${user.name} ${user.canManagePricing ? "can no longer" : "can now"} manage pricing.`,
    )
  }

  const nameColumn: DataTableColumn<User> = {
    id: "name",
    header: "Name",
    sortable: true,
    sortValue: (u) => u.name,
    cell: (u) => (
      <div className="flex flex-col">
        <span className="font-medium">{u.name}</span>
        <span className="text-muted-foreground text-xs sm:hidden">
          {u.email}
        </span>
      </div>
    ),
  }

  const contactColumn: DataTableColumn<User> = {
    id: "contact",
    header: "Contact",
    sortable: true,
    sortValue: (u) => u.email,
    headClassName: "hidden sm:table-cell",
    cellClassName: "hidden sm:table-cell",
    cell: (u) => (
      <div className="flex flex-col text-sm">
        <span>{u.email}</span>
        <span className="text-muted-foreground text-xs">{u.phone}</span>
      </div>
    ),
  }

  const statusColumn: DataTableColumn<User> = {
    id: "status",
    header: "Status",
    align: "right",
    sortable: true,
    sortValue: (u) => (u.isActive ? 1 : 0),
    cell: (u) => (
      <div className="flex justify-end">
        <StatusToggle user={u} onToggle={() => handleToggleActive(u)} />
      </div>
    ),
  }

  const adminColumns: DataTableColumn<User>[] = [
    nameColumn,
    contactColumn,
    {
      id: "pricing",
      header: "Pricing access",
      sortable: true,
      sortValue: (u) => (u.canManagePricing ? 1 : 0),
      cell: (u) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={Boolean(u.canManagePricing)}
            onCheckedChange={() => handleTogglePricing(u)}
            aria-label={`Toggle pricing permission for ${u.name}`}
          />
          <span className="text-muted-foreground text-xs">
            {u.canManagePricing ? "Granted" : "Denied"}
          </span>
        </div>
      ),
    },
    statusColumn,
  ]

  const warehouseColumns: DataTableColumn<User>[] = [
    nameColumn,
    contactColumn,
    {
      id: "warehouse",
      header: "Warehouse",
      sortable: true,
      sortValue: (u) => warehouseName(u.warehouseId),
      cell: (u) => (
        <Badge variant="secondary" className="font-normal">
          {warehouseName(u.warehouseId)}
        </Badge>
      ),
    },
    statusColumn,
  ]

  if (!isSuperAdmin) return null

  return (
    <>
      <PageHeader
        title="Team & admins"
        description="Create and manage Admin and Warehouse Admin accounts, and control who can set merchant pricing."
      >
        <CreateAccountDialog />
      </PageHeader>

      <Tabs defaultValue="admins">
        <TabsList>
          <TabsTrigger value="admins">Admins ({admins.length})</TabsTrigger>
          <TabsTrigger value="warehouse">
            Warehouse Admins ({warehouseAdmins.length})
          </TabsTrigger>
        </TabsList>

        {/* Admins */}
        <TabsContent value="admins" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={adminColumns}
                data={admins}
                getRowKey={(u) => u.id}
                initialSortId="name"
                emptyMessage="No Admin accounts yet. Create one to get started."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warehouse Admins */}
        <TabsContent value="warehouse" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={warehouseColumns}
                data={warehouseAdmins}
                getRowKey={(u) => u.id}
                initialSortId="name"
                emptyMessage="No Warehouse Admin accounts yet."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-muted-foreground mt-4 flex items-center gap-2 text-xs">
        <RoleBadge role="ADMIN" />
        Admins approve orders and assign pickup riders.
        <RoleBadge role="WAREHOUSE_ADMIN" />
        Warehouse Admins manage in-transit inventory and delivery riders.
      </p>
    </>
  )
}
