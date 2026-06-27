/**
 * scripts/check-schema-sync.ts
 *
 * Ensures schema.postgres.ts and schema.turso.ts stay in sync by comparing
 * table names, column names, const arrays, and foreign-key references.
 * Dialect-specific differences (boolean vs integer, doublePrecision vs real,
 * timestamp vs text, jsonb vs text json, array vs json) are expected and
 * ignored.
 *
 * Usage:  npx tsx scripts/check-schema-sync.ts
 * Exit 0 when schemas are in sync, exit 1 when drift is detected.
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(import.meta.dirname, "..")
const PG_PATH = resolve(ROOT, "lib/db/schema.postgres.ts")
const TURSO_PATH = resolve(ROOT, "lib/db/schema.turso.ts")

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------

function readFile(path: string): string {
  return readFileSync(path, "utf-8")
}

/** Extract all `export const <name> = pgTable/sqliteTable("sqlName", { … })` */
function extractTables(src: string): Map<string, string[]> {
  const tables = new Map<string, string[]>()
  // Match: export const <varName> = pgTable("sqlName", {
  const tableRe =
    /export\s+const\s+(\w+)\s*=\s*(?:pg|sqlite)Table\(\s*"([^"]+)"\s*,\s*\{/g
  let match: RegExpExecArray | null
  while ((match = tableRe.exec(src))) {
    const _varName = match[1]
    const sqlName = match[2]
    // Find the matching closing `})` for this table definition
    const start = match.index + match[0].length
    const columns = extractColumns(src, start)
    tables.set(sqlName, columns)
  }
  return tables
}

/** Extract column names from a table body starting at `offset`. */
function extractColumns(src: string, offset: number): string[] {
  const cols: string[] = []
  let depth = 1 // we're already inside the opening `{`
  let i = offset
  while (i < src.length && depth > 0) {
    const ch = src[i]
    if (ch === "{") depth++
    else if (ch === "}") {
      depth--
      if (depth === 0) break
    }
    // Match column definitions: `colName: text("sqlName")` or similar
    if (depth === 1) {
      const colMatch = src
        .slice(i)
        .match(
          /^\s*(\w+)\s*:\s*(?:text|integer|boolean|real|doublePrecision|timestamp|jsonb|bigserial|serial|textArray|ts)\s*\(\s*"([^"]+)"/,
        )
      if (colMatch) {
        cols.push(colMatch[2]) // use the SQL column name
        i += colMatch[0].length
        continue
      }
    }
    i++
  }
  return cols
}

/** Extract exported const arrays (e.g. orderStatuses, riderTaskTypes). */
function extractConstArrays(src: string): Map<string, string[]> {
  const arrays = new Map<string, string[]>()
  const re = /export\s+const\s+(\w+)\s*=\s*\[([\s\S]*?)\]\s*as\s+const/g
  let match: RegExpExecArray | null
  while ((match = re.exec(src))) {
    const name = match[1]
    const items = match[2]
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean)
    arrays.set(name, items)
  }
  return arrays
}

/** Extract foreign-key references: `.references(() => <table>.id)` */
function extractForeignKeys(src: string): string[] {
  const fks: string[] = []
  const re = /\.references\(\(\)\s*=>\s*(\w+)\.\w+\)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(src))) {
    fks.push(match[1])
  }
  return fks.sort()
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

interface Drift {
  kind: "tables" | "columns" | "const-arrays" | "foreign-keys"
  entity?: string
  detail: string
}

function compare(pgSrc: string, tursoSrc: string): Drift[] {
  const drifts: Drift[] = []

  // --- Tables ---
  const pgTables = extractTables(pgSrc)
  const tursoTables = extractTables(tursoSrc)

  const pgOnly = [...pgTables.keys()].filter((t) => !tursoTables.has(t))
  const tursoOnly = [...tursoTables.keys()].filter((t) => !pgTables.has(t))

  if (pgOnly.length) {
    drifts.push({
      kind: "tables",
      detail: `Tables in postgres only: ${pgOnly.join(", ")}`,
    })
  }
  if (tursoOnly.length) {
    drifts.push({
      kind: "tables",
      detail: `Tables in turso only: ${tursoOnly.join(", ")}`,
    })
  }

  // --- Columns per shared table ---
  for (const [table, pgCols] of pgTables) {
    const tursoCols = tursoTables.get(table)
    if (!tursoCols) continue

    const pgSet = new Set(pgCols)
    const tursoSet = new Set(tursoCols)

    const colsOnlyPg = [...pgSet].filter((c) => !tursoSet.has(c))
    const colsOnlyTurso = [...tursoSet].filter((c) => !pgSet.has(c))

    if (colsOnlyPg.length) {
      drifts.push({
        kind: "columns",
        entity: table,
        detail: `Columns in postgres only: ${colsOnlyPg.join(", ")}`,
      })
    }
    if (colsOnlyTurso.length) {
      drifts.push({
        kind: "columns",
        entity: table,
        detail: `Columns in turso only: ${colsOnlyTurso.join(", ")}`,
      })
    }
  }

  // --- Const arrays ---
  const pgArrays = extractConstArrays(pgSrc)
  const tursoArrays = extractConstArrays(tursoSrc)

  for (const [name, pgItems] of pgArrays) {
    const tursoItems = tursoArrays.get(name)
    if (!tursoItems) {
      drifts.push({
        kind: "const-arrays",
        entity: name,
        detail: `Array "${name}" exists in postgres only`,
      })
      continue
    }
    if (JSON.stringify(pgItems) !== JSON.stringify(tursoItems)) {
      drifts.push({
        kind: "const-arrays",
        entity: name,
        detail: `Array "${name}" differs: postgres=[${pgItems.join(", ")}] turso=[${tursoItems.join(", ")}]`,
      })
    }
  }
  for (const name of tursoArrays.keys()) {
    if (!pgArrays.has(name)) {
      drifts.push({
        kind: "const-arrays",
        entity: name,
        detail: `Array "${name}" exists in turso only`,
      })
    }
  }

  // --- Foreign keys ---
  const pgFKs = extractForeignKeys(pgSrc)
  const tursoFKs = extractForeignKeys(tursoSrc)

  if (JSON.stringify(pgFKs) !== JSON.stringify(tursoFKs)) {
    drifts.push({
      kind: "foreign-keys",
      detail: `Foreign-key references differ: postgres=[${pgFKs.join(", ")}] turso=[${tursoFKs.join(", ")}]`,
    })
  }

  return drifts
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const pgSrc = readFile(PG_PATH)
const tursoSrc = readFile(TURSO_PATH)
const drifts = compare(pgSrc, tursoSrc)

if (drifts.length === 0) {
  console.log("✓ Schemas are in sync")
  process.exit(0)
}

console.error(
  `\n✗ Schema drift detected (${drifts.length} issue${drifts.length > 1 ? "s" : ""}):\n`,
)
for (const d of drifts) {
  const prefix = d.entity ? `[${d.kind}:${d.entity}]` : `[${d.kind}]`
  console.error(`  ${prefix} ${d.detail}`)
}
console.error("")
process.exit(1)
