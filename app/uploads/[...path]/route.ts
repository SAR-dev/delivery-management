import { readFile, stat } from "node:fs/promises"
import { extname, join, normalize, sep } from "node:path"
import { NextResponse } from "next/server"
import { LOCAL_UPLOADS_DIR } from "@/lib/storage/local"

// Serves files written by lib/storage/local.ts. Anyone with the URL can view
// the image (avatars, delivery proofs, and pickup photos are all shown across
// roles — merchant, rider, warehouse, admin — so reads are intentionally not
// gated behind a session check). Writes still require auth, enforced in
// app/api/uploads/route.ts.

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params

  // Reject empty paths or any segment that could escape LOCAL_UPLOADS_DIR.
  if (
    segments.length === 0 ||
    segments.some((s) => s === ".." || s === "." || s.includes(sep))
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const relativePath = segments.join("/")
  const targetPath = normalize(join(LOCAL_UPLOADS_DIR, relativePath))
  const root = normalize(LOCAL_UPLOADS_DIR + sep)
  if (!targetPath.startsWith(root)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const fileStat = await stat(targetPath)
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const buffer = await readFile(targetPath)
    const contentType =
      CONTENT_TYPES[extname(targetPath).toLowerCase()] ??
      "application/octet-stream"

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        // Uploaded files are immutable (random UUID filenames), so cache
        // aggressively.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
