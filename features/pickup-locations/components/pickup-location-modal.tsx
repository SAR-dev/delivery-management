"use client"

import { Store, MapPin, ExternalLink, ImageOff } from "lucide-react"
import type { PickupLocation } from "@/lib/types"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ImageZoom } from "@/components/image-zoom"

interface PickupLocationModalProps {
  location: Pick<
    PickupLocation,
    "label" | "address" | "mapLink" | "imageLinks"
  > | null
  /**
   * The pickup-location content rendered inline in the table/detail surface.
   * The whole node becomes the clickable trigger that opens the detail modal.
   */
  children: React.ReactNode
  className?: string
}

/**
 * Wraps an inline pickup-location display and, on click, opens a modal showing
 * the shop label, address, and any merchant-supplied map link and photos so a
 * rider can find the shop quickly.
 */
export function PickupLocationModal({
  location,
  children,
  className,
}: PickupLocationModalProps) {
  const imageLinks = (location?.imageLinks ?? []).filter(
    (link) => link.trim().length > 0,
  )
  const mapLink = location?.mapLink?.trim() || null

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className={
              "hover:text-foreground cursor-pointer text-left transition-colors outline-none " +
              (className ?? "")
            }
            title="View pickup location details"
          />
        }
      >
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pickup location</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2.5">
            <Store className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">
                {location?.label || (
                  <span className="text-muted-foreground/60 font-normal italic">
                    No shop name
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <span className="text-muted-foreground text-sm leading-relaxed">
              {location?.address || (
                <span className="text-muted-foreground/60 italic">
                  No address provided
                </span>
              )}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Map link
            </span>
            {mapLink ? (
              <a
                href={mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex w-fit items-center gap-1.5 text-sm break-all hover:underline"
              >
                <ExternalLink className="size-3.5 shrink-0" />
                Open in maps
              </a>
            ) : (
              <span className="text-muted-foreground/60 text-sm italic">
                No map link provided.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Photos {imageLinks.length > 0 ? `(${imageLinks.length})` : ""}
            </span>
            {imageLinks.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {imageLinks.map((link, i) => (
                  <ImageZoom
                    key={i}
                    src={link}
                    alt={`Pickup location reference ${i + 1}`}
                    className="size-full object-cover transition-transform group-hover:scale-105"
                  />
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground/60 inline-flex items-center gap-1.5 text-sm italic">
                <ImageOff className="size-3.5" />
                No photos provided.
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
