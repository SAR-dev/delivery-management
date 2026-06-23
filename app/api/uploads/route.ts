import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { requireSession } from "@/lib/api-auth"
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  UPLOAD_FOLDERS,
  type UploadFolder,
} from "@/lib/storage/config"
import { saveR2File } from "@/lib/storage/r2"

// Accepts a single image file (multipart/form-data) and stores it, returning
// the public URL. Any signed-in user may upload, since this backs avatars,
// delivery proof, and pickup-location photos.
//
// Files are uploaded to Cloudflare R2 (see lib/storage/r2.ts) and served
// directly from R2's public URL — no local disk or Docker volume needed.

export async function POST(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data." },
      { status: 400 },
    )
  }

  const file = formData.get("file")
  const folderRaw = String(formData.get("folder") ?? "avatars")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 })
  }
  if (!UPLOAD_FOLDERS.includes(folderRaw as UploadFolder)) {
    return NextResponse.json({ error: "Invalid folder." }, { status: 400 })
  }
  if (
    !ALLOWED_IMAGE_TYPES.includes(
      file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
    )
  ) {
    return NextResponse.json(
      { error: "Only PNG, JPG, WEBP, or GIF images are allowed." },
      { status: 400 },
    )
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Image must be 5MB or smaller." },
      { status: 400 },
    )
  }

  const rawExt = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : (file.type.split("/").pop() ?? "bin")
  // Strip anything that isn't alphanumeric — defends the local-disk driver
  // against a crafted filename like "x.png/../../etc" turning into a path
  // traversal once interpolated into the storage path below.
  const ext = (rawExt.replace(/[^a-z0-9]/g, "") || "bin").slice(0, 10)
  const path = `${folderRaw}/${me.userId}/${randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const { publicUrl } = await saveR2File(path, buffer, file.type)
    return NextResponse.json({ url: publicUrl })
  } catch {
    return NextResponse.json(
      { error: "Could not upload the image. Please try again." },
      { status: 500 },
    )
  }
}
