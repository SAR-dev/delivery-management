"use client"

import { useState } from "react"
import { Loader2, Lock, UserRound } from "lucide-react"
import { toast } from "sonner"
import { usePlatform } from "@/lib/platform-context"
import { initials } from "@/lib/utils"
import { PageHeader } from "@/components/page-header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  const { currentUser, updateProfileName, changePassword } = usePlatform()

  const [name, setName] = useState(currentUser?.name ?? "")
  const [savingName, setSavingName] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

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
        {/* Avatar — placeholder only; upload wired up later. */}
        <Card>
          <CardHeader>
            <CardTitle>Avatar</CardTitle>
            <CardDescription>
              Upload a profile photo. This is coming soon.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Avatar size="lg">
              <AvatarFallback className="text-sm font-medium">
                {currentUser ? initials(currentUser.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <Button type="button" variant="outline" size="sm" disabled>
                Upload photo
              </Button>
              <p className="text-muted-foreground text-xs">
                PNG or JPG, up to 2MB.
              </p>
            </div>
          </CardContent>
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
