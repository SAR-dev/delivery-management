"use client"

import { useState } from "react"
import { Loader2, Lock, Table2, UserRound } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/features/account/hooks/use-auth"
import { initials } from "@/lib/utils"
import {
  DEFAULT_TABLE_ROWS_PER_PAGE,
  MAX_TABLE_ROWS_PER_PAGE,
} from "@/lib/constants"
import { PageHeader } from "@/components/page-header"
import { ImageUpload } from "@/components/image-upload"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AccountSettings() {
  const {
    currentUser,
    updateProfileName,
    updateProfileImage,
    changePassword,
    updateTableRowsPerPage,
  } = useAuth()

  const [name, setName] = useState(currentUser?.name ?? "")
  const [savingName, setSavingName] = useState(false)
  const [savingImage, setSavingImage] = useState(false)

  async function handleImageChange(url: string | null) {
    setSavingImage(true)
    try {
      const result = await updateProfileImage(url)
      if (result.ok) {
        toast.success(url ? "Profile photo updated." : "Profile photo removed.")
      } else {
        toast.error(result.error ?? "Could not update your photo.")
      }
    } finally {
      setSavingImage(false)
    }
  }

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  const [rowsPerPage, setRowsPerPage] = useState(
    String(currentUser?.tableRowsPerPage ?? DEFAULT_TABLE_ROWS_PER_PAGE),
  )
  const [savingRowsPerPage, setSavingRowsPerPage] = useState(false)

  const rowsPerPageNum = Number.parseInt(rowsPerPage, 10)
  const rowsPerPageInvalid =
    !Number.isInteger(rowsPerPageNum) ||
    rowsPerPageNum < 1 ||
    rowsPerPageNum > MAX_TABLE_ROWS_PER_PAGE
  const rowsPerPageUnchanged =
    !rowsPerPageInvalid &&
    rowsPerPageNum ===
      (currentUser?.tableRowsPerPage ?? DEFAULT_TABLE_ROWS_PER_PAGE)

  async function handleRowsPerPageSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rowsPerPageInvalid || rowsPerPageUnchanged) return
    setSavingRowsPerPage(true)
    try {
      const result = await updateTableRowsPerPage(rowsPerPageNum)
      if (result.ok) {
        toast.success("Rows per page updated.")
      } else {
        toast.error(result.error ?? "Could not update rows per page.")
      }
    } finally {
      setSavingRowsPerPage(false)
    }
  }

  const trimmedName = name.trim()
  const nameUnchanged = trimmedName === (currentUser?.name ?? "")
  const nameInvalid = trimmedName.length === 0

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (nameInvalid || nameUnchanged) return
    setSavingName(true)
    try {
      const result = await updateProfileName(trimmedName)
      if (result.ok) {
        toast.success("Your name has been updated.")
      } else {
        toast.error(result.error ?? "Could not update your name.")
      }
    } finally {
      setSavingName(false)
    }
  }

  const passwordTooShort = newPassword.length > 0 && newPassword.length < 8
  const passwordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword
  const passwordFormValid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!passwordFormValid) return
    setSavingPassword(true)
    try {
      const result = await changePassword(currentPassword, newPassword)
      if (result.ok) {
        toast.success("Your password has been changed.")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        toast.error(result.error ?? "Could not change your password.")
      }
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Account settings"
        description="Manage your personal details and keep your account secure."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile name */}
        <Card>
          <form onSubmit={handleNameSubmit} className="contents">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-4" />
                Profile
              </CardTitle>
              <CardDescription>
                Your name is shown across the platform and on your activity.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="account-name">Full name</Label>
                <Input
                  id="account-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="account-email">Email</Label>
                <Input
                  id="account-email"
                  value={currentUser?.email ?? ""}
                  disabled
                  readOnly
                />
                <p className="text-muted-foreground text-xs">
                  Your sign-in email cannot be changed here.
                </p>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                type="submit"
                disabled={savingName || nameInvalid || nameUnchanged}
              >
                {savingName ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
        {/* Avatar */}
        <Card>
          <CardHeader>
            <CardTitle>Avatar</CardTitle>
            <CardDescription>
              Upload a profile photo shown next to your name across the
              platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Avatar size="lg">
              {currentUser?.image ? (
                <AvatarImage
                  src={currentUser.image || "/placeholder.svg"}
                  alt={currentUser.name}
                />
              ) : null}
              <AvatarFallback className="text-sm font-medium">
                {currentUser ? initials(currentUser.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <ImageUpload
              value={currentUser?.image ?? null}
              onChange={handleImageChange}
              folder="avatars"
              disabled={savingImage}
              label="Upload photo"
              hidePreview
            />
          </CardContent>
        </Card>

        {/* Table rows per page */}
        <Card>
          <form onSubmit={handleRowsPerPageSubmit} className="contents">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table2 className="size-4" />
                Tables
              </CardTitle>
              <CardDescription>
                How many rows show per page on tables across the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Label htmlFor="account-rows-per-page">Rows per page</Label>
              <Input
                id="account-rows-per-page"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_TABLE_ROWS_PER_PAGE}
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(e.target.value)}
                className="max-w-32"
                aria-invalid={rowsPerPageInvalid}
              />
              <p className="text-muted-foreground text-xs">
                Between 1 and {MAX_TABLE_ROWS_PER_PAGE}. Default is{" "}
                {DEFAULT_TABLE_ROWS_PER_PAGE}.
              </p>
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                type="submit"
                disabled={
                  savingRowsPerPage ||
                  rowsPerPageInvalid ||
                  rowsPerPageUnchanged
                }
              >
                {savingRowsPerPage ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Password */}
        <Card className="lg:col-span-2">
          <form onSubmit={handlePasswordSubmit} className="contents">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="size-4" />
                Password
              </CardTitle>
              <CardDescription>
                Use at least 8 characters. Changing it signs you out of other
                devices.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2 sm:col-span-2 sm:max-w-sm">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={passwordTooShort}
                />
                {passwordTooShort ? (
                  <p className="text-destructive text-xs">
                    Must be at least 8 characters.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={passwordMismatch}
                />
                {passwordMismatch ? (
                  <p className="text-destructive text-xs">
                    Passwords do not match.
                  </p>
                ) : null}
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                type="submit"
                disabled={savingPassword || !passwordFormValid}
              >
                {savingPassword ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Updating
                  </>
                ) : (
                  "Update password"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
