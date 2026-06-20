"use client"

import { useMemo, useState } from "react"
import {
  ExternalLink,
  ImageIcon,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Store,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { usePlatform } from "@/lib/platform-context"
import type { PickupLocation } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface FormState {
  label: string
  address: string
  mapLink: string
  imageLinks: string[]
}

function emptyForm(): FormState {
  return { label: "", address: "", mapLink: "", imageLinks: [""] }
}

function formFromLocation(loc: PickupLocation): FormState {
  const links = (loc.imageLinks ?? []).filter((l) => l.trim().length > 0)
  return {
    label: loc.label,
    address: loc.address,
    mapLink: loc.mapLink ?? "",
    imageLinks: links.length > 0 ? links : [""],
  }
}

export function PickupLocationsManager({ merchantId }: { merchantId: string }) {
  const {
    pickupLocations,
    createPickupLocation,
    updatePickupLocation,
    deletePickupLocation,
  } = usePlatform()

  const shops = useMemo(
    () => pickupLocations.filter((p) => p.merchantId === merchantId),
    [pickupLocations, merchantId],
  )

  // editing === null && dialogOpen means "adding"; editing set means "editing".
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PickupLocation | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<PickupLocation | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openAdd() {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  function openEdit(loc: PickupLocation) {
    setEditing(loc)
    setForm(formFromLocation(loc))
    setDialogOpen(true)
  }

  function updateImageLink(index: number, value: string) {
    setForm((prev) => ({
      ...prev,
      imageLinks: prev.imageLinks.map((l, i) => (i === index ? value : l)),
    }))
  }

  function addImageLink() {
    setForm((prev) => ({ ...prev, imageLinks: [...prev.imageLinks, ""] }))
  }

  function removeImageLink(index: number) {
    setForm((prev) => ({
      ...prev,
      imageLinks:
        prev.imageLinks.length === 1
          ? [""]
          : prev.imageLinks.filter((_, i) => i !== index),
    }))
  }

  const trimmedLabel = form.label.trim()
  const trimmedAddress = form.address.trim()
  const formValid = trimmedLabel.length > 0 && trimmedAddress.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formValid) return
    const payload = {
      label: trimmedLabel,
      address: trimmedAddress,
      mapLink: form.mapLink.trim() || undefined,
      imageLinks: form.imageLinks
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
    }
    setSaving(true)
    try {
      const result = editing
        ? await updatePickupLocation(editing.id, payload)
        : await createPickupLocation(payload)
      if (result.ok) {
        toast.success(editing ? "Shop updated." : "Shop added.")
        setDialogOpen(false)
      } else {
        toast.error(result.error ?? "Could not save the shop.")
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const result = await deletePickupLocation(deleteTarget.id)
      if (result.ok) {
        toast.success("Shop removed.")
        setDeleteTarget(null)
      } else {
        toast.error(result.error ?? "Could not remove the shop.")
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="size-4" />
            Pickup locations
          </CardTitle>
          <CardDescription>
            Register your shops with a map link and photos so riders can find
            them quickly.
          </CardDescription>
          <CardAction>
            <Button type="button" size="sm" onClick={openAdd}>
              <Plus className="size-3.5" />
              Add shop
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {shops.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed py-10 text-center text-sm">
              No shops yet. Add your first pickup location to get started.
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {shops.map((shop) => {
                const imageCount = (shop.imageLinks ?? []).filter(
                  (l) => l.trim().length > 0,
                ).length
                const mapLink = shop.mapLink?.trim() || null
                return (
                  <li
                    key={shop.id}
                    className="border-border flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium">{shop.label}</span>
                      <span className="text-muted-foreground flex items-start gap-1.5 text-sm leading-snug">
                        <MapPin className="mt-0.5 size-3.5 shrink-0" />
                        {shop.address}
                      </span>
                      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        {mapLink ? (
                          <a
                            href={mapLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary inline-flex items-center gap-1 hover:underline"
                          >
                            <ExternalLink className="size-3" />
                            Map link
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" />
                            No map link
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="size-3" />
                          {imageCount > 0
                            ? `${imageCount} photo${imageCount > 1 ? "s" : ""}`
                            : "No photos"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(shop)}
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(shop)}
                        aria-label={`Remove ${shop.label}`}
                      >
                        <Trash2 className="text-muted-foreground size-4" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Add / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit shop" : "Add shop"}</DialogTitle>
              <DialogDescription>
                Provide the shop name and address, plus an optional map link and
                location photos.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              <Label htmlFor="shop-label">Shop name</Label>
              <Input
                id="shop-label"
                value={form.label}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, label: e.target.value }))
                }
                placeholder="e.g. Gulshan branch"
                aria-invalid={trimmedLabel.length === 0}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="shop-address">Address</Label>
              <Textarea
                id="shop-address"
                value={form.address}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="Street, area, city"
                rows={3}
                aria-invalid={trimmedAddress.length === 0}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="shop-map">
                <span className="flex items-center gap-1.5">
                  <MapPin className="text-muted-foreground size-3.5" />
                  Map link
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </span>
              </Label>
              <Input
                id="shop-map"
                type="url"
                value={form.mapLink}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, mapLink: e.target.value }))
                }
                placeholder="https://maps.google.com/?q=..."
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="text-muted-foreground size-3.5" />
                  Photo links
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </span>
              </Label>
              <div className="flex flex-col gap-2">
                {form.imageLinks.map((link, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="url"
                      value={link}
                      onChange={(e) => updateImageLink(index, e.target.value)}
                      placeholder="https://example.com/shop-photo.jpg"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeImageLink(index)}
                      aria-label={`Remove photo link ${index + 1}`}
                      disabled={
                        form.imageLinks.length === 1 && link.trim() === ""
                      }
                    >
                      <Trash2 className="text-muted-foreground size-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={addImageLink}
              >
                <Plus className="size-3.5" />
                Add photo link
              </Button>
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={saving || !formValid}>
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving
                  </>
                ) : editing ? (
                  "Save shop"
                ) : (
                  "Add shop"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove shop?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `"${deleteTarget.label}" will be removed from your pickup locations. This cannot be undone.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Removing
                </>
              ) : (
                "Remove shop"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
