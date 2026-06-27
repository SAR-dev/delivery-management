import { requireSession } from "@/lib/api-auth"
import { unauthorized } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { division, merchant, profile } from "@/lib/db/schema"
import {
  paginateResponse,
  parsePagination,
  parseStatusFilter,
} from "@/lib/pagination"
import { merchantRegisterSchema, parseBody } from "@/lib/validation"
import { and, eq, ilike, inArray, or, sql } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const me = await requireSession()
  if (!me) return unauthorized()

  // A merchant only ever sees their own business row — no pagination needed.
  if (me.role === "MERCHANT" && me.merchantId) {
    const rows = await db
      .select()
      .from(merchant)
      .where(eq(merchant.id, me.merchantId))
    return NextResponse.json(paginateResponse(rows, rows.length))
  }

  const { limit, offset } = parsePagination(req)
  const search = new URL(req.url).searchParams.get("q")?.trim()
  let where = search
    ? or(
        ilike(merchant.businessName, `%${search}%`),
        ilike(merchant.ownerName, `%${search}%`),
        ilike(merchant.email, `%${search}%`),
        ilike(merchant.phone, `%${search}%`),
      )
    : undefined

  const statuses = parseStatusFilter(req)
  if (statuses.length > 0) {
    const statusClause = inArray(merchant.status, statuses as any)
    where = where ? and(where, statusClause) : statusClause
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(merchant)
    .where(where)

  let q = db.select().from(merchant).$dynamic()
  if (where) q = q.where(where)
  if (limit !== undefined) q = q.limit(limit)
  if (offset !== undefined) q = q.offset(offset)

  const rows = await q
  return NextResponse.json(paginateResponse(rows, count, limit, offset))
}

export async function POST(req: Request) {
  const parsed = await parseBody(req, merchantRegisterSchema)
  if (parsed.error) return parsed.error
  const {
    businessName,
    ownerName,
    email,
    phone,
    address,
    divisionId,
    password,
  } = parsed.data

  // The merchant's business division must exist and be active.
  const [div] = await db
    .select({ id: division.id })
    .from(division)
    .where(and(eq(division.id, divisionId), eq(division.isActive, true)))
    .limit(1)
  if (!div) {
    return NextResponse.json(
      { error: "Select a valid division." },
      { status: 400 },
    )
  }

  const [newMerchant] = await db
    .insert(merchant)
    .values({
      businessName,
      ownerName,
      email,
      phone,
      address,
      divisionId,
      status: "PENDING",
      baseRate: 0,
      extraRatePerKg: 0,
      freeWeightKg: 1,
      maxWeightKg: 3,
    })
    .returning()

  let created
  try {
    created = await auth.api.createUser({
      body: { name: ownerName, email, password, role: "MERCHANT" as "user" },
    })
  } catch (err) {
    await db.delete(merchant).where(eq(merchant.id, newMerchant.id))
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not create user account",
      },
      { status: 400 },
    )
  }

  await db.insert(profile).values({
    userId: created.user.id,
    role: "MERCHANT",
    phone,
    isActive: true,
    canManagePricing: false,
    merchantId: newMerchant.id,
  })

  return NextResponse.json(newMerchant, { status: 201 })
}
