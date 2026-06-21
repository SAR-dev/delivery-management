import { createClient } from "@supabase/supabase-js"

// Server-only Supabase client used exclusively for Storage uploads.
// This app authenticates users with Better Auth (not Supabase Auth), so all
// uploads go through our own API routes, which authorize the request with the
// Better Auth session and then use the service-role key to write to Storage.
// The service-role key must NEVER be exposed to the browser.

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const UPLOADS_BUCKET = "uploads"

export function getStorageClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase storage is not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
    )
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// Allowed image content types, mirrored on the bucket itself.
export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
] as const

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5MB

// Folders we allow callers to upload into, so a stray value can't be used to
// scatter files across arbitrary paths.
export const UPLOAD_FOLDERS = ["avatars", "delivery-proofs", "pickups"] as const
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number]
