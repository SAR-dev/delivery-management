"use client"

import { ReactNode, useState } from "react"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

// Click any image to open it full-size in a modal. Used everywhere a small
// thumbnail (pickup-proof photos, delivery-proof photos, location reference
// photos, etc.) should be inspectable without leaving the page.
export function ImageZoom({
  src,
  alt = "",
  className,
  children,
  asChild = false,
}: {
  src: string
  alt?: string
  className?: string
  children?: ReactNode
  asChild?: boolean
}) {
  const [open, setOpen] = useState(false)

  function handleError(e: React.SyntheticEvent<HTMLImageElement>) {
    if (e.currentTarget.src.endsWith("/placeholder.svg")) return
    e.currentTarget.src = "/placeholder.svg"
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          asChild ? (
            (children as React.ReactElement)
          ) : (
            <button type="button" className="h-[-webkit-fill-available] w-[-webkit-fill-available] hover:cursor-zoom-in" title={alt || "View image"} />
          )
        }
      >
        {asChild ? undefined : (
          <img
            src={src || "/placeholder.svg"}
            alt={alt}
            className={className}
            onError={handleError}
          />
        )}
      </DialogTrigger>
      <DialogContent className="max-w-screen h-screen w-screen bg-black/80 p-0 border-none flex items-center justify-center">
        <img
          src={src || "/placeholder.svg"}
          alt={alt}
          onError={handleError}
          className="max-h-[90vh] max-w-[90vw] object-contain"
        />
      </DialogContent>
    </Dialog>
  )
}
