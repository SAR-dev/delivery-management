import { fileURLToPath } from "node:url"
import { dirname } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained build (.next/standalone) for small Docker images.
  output: "standalone",
  // Pin the workspace root to this project so Next.js doesn't pick up a
  // stray lockfile elsewhere on the machine (e.g. C:\Users\1142\package-lock.json).
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
