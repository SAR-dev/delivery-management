"use client"

import { toast } from "sonner"
import { usePlatform } from "@/lib/platform-context"
import { WAREHOUSES } from "@/lib/mock-data"
import type { User } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { RoleBadge } from "@/components/role-badge"
import { CreateAccountDialog } from "@/components/create-account-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function warehouseName(id?: string | null) {
  if (!id) return "Unassigned"
  return WAREHOUSES.find((w) => w.id === id)?.name ?? "Unknown"
}

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
      <span className="text-xs text-muted-foreground">
        {user.isActive ? "Active" : "Disabled"}
      </span>
    </div>
  )
}

export default function TeamPage() {
  const { team, toggleAccountActive, togglePricingPermission } = usePlatform()

  const admins = team.filter((u) => u.role === "ADMIN")
  const warehouseAdmins = team.filter((u) => u.role === "WAREHOUSE_ADMIN")

  function handleToggleActive(user: User) {
    toggleAccountActive(user.id)
    toast.success(
      `${user.name} ${user.isActive ? "disabled" : "enabled"}.`,
    )
  }

  function handleTogglePricing(user: User) {
    togglePricingPermission(user.id)
    toast.success(
      `${user.name} ${user.canManagePricing ? "can no longer" : "can now"} manage pricing.`,
    )
  }

  return (
    <>
      <PageHeader
        title="Team Accounts"
        description="Create and manage Admin and Warehouse Admin accounts. Grant Admins permission to manage merchant pricing."
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Contact
                    </TableHead>
                    <TableHead>Pricing access</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No Admin accounts yet. Create one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    admins.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground sm:hidden">
                              {user.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex flex-col text-sm">
                            <span>{user.email}</span>
                            <span className="text-xs text-muted-foreground">
                              {user.phone}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={Boolean(user.canManagePricing)}
                              onCheckedChange={() => handleTogglePricing(user)}
                              aria-label={`Toggle pricing permission for ${user.name}`}
                            />
                            <span className="text-xs text-muted-foreground">
                              {user.canManagePricing ? "Granted" : "Denied"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <StatusToggle
                              user={user}
                              onToggle={() => handleToggleActive(user)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warehouse Admins */}
        <TabsContent value="warehouse" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Contact
                    </TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouseAdmins.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No Warehouse Admin accounts yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    warehouseAdmins.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground sm:hidden">
                              {user.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex flex-col text-sm">
                            <span>{user.email}</span>
                            <span className="text-xs text-muted-foreground">
                              {user.phone}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {warehouseName(user.warehouseId)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <StatusToggle
                              user={user}
                              onToggle={() => handleToggleActive(user)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <RoleBadge role="ADMIN" />
        Admins approve orders and assign pickup riders.
        <RoleBadge role="WAREHOUSE_ADMIN" />
        Warehouse Admins manage in-transit inventory and delivery riders.
      </p>
    </>
  )
}
