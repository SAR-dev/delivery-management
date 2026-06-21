"use client"

import type { UploadFolder } from "@/lib/supabase/storage"

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

// Uploads a single image file to our /api/uploads route, which stores it in
// Supabase Storage and returns the public URL.
export async function uploadImage(
  file: File,
  folder: UploadFolder,
): Promise<UploadResult> {
  const body = new FormData()
  body.append("file", file)
  body.append("folder", folder)

  let res: Response
  try {
    res = await fetch("/api/uploads", { method: "POST", body })
  } catch {
    return { ok: false, error: "Network error while uploading. Try again." }
  }

  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.url) {
    return { ok: false, error: data?.error ?? "Could not upload the image." }
  }
  return { ok: true, url: data.url }
}
