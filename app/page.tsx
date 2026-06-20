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
    <div className="bg-background flex min-h-screen items-center justify-center">
      <Loader2 className="text-muted-foreground size-6 animate-spin" />
    </div>
  )
}
