"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { usePlatform, homeForRole } from "@/lib/platform-context"

export default function Page() {
  const router = useRouter()
  const { currentUser, isReady } = usePlatform()

  useEffect(() => {
    if (!isReady) return
    if (currentUser) {
      router.replace(homeForRole(currentUser.role))
    } else {
      router.replace("/login")
    }
  }, [isReady, currentUser, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}
