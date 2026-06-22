"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { useSWRConfig } from "swr"
import type { User, Role } from "@/lib/types"
import { authClient } from "@/lib/auth-client"

// Where each role lands after login.
export function homeForRole(role: Role): string {
  if (role === "MERCHANT") return "/merchant"
  if (role === "RIDER") return "/rider"
  if (role === "WAREHOUSE_ADMIN") return "/warehouse"
  return "/dashboard"
}

interface AuthContextValue {
  currentUser: User | null
  // True once the session bootstrap (getSession + /api/users/me) has finished.
  isReady: boolean
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; user?: User; error?: string }>
  logout: () => Promise<void>
  // Update the signed-in user's own display name.
  updateProfileName: (name: string) => Promise<{ ok: boolean; error?: string }>
  // Set or clear (null) the signed-in user's avatar image.
  updateProfileImage: (
    image: string | null,
  ) => Promise<{ ok: boolean; error?: string }>
  // Change the signed-in user's password (verifies the current one).
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ ok: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Restore a real Better Auth session on mount, then hydrate the full
  // app-level User (role + merchant/rider/warehouse linkage) from
  // /api/users/me, which joins the `profile` table for us.
  useEffect(() => {
    async function bootstrap() {
      try {
        const { data: session } = await authClient.getSession()
        if (session) {
          const res = await fetch("/api/users/me")
          if (res.ok) {
            const user = await res.json()
            setCurrentUser(user)
          }
        }
      } finally {
        setIsReady(true)
      }
    }
    bootstrap()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase()
    const { data, error } = await authClient.signIn.email({
      email: normalized,
      password,
    })

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "Invalid email or password.",
      }
    }

    const res = await fetch("/api/users/me")
    if (!res.ok) {
      return { ok: false, error: "Could not load your account." }
    }
    const user: User = await res.json()

    if (!user.isActive) {
      // Sign the Better Auth session back out — we don't want a session
      // cookie sitting around for a deactivated account.
      await authClient.signOut()
      return { ok: false, error: "This account has been deactivated." }
    }

    setCurrentUser(user)
    return { ok: true, user }
  }, [])

  const logout = useCallback(async () => {
    await authClient.signOut()
    setCurrentUser(null)
    // Drop every cached resource so the next user that signs in on this device
    // never sees stale data from the previous session.
    await mutate(() => true, undefined, { revalidate: false })
    router.push("/login")
  }, [router, mutate])

  const updateProfileName = useCallback<AuthContextValue["updateProfileName"]>(
    async (name) => {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error ?? "Could not update your name.",
        }
      }
      setCurrentUser(data)
      return { ok: true }
    },
    [],
  )

  const updateProfileImage = useCallback<
    AuthContextValue["updateProfileImage"]
  >(async (image) => {
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error ?? "Could not update your photo.",
      }
    }
    setCurrentUser(data)
    return { ok: true }
  }, [])

  const changePassword = useCallback<AuthContextValue["changePassword"]>(
    async (currentPassword, newPassword) => {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        // Keep this session alive but sign out everywhere else for safety.
        revokeOtherSessions: true,
      })
      if (error) {
        return {
          ok: false,
          error: error.message ?? "Could not change your password.",
        }
      }
      return { ok: true }
    },
    [],
  )

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isReady,
        login,
        logout,
        updateProfileName,
        updateProfileImage,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return ctx
}
