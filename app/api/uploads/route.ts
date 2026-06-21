import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { requireSession } from "@/lib/api-auth"
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  UPLOAD_FOLDERS,
  UPLOADS_BUCKET,
  getStorageClient,
  type UploadFolder,
} from "@/lib/supabase/storage"

// Accepts a single image file (multipart/form-data) and stores it in Supabase
// Storage, returning the public URL. Any signed-in user may upload, since this
// backs avatars, delivery proof, and pickup-location photos.
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
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
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

  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : (file.type.split("/").pop() ?? "bin")
  const path = `${folderRaw}/${me.userId}/${randomUUID()}.${ext}`

  let supabase
  try {
    supabase = getStorageClient()
  } catch {
    return NextResponse.json(
      { error: "Image uploads are not configured on the server." },
      { status: 500 },
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error } = await supabase.storage
    .from(UPLOADS_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    })

  if (error) {
    return NextResponse.json(
      { error: "Could not upload the image. Please try again." },
      { status: 500 },
    )
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(UPLOADS_BUCKET).getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
