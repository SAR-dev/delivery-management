"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useAuth } from "@/features/account/hooks/use-auth"
import { useTeam } from "@/features/team/hooks/use-team"
import { useWarehouses } from "@/features/warehouses/hooks/use-warehouses"
import type { User } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { pageContent } from "@/config/content"
import { RoleBadge } from "@/components/role-badge"
import { CreateAccountDialog } from "@/features/team/dialogs/create-account-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable, type DataTableColumn } from "@/components/data-table"

// Sentinel value for the "Unassigned" option, since the Select cannot use an
// empty string as an item value.
const UNASSIGNED = "__unassigned__"

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

function WarehouseSelect({
  user,
  warehouses,
  onChange,
}: {
  user: User
  warehouses: { id: string; name: string; city: string }[]
  onChange: (warehouseId: string | null) => void
}) {
  return (
    <Select
      value={user.warehouseId ?? UNASSIGNED}
      onValueChange={(v) => onChange(v === UNASSIGNED ? null : v)}
    >
      <SelectTrigger
        className="w-fit min-w-44"
        aria-label={`Assigned warehouse for ${user.name}`}
      >
        <SelectValue>
          {(value) => {
            if (!value || value === UNASSIGNED) return "Unassigned"
            const w = warehouses.find((x) => x.id === value)
            return w ? `${w.name} \u00B7 ${w.city}` : "Unknown"
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
        {warehouses.map((w) => (
          <SelectItem key={w.id} value={w.id}>
            {w.name} {"\u00B7"} {w.city}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default function TeamPage() {
  const router = useRouter()
  const { currentUser } = useAuth()
  const {
    team,
    allTeam,
    total,
    page: _page,
    setPage,
    limit: _limit,
    setLimit,
    query,
    setQuery,
    role: _role,
    setRole,
    toggleAccountActive,
    togglePricingPermission,
    updateAccountWarehouse,
    isLoading,
  } = useTeam()
  const { warehouses } = useWarehouses()

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN"
  useEffect(() => {
    if (currentUser && !isSuperAdmin) {
      router.replace("/dashboard")
    }
  }, [currentUser, isSuperAdmin, router])

  useEffect(() => {
    setRole("ADMIN")
  }, [setRole])

  const TAB_ROLES: Record<string, string | undefined> = {
    admins: "ADMIN",
    warehouse: "WAREHOUSE_ADMIN",
  }

  function handleTabChange(value: string) {
    setRole(TAB_ROLES[value])
    setPage(1)
  }

  function warehouseName(id?: string | null) {
    if (!id) return "Unassigned"
    return warehouses.find((w) => w.id === id)?.name ?? "Unknown"
  }

  const totalAdmins = allTeam.filter((u) => u.role === "ADMIN").length
  const totalWarehouseAdmins = allTeam.filter(
    (u) => u.role === "WAREHOUSE_ADMIN",
  ).length

  async function handleToggleActive(user: User) {
    await toggleAccountActive(user.id)
    toast.success(`${user.name} ${user.isActive ? "disabled" : "enabled"}.`)
  }

  async function handleTogglePricing(user: User) {
    await togglePricingPermission(user.id)
    toast.success(
      `${user.name} ${user.canManagePricing ? "can no longer" : "can now"} manage pricing.`,
    )
  }

  async function handleChangeWarehouse(user: User, warehouseId: string | null) {
    if ((user.warehouseId ?? null) === warehouseId) return
    await updateAccountWarehouse(user.id, warehouseId)
    toast.success(
      warehouseId
        ? `${user.name} now manages ${warehouseName(warehouseId)}.`
        : `${user.name} is no longer assigned to a warehouse.`,
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
        <WarehouseSelect
          user={u}
          warehouses={warehouses}
          onChange={(warehouseId) => handleChangeWarehouse(u, warehouseId)}
        />
      ),
    },
    statusColumn,
  ]

  if (!isSuperAdmin) return null

  return (
    <>
      <PageHeader
        title={pageContent.dashboard.team.title}
        description={pageContent.dashboard.team.description}
      >
        <CreateAccountDialog />
      </PageHeader>

      <Tabs defaultValue="admins" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="admins">Admins ({totalAdmins})</TabsTrigger>
          <TabsTrigger value="warehouse">
            Warehouse Admins ({totalWarehouseAdmins})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <DataTable
                id="dashboard-team-admins"
                searchable
                columns={adminColumns}
                data={team}
                getRowKey={(u) => u.id}
                initialSortId="name"
                emptyMessage="No Admin accounts yet. Create one to get started."
                loading={isLoading}
                serverPaginated
                total={total}
                query={query}
                onQueryChange={setQuery}
                onPageChange={(p, l) => {
                  setPage(p)
                  setLimit(l)
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warehouse" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <DataTable
                id="dashboard-team-warehouse-admins"
                searchable
                columns={warehouseColumns}
                data={team}
                getRowKey={(u) => u.id}
                initialSortId="name"
                emptyMessage="No Warehouse Admin accounts yet."
                loading={isLoading}
                serverPaginated
                total={total}
                query={query}
                onQueryChange={setQuery}
                onPageChange={(p, l) => {
                  setPage(p)
                  setLimit(l)
                }}
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
