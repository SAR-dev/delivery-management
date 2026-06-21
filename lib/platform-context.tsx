"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import type {
  User,
  SecurityMoneyConfig,
  Role,
  Merchant,
  MerchantPricingInput,
  Order,
  PickupLocation,
  CreateOrderInput,
  Rider,
  Warehouse,
  Division,
  PayoutRequest,
} from "@/lib/types"
import { authClient } from "@/lib/auth-client"

interface NewAccountInput {
  name: string
  email: string
  phone: string
  role: Extract<Role, "ADMIN" | "WAREHOUSE_ADMIN">
  warehouseId?: string | null
  canManagePricing?: boolean
}

interface RiderCreateInput {
  name: string
  email: string
  phone: string
  zone: string
  warehouseId?: string | null
}

interface RiderUpdateInput {
  name?: string
  email?: string
  phone?: string
  zone?: string
  warehouseId?: string | null
}

interface PickupLocationInput {
  label: string
  address: string
  divisionId: string
  mapLink?: string
  imageLinks?: string[]
}

interface PlatformContextValue {
  currentUser: User | null
  isReady: boolean
  // True once both the session AND the full platform data have loaded.
  isDataReady: boolean
  // Non-null when the initial platform data load failed. Pages can show a
  // retry prompt and call refreshData() to re-attempt the load.
  dataError: string | null
  refreshData: () => void
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; user?: User; error?: string }>
  logout: () => Promise<void>

  // Update the signed-in user's own display name.
  updateProfileName: (name: string) => Promise<{ ok: boolean; error?: string }>
  // Set or clear (null) the signed-in user's avatar image.
  updateProfileImage: (
    image: string | null,
  ) => Promise<{ ok: boolean; error?: string }>
  // Change the signed-in user's password (verifies the current one).
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ ok: boolean; error?: string }>

  securityConfig: SecurityMoneyConfig | null
  updateSecurityConfig: (
    next: Pick<
      SecurityMoneyConfig,
      "lowValueThreshold" | "lowValueFlatFee" | "highValuePercentage"
    >,
  ) => Promise<void>

  team: User[]
  createAccount: (
    input: NewAccountInput & { password: string },
  ) => Promise<void>
  toggleAccountActive: (id: string) => Promise<void>
  togglePricingPermission: (id: string) => Promise<void>
  // Super Admin reassigns the warehouse a Warehouse Admin manages (or clears it).
  updateAccountWarehouse: (
    id: string,
    warehouseId: string | null,
  ) => Promise<void>

  merchants: Merchant[]
  approveMerchant: (id: string) => Promise<void>
  suspendMerchant: (id: string) => Promise<void>
  reactivateMerchant: (id: string) => Promise<void>
  setMerchantPricing: (
    id: string,
    pricing: MerchantPricingInput,
  ) => Promise<void>
  // Merchant updates their own business contact details.
  updateMerchantProfile: (
    id: string,
    input: {
      businessName: string
      email: string
      phone: string
      address: string
      divisionId: string
    },
  ) => Promise<{ ok: boolean; error?: string }>

  // --- Phase 3: orders (merchant-facing) ---
  orders: Order[]
  pickupLocations: PickupLocation[]
  // Merchant manages their own pickup locations (shops).
  createPickupLocation: (
    input: PickupLocationInput,
  ) => Promise<{ ok: boolean; error?: string }>
  updatePickupLocation: (
    id: string,
    input: PickupLocationInput,
  ) => Promise<{ ok: boolean; error?: string }>
  deletePickupLocation: (id: string) => Promise<{ ok: boolean; error?: string }>
  // The merchant business for the currently logged-in merchant user.
  currentMerchant: Merchant | null
  createOrder: (
    input: CreateOrderInput,
  ) => Promise<{ ok: boolean; order?: Order; error?: string }>
  // Create several orders in a single batch (atomic on the server).
  createOrders: (
    inputs: CreateOrderInput[],
  ) => Promise<{ ok: boolean; orders?: Order[]; error?: string }>

  // --- Phase 4: order approval & pickup assignment (admin) ---
  riders: Rider[]
  // Admin provisions a new rider (pickup or warehouse-based delivery rider).
  createRider: (input: RiderCreateInput) => Promise<void>
  // Admin updates rider details (name, phone, zone, warehouse assignment).
  updateRider: (id: string, input: RiderUpdateInput) => Promise<void>
  // Admin enables/disables a rider account.
  toggleRiderActive: (id: string) => Promise<void>
  // Approve a PENDING order and assign a pickup rider in one step.
  approveAndAssignOrder: (
    orderId: string,
    riderId: string,
  ) => Promise<{ ok: boolean; error?: string }>

  // --- Phase 5: pickup from merchant (rider) ---
  // The rider profile for the currently logged-in rider user.
  currentRider: Rider | null
  // Rider marks an APPROVED order assigned to them as PICKED_UP.
  markOrderPickedUp: (
    orderId: string,
    proofRefs: string[],
  ) => Promise<{ ok: boolean; error?: string }>

  // --- Divisions (geographic regions; managed by Super Admin) ---
  divisions: Division[]
  // Super Admin creates a new division.
  createDivision: (name: string) => Promise<{ ok: boolean; error?: string }>
  // Super Admin renames a division.
  updateDivision: (
    id: string,
    input: { name?: string; isActive?: boolean },
  ) => Promise<{ ok: boolean; error?: string }>
  // Super Admin deletes a division (only if unused).
  deleteDivision: (id: string) => Promise<{ ok: boolean; error?: string }>

  // --- Phase 6: parcel submitted to warehouse (warehouse admin) ---
  warehouses: Warehouse[]
  // Super Admin creates a new warehouse.
  createWarehouse: (input: {
    name: string
    address: string
    city: string
    divisionId: string
  }) => Promise<{ ok: boolean; error?: string }>
  // Super Admin edits a warehouse or toggles its active state.
  updateWarehouse: (
    id: string,
    input: {
      name?: string
      address?: string
      city?: string
      divisionId?: string
      isActive?: boolean
    },
  ) => Promise<{ ok: boolean; error?: string }>
  // Super Admin deletes a warehouse (only if unused).
  deleteWarehouse: (id: string) => Promise<{ ok: boolean; error?: string }>
  // The warehouse managed by the currently logged-in Warehouse Admin.
  currentWarehouse: Warehouse | null
  // Warehouse Admin logs a PICKED_UP parcel into their warehouse -> IN_WAREHOUSE.
  receiveOrderAtWarehouse: (
    orderId: string,
  ) => Promise<{ ok: boolean; error?: string }>

  // --- Phase 7: delivery rider assignment (warehouse admin) ---
  // Delivery riders based at the current Warehouse Admin's warehouse.
  warehouseDeliveryRiders: Rider[]
  // Warehouse Admin dispatches an IN_WAREHOUSE parcel to a delivery rider,
  // moving it IN_WAREHOUSE -> IN_TRANSIT and setting delivery_rider_id.
  assignDeliveryRider: (
    orderId: string,
    riderId: string,
  ) => Promise<{ ok: boolean; error?: string }>

  // --- Phase 8: delivery attempt (delivery rider -> customer) ---
  // Delivery rider starts the run: IN_TRANSIT -> OUT_FOR_DELIVERY.
  markOutForDelivery: (
    orderId: string,
  ) => Promise<{ ok: boolean; error?: string }>
  // Delivery rider completes delivery: OUT_FOR_DELIVERY -> DELIVERED.
  // `proofRef` stands in for the uploaded proof image (mock).
  markDelivered: (
    orderId: string,
    proofRef?: string,
  ) => Promise<{ ok: boolean; error?: string }>
  // Delivery rider records a failed attempt: OUT_FOR_DELIVERY -> FAILED_ATTEMPT.
  // A reason `note` is required.
  markDeliveryFailed: (
    orderId: string,
    note: string,
  ) => Promise<{ ok: boolean; error?: string }>

  // --- Phase 8B: failed delivery resolution (warehouse admin) -------------
  // FAILED_ATTEMPT parcels held at the current Warehouse Admin's warehouse,
  // awaiting a re-attempt / return decision.
  warehouseFailedOrders: Order[]
  // Send a FAILED_ATTEMPT parcel back out with its delivery rider:
  // FAILED_ATTEMPT -> OUT_FOR_DELIVERY.
  reattemptFailedOrder: (
    orderId: string,
  ) => Promise<{ ok: boolean; error?: string }>
  // Close a FAILED_ATTEMPT parcel as a return: FAILED_ATTEMPT -> RETURNED. No
  // COD is collected and no merchant payout is issued. A `reason` is required.
  returnFailedOrder: (
    orderId: string,
    reason: string,
  ) => Promise<{ ok: boolean; error?: string }>

  // --- Phase 9: COD reconciliation & merchant payout ----------------------
  payoutRequests: PayoutRequest[]
  // DELIVERED parcels at the current Warehouse Admin's warehouse whose COD the
  // rider has not yet settled. (Step 45.)
  warehouseUnsettledOrders: Order[]
  // Warehouse Admin records that the delivery rider has settled the collected
  // cash for a delivered parcel. Platform retains delivery charge + security
  // money; product cost becomes available for merchant payout.
  settleOrderCod: (orderId: string) => Promise<{ ok: boolean; error?: string }>

  // Delivered + COD-settled orders for the current merchant that are not yet
  // attached to an active payout request — i.e. available funds.
  merchantPayableOrders: Order[]
  // Payout requests belonging to the current merchant.
  merchantPayoutRequests: PayoutRequest[]
  // Merchant submits a payout request for all currently payable orders.
  requestPayout: (input: {
    payoutMethod: string
    payoutDetails: string
  }) => Promise<{ ok: boolean; request?: PayoutRequest; error?: string }>

  // Super Admin approves a PENDING payout request.
  approvePayout: (requestId: string) => Promise<{ ok: boolean; error?: string }>
  // Super Admin rejects a PENDING payout request (unlocks its orders). A
  // `reason` is required.
  rejectPayout: (
    requestId: string,
    reason: string,
  ) => Promise<{ ok: boolean; error?: string }>
  // Super Admin marks an APPROVED payout request as PAID.
  markPayoutPaid: (
    requestId: string,
  ) => Promise<{ ok: boolean; error?: string }>
}

// Maps each order-lifecycle PATCH path to the status the order is expected to
// land in, so the UI can update optimistically before the server responds.
// Paths that don't change status (e.g. "settle-cod") are handled separately.
const OPTIMISTIC_STATUS: Record<string, Order["status"]> = {
  approve: "APPROVED",
  "picked-up": "PICKED_UP",
  receive: "IN_WAREHOUSE",
  dispatch: "IN_TRANSIT",
  "out-for-delivery": "OUT_FOR_DELIVERY",
  delivered: "DELIVERED",
  failed: "FAILED_ATTEMPT",
  reattempt: "OUT_FOR_DELIVERY",
  return: "RETURNED",
}

const PlatformContext = createContext<PlatformContextValue | null>(null)

// Where each role lands after login.
export function homeForRole(role: Role): string {
  if (role === "MERCHANT") return "/merchant"
  if (role === "RIDER") return "/rider"
  if (role === "WAREHOUSE_ADMIN") return "/warehouse"
  return "/dashboard"
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isDataReady, setIsDataReady] = useState(false)
  const [securityConfig, setSecurityConfig] =
    useState<SecurityMoneyConfig | null>(null)
  const [team, setTeam] = useState<User[]>([])
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([])
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([])
  const [riders, setRiders] = useState<Rider[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  // Surfaced when the initial platform data load fails so pages can degrade
  // gracefully (show a retry prompt) instead of rendering empty/stale UI.
  const [dataError, setDataError] = useState<string | null>(null)
  // Bumped by refreshData() to re-run the loader effect on demand.
  const [reloadKey, setReloadKey] = useState(0)

  // Restore a real Better Auth session on mount, then hydrate the full
  // app-level User (role + merchant/rider/warehouse linkage) from
  // /api/users/me, which joins the `profile` table for us.
  useEffect(() => {
    async function bootstrap() {
      try {
        const { data: session } = await authClient.getSession()
        if (session) {
          const res = await fetch("/api/users/me")
          if (res.ok) {
            const user = await res.json()
            setCurrentUser(user)
          }
        }
      } finally {
        setIsReady(true)
      }
    }
    bootstrap()
  }, [])

  // Load all platform data from the real API once a session is established.
  // Re-runs on every currentUser change so logging out clears stale data and
  // logging in as a different role re-fetches with the correct role filters.
  useEffect(() => {
    if (!currentUser) {
      setTeam([])
      setMerchants([])
      setOrders([])
      setPayoutRequests([])
      setPickupLocations([])
      setRiders([])
      setWarehouses([])
      setDivisions([])
      setSecurityConfig(null)
      setDataError(null)
      setIsDataReady(false)
      return
    }

    let cancelled = false

    async function loadAll() {
      try {
        const [
          teamRes,
          merchantsRes,
          ordersRes,
          payoutsRes,
          pickupLocationsRes,
          ridersRes,
          warehousesRes,
          divisionsRes,
          securityConfigRes,
        ] = await Promise.all([
          fetch("/api/team"),
          fetch("/api/merchants"),
          fetch("/api/orders"),
          fetch("/api/payouts"),
          fetch("/api/pickup-locations"),
          fetch("/api/riders"),
          fetch("/api/warehouses"),
          fetch("/api/divisions"),
          fetch("/api/security-config"),
        ])
        if (cancelled) return

        // If any endpoint hard-fails (network error aside), treat the load as
        // failed so the UI can prompt a retry rather than show partial data.
        const responses = [
          teamRes,
          merchantsRes,
          ordersRes,
          payoutsRes,
          pickupLocationsRes,
          ridersRes,
          warehousesRes,
          divisionsRes,
          securityConfigRes,
        ]
        if (responses.some((r) => !r.ok)) {
          throw new Error("One or more platform resources failed to load.")
        }

        setTeam(await teamRes.json())
        setMerchants(await merchantsRes.json())
        setOrders(await ordersRes.json())
        setPayoutRequests(await payoutsRes.json())
        setPickupLocations(await pickupLocationsRes.json())
        setRiders(await ridersRes.json())
        setWarehouses(await warehousesRes.json())
        setDivisions(await divisionsRes.json())
        setSecurityConfig(await securityConfigRes.json())
        if (!cancelled) {
          setDataError(null)
          setIsDataReady(true)
        }
      } catch (err) {
        if (cancelled) return
        setDataError(
          err instanceof Error
            ? err.message
            : "Could not load platform data. Please try again.",
        )
      }
    }

    loadAll()
    return () => {
      cancelled = true
    }
  }, [currentUser, reloadKey])

  // Re-run the platform data loader (used to recover from a failed load).
  const refreshData = useCallback(() => setReloadKey((k) => k + 1), [])

  const login = useCallback(async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase()
    const { data, error } = await authClient.signIn.email({
      email: normalized,
      password,
    })

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "Invalid email or password.",
      }
    }

    const res = await fetch("/api/users/me")
    if (!res.ok) {
      return { ok: false, error: "Could not load your account." }
    }
    const user: User = await res.json()

    if (!user.isActive) {
      // Sign the Better Auth session back out — we don't want a session
      // cookie sitting around for a deactivated account.
      await authClient.signOut()
      return { ok: false, error: "This account has been deactivated." }
    }

    setCurrentUser(user)
    return { ok: true, user }
  }, [])

  const logout = useCallback(async () => {
    await authClient.signOut()
    setCurrentUser(null)
    router.push("/login")
  }, [router])

  const updateProfileName = useCallback<
    PlatformContextValue["updateProfileName"]
  >(async (name) => {
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: data?.error ?? "Could not update your name." }
    }
    setCurrentUser(data)
    return { ok: true }
  }, [])

  const updateProfileImage = useCallback<
    PlatformContextValue["updateProfileImage"]
  >(async (image) => {
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error ?? "Could not update your photo.",
      }
    }
    setCurrentUser(data)
    return { ok: true }
  }, [])

  const changePassword = useCallback<PlatformContextValue["changePassword"]>(
    async (currentPassword, newPassword) => {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        // Keep this session alive but sign out everywhere else for safety.
        revokeOtherSessions: true,
      })
      if (error) {
        return {
          ok: false,
          error: error.message ?? "Could not change your password.",
        }
      }
      return { ok: true }
    },
    [],
  )

  const updateSecurityConfig = useCallback<
    PlatformContextValue["updateSecurityConfig"]
  >(async (next) => {
    const res = await fetch("/api/security-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    })
    if (!res.ok) return
    const updated = await res.json()
    setSecurityConfig(updated)
  }, [])

  const createAccount = useCallback<PlatformContextValue["createAccount"]>(
    async (input) => {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) return
      const newUser = await res.json()
      setTeam((prev) => [newUser, ...prev])
      // Keep the cached warehouse list in sync with the new manager assignment.
      if (newUser.role === "WAREHOUSE_ADMIN" && newUser.warehouseId) {
        setWarehouses((prev) =>
          prev.map((w) =>
            w.id === newUser.warehouseId ? { ...w, managedBy: newUser.id } : w,
          ),
        )
      }
    },
    [],
  )

  const toggleAccountActive = useCallback<
    PlatformContextValue["toggleAccountActive"]
  >(async (id) => {
    const res = await fetch(`/api/team/${id}/active`, { method: "PATCH" })
    if (!res.ok) return
    const updatedProfile = await res.json()
    setTeam((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, isActive: updatedProfile.isActive } : u,
      ),
    )
  }, [])

  const togglePricingPermission = useCallback<
    PlatformContextValue["togglePricingPermission"]
  >(async (id) => {
    const res = await fetch(`/api/team/${id}/pricing`, { method: "PATCH" })
    if (!res.ok) return
    const updatedProfile = await res.json()
    setTeam((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, canManagePricing: updatedProfile.canManagePricing }
          : u,
      ),
    )
  }, [])

  const updateAccountWarehouse = useCallback<
    PlatformContextValue["updateAccountWarehouse"]
  >(async (id, warehouseId) => {
    const res = await fetch(`/api/team/${id}/warehouse`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ warehouseId }),
    })
    if (!res.ok) return
    const updatedProfile = await res.json()
    setTeam((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, warehouseId: updatedProfile.warehouseId } : u,
      ),
    )
    // Reflect the managedBy change on the cached warehouse list so the create
    // dialog and other views stay consistent without a full refetch.
    setWarehouses((prev) =>
      prev.map((w) => {
        if (w.managedBy === id) return { ...w, managedBy: null }
        if (warehouseId && w.id === warehouseId) return { ...w, managedBy: id }
        return w
      }),
    )
  }, [])

  // --- Phase 2: Merchant onboarding ---------------------------------------
  // Public merchant registration now lives in app/register/page.tsx, which
  // posts directly to /api/merchants and signs the new owner in.

  // Super Admin / Admin approves a pending merchant -> ACTIVE.
  const approveMerchant = useCallback<PlatformContextValue["approveMerchant"]>(
    async (id) => {
      const res = await fetch(`/api/merchants/${id}/approve`, {
        method: "PATCH",
      })
      if (!res.ok) return
      const updated = await res.json()
      setMerchants((prev) => prev.map((m) => (m.id === id ? updated : m)))
    },
    [],
  )

  const suspendMerchant = useCallback<PlatformContextValue["suspendMerchant"]>(
    async (id) => {
      const res = await fetch(`/api/merchants/${id}/suspend`, {
        method: "PATCH",
      })
      if (!res.ok) return
      const updated = await res.json()
      setMerchants((prev) => prev.map((m) => (m.id === id ? updated : m)))
    },
    [],
  )

  const reactivateMerchant = useCallback<
    PlatformContextValue["reactivateMerchant"]
  >(async (id) => {
    const res = await fetch(`/api/merchants/${id}/reactivate`, {
      method: "PATCH",
    })
    if (!res.ok) return
    const updated = await res.json()
    setMerchants((prev) => prev.map((m) => (m.id === id ? updated : m)))
  }, [])

  // Admin sets per-merchant pricing (base rate, per-kg, free/max weight).
  const setMerchantPricing = useCallback<
    PlatformContextValue["setMerchantPricing"]
  >(async (id, pricing) => {
    const res = await fetch(`/api/merchants/${id}/pricing`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pricing),
    })
    if (!res.ok) return
    const updated = await res.json()
    setMerchants((prev) => prev.map((m) => (m.id === id ? updated : m)))
  }, [])

  const updateMerchantProfile = useCallback<
    PlatformContextValue["updateMerchantProfile"]
  >(async (id, input) => {
    const res = await fetch(`/api/merchants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error ?? "Could not update your business details.",
      }
    }
    setMerchants((prev) => prev.map((m) => (m.id === id ? data : m)))
    return { ok: true }
  }, [])

  // --- Phase 3: Order creation (merchant) ---------------------------------

  // The merchant business owned by the logged-in merchant user (if any).
  const currentMerchant =
    currentUser?.role === "MERCHANT" && currentUser.merchantId
      ? (merchants.find((m) => m.id === currentUser.merchantId) ?? null)
      : null

  const createOrder = useCallback<PlatformContextValue["createOrder"]>(
    async (input) => {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) {
        return { ok: false, error: data.error ?? "Failed to create order." }
      }
      setOrders((prev) => [data, ...prev])
      return { ok: true, order: data }
    },
    [],
  )

  const createOrders = useCallback<PlatformContextValue["createOrders"]>(
    async (inputs) => {
      const res = await fetch("/api/orders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: inputs }),
      })
      const data = await res.json()
      if (!res.ok) {
        return { ok: false, error: data.error ?? "Failed to create orders." }
      }
      setOrders((prev) => [...data, ...prev])
      return { ok: true, orders: data }
    },
    [],
  )

  // --- Pickup location (shop) management (merchant) -----------------------

  const createPickupLocation = useCallback<
    PlatformContextValue["createPickupLocation"]
  >(async (input) => {
    const res = await fetch("/api/pickup-locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: data?.error ?? "Could not add the shop." }
    }
    setPickupLocations((prev) => [...prev, data])
    return { ok: true }
  }, [])

  const updatePickupLocation = useCallback<
    PlatformContextValue["updatePickupLocation"]
  >(async (id, input) => {
    const res = await fetch(`/api/pickup-locations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: data?.error ?? "Could not update the shop." }
    }
    setPickupLocations((prev) => prev.map((p) => (p.id === id ? data : p)))
    return { ok: true }
  }, [])

  const deletePickupLocation = useCallback<
    PlatformContextValue["deletePickupLocation"]
  >(async (id) => {
    const res = await fetch(`/api/pickup-locations/${id}`, {
      method: "DELETE",
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return { ok: false, error: data?.error ?? "Could not remove the shop." }
    }
    setPickupLocations((prev) => prev.filter((p) => p.id !== id))
    return { ok: true }
  }, [])

  // --- Division management (Super Admin) ----------------------------------

  const createDivision = useCallback<PlatformContextValue["createDivision"]>(
    async (name) => {
      const res = await fetch("/api/divisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error ?? "Could not create the division.",
        }
      }
      setDivisions((prev) =>
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name)),
      )
      return { ok: true }
    },
    [],
  )

  const updateDivision = useCallback<PlatformContextValue["updateDivision"]>(
    async (id, input) => {
      const res = await fetch(`/api/divisions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error ?? "Could not update the division.",
        }
      }
      setDivisions((prev) =>
        prev
          .map((d) => (d.id === id ? data : d))
          .sort((a, b) => a.name.localeCompare(b.name)),
      )
      return { ok: true }
    },
    [],
  )

  const deleteDivision = useCallback<PlatformContextValue["deleteDivision"]>(
    async (id) => {
      const res = await fetch(`/api/divisions/${id}`, { method: "DELETE" })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error ?? "Could not delete the division.",
        }
      }
      setDivisions((prev) => prev.filter((d) => d.id !== id))
      return { ok: true }
    },
    [],
  )

  const createWarehouse = useCallback<PlatformContextValue["createWarehouse"]>(
    async (input) => {
      const res = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error ?? "Could not create the warehouse.",
        }
      }
      setWarehouses((prev) =>
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name)),
      )
      return { ok: true }
    },
    [],
  )

  const updateWarehouse = useCallback<PlatformContextValue["updateWarehouse"]>(
    async (id, input) => {
      const res = await fetch(`/api/warehouses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error ?? "Could not update the warehouse.",
        }
      }
      setWarehouses((prev) =>
        prev
          .map((w) => (w.id === id ? data : w))
          .sort((a, b) => a.name.localeCompare(b.name)),
      )
      return { ok: true }
    },
    [],
  )

  const deleteWarehouse = useCallback<PlatformContextValue["deleteWarehouse"]>(
    async (id) => {
      const res = await fetch(`/api/warehouses/${id}`, { method: "DELETE" })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error ?? "Could not delete the warehouse.",
        }
      }
      setWarehouses((prev) => prev.filter((w) => w.id !== id))
      return { ok: true }
    },
    [],
  )

  // Shared helper for every order-lifecycle PATCH. We optimistically apply the
  // expected status immediately so the UI feels instant, then reconcile with
  // the authoritative server row on success — or roll back on failure. The
  // server still validates every transition, so the optimistic value is only
  // ever a short-lived guess.
  const patchOrder = useCallback(
    async (
      orderId: string,
      path: string,
      body?: Record<string, unknown>,
    ): Promise<{ ok: boolean; error?: string }> => {
      const optimisticStatus = OPTIMISTIC_STATUS[path]

      // Snapshot the pre-mutation row (captured inside the pure updater so it
      // reflects the latest state without a stale closure) for rollback.
      let snapshot: Order | undefined
      if (optimisticStatus || path === "settle-cod") {
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id !== orderId) return o
            snapshot = o
            return {
              ...o,
              ...(optimisticStatus ? { status: optimisticStatus } : {}),
              ...(path === "settle-cod"
                ? { codSettledAt: new Date().toISOString() }
                : {}),
              ...(path === "approve" && body?.riderId
                ? { pickupRiderId: body.riderId as string }
                : {}),
              ...(path === "dispatch" && body?.riderId
                ? { deliveryRiderId: body.riderId as string }
                : {}),
            }
          }),
        )
      }

      const rollback = () => {
        // Roll back to the snapshot we took before the optimistic update.
        if (snapshot) {
          const prevRow = snapshot
          setOrders((prev) => prev.map((o) => (o.id === orderId ? prevRow : o)))
        }
      }

      try {
        const res = await fetch(`/api/orders/${orderId}/${path}`, {
          method: "PATCH",
          ...(body
            ? {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              }
            : {}),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          rollback()
          return { ok: false, error: data?.error ?? "Action failed." }
        }
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data : o)))
        return { ok: true }
      } catch {
        // Network/transport failure: roll back the optimistic update too.
        rollback()
        return { ok: false, error: "Network error. Please try again." }
      }
    },
    [],
  )

  // --- Phase 4: Order approval & pickup assignment (admin) ----------------

  const approveAndAssignOrder = useCallback<
    PlatformContextValue["approveAndAssignOrder"]
  >(
    (orderId, riderId) => patchOrder(orderId, "approve", { riderId }),
    [patchOrder],
  )

  // Admin provisions a new rider and prepends it to the roster.
  const createRider = useCallback<PlatformContextValue["createRider"]>(
    async (input) => {
      const res = await fetch("/api/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) return
      const newRider = await res.json()
      setRiders((prev) => [newRider, ...prev])
    },
    [],
  )

  // Admin updates rider details.
  const updateRider = useCallback<PlatformContextValue["updateRider"]>(
    async (id, input) => {
      const res = await fetch(`/api/riders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) return
      const updated = await res.json()
      setRiders((prev) => prev.map((r) => (r.id === id ? updated : r)))
    },
    [],
  )

  // Admin enables/disables a rider account.
  const toggleRiderActive = useCallback<
    PlatformContextValue["toggleRiderActive"]
  >(async (id) => {
    const res = await fetch(`/api/riders/${id}/active`, { method: "PATCH" })
    if (!res.ok) return
    const updated = await res.json()
    setRiders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: updated.isActive } : r)),
    )
  }, [])

  // --- Phase 5: Pickup from merchant (rider) ------------------------------

  // The rider profile for the logged-in rider user (if any).
  const currentRider =
    currentUser?.role === "RIDER" && currentUser.riderId
      ? (riders.find((r) => r.id === currentUser.riderId) ?? null)
      : null

  const markOrderPickedUp = useCallback<
    PlatformContextValue["markOrderPickedUp"]
  >(
    (orderId, proofRefs) => patchOrder(orderId, "picked-up", { proofRefs }),
    [patchOrder],
  )

  // --- Phase 6: Parcel submitted to warehouse (warehouse admin) -----------

  // The warehouse managed by the logged-in Warehouse Admin (if any).
  const currentWarehouse =
    currentUser?.role === "WAREHOUSE_ADMIN" && currentUser.warehouseId
      ? (warehouses.find((w) => w.id === currentUser.warehouseId) ?? null)
      : null

  const receiveOrderAtWarehouse = useCallback<
    PlatformContextValue["receiveOrderAtWarehouse"]
  >((orderId) => patchOrder(orderId, "receive"), [patchOrder])

  // --- Phase 7: Delivery rider assignment (warehouse admin) ---------------

  // Active delivery riders based at the logged-in admin's warehouse. A
  // Warehouse Admin can only dispatch parcels to riders at their own hub.
  const warehouseDeliveryRiders = currentWarehouse
    ? riders.filter((r) => r.warehouseId === currentWarehouse.id && r.isActive)
    : []

  const assignDeliveryRider = useCallback<
    PlatformContextValue["assignDeliveryRider"]
  >(
    (orderId, riderId) => patchOrder(orderId, "dispatch", { riderId }),
    [patchOrder],
  )

  // --- Phase 8: Delivery attempt (delivery rider -> customer) -------------

  const markOutForDelivery = useCallback<
    PlatformContextValue["markOutForDelivery"]
  >((orderId) => patchOrder(orderId, "out-for-delivery"), [patchOrder])

  const markDelivered = useCallback<PlatformContextValue["markDelivered"]>(
    (orderId, proofRef) =>
      patchOrder(orderId, "delivered", proofRef ? { proofRef } : undefined),
    [patchOrder],
  )

  const markDeliveryFailed = useCallback<
    PlatformContextValue["markDeliveryFailed"]
  >((orderId, note) => patchOrder(orderId, "failed", { note }), [patchOrder])

  // --- Phase 8B: Failed delivery resolution (warehouse admin) -------------

  // FAILED_ATTEMPT parcels that belong to the logged-in admin's warehouse and
  // still need a re-attempt / return decision.
  const warehouseFailedOrders = currentWarehouse
    ? orders.filter(
        (o) =>
          o.status === "FAILED_ATTEMPT" &&
          o.warehouseId === currentWarehouse.id,
      )
    : []

  const reattemptFailedOrder = useCallback<
    PlatformContextValue["reattemptFailedOrder"]
  >((orderId) => patchOrder(orderId, "reattempt"), [patchOrder])

  const returnFailedOrder = useCallback<
    PlatformContextValue["returnFailedOrder"]
  >(
    (orderId, reason) => patchOrder(orderId, "return", { reason }),
    [patchOrder],
  )

  // --- Phase 9: COD reconciliation & merchant payout ----------------------

  // DELIVERED parcels held at the logged-in admin's warehouse whose COD the
  // rider has not yet settled (step 45).
  const warehouseUnsettledOrders = currentWarehouse
    ? orders.filter(
        (o) =>
          o.status === "DELIVERED" &&
          o.warehouseId === currentWarehouse.id &&
          !o.codSettledAt,
      )
    : []

  const settleOrderCod = useCallback<PlatformContextValue["settleOrderCod"]>(
    (orderId) => patchOrder(orderId, "settle-cod"),
    [patchOrder],
  )

  // Orders that are delivered, COD-settled, and not locked to an active payout
  // request — these make up the merchant's available funds.
  const merchantPayableOrders = currentMerchant
    ? orders.filter(
        (o) =>
          o.merchantId === currentMerchant.id &&
          o.status === "DELIVERED" &&
          Boolean(o.codSettledAt) &&
          !o.payoutRequestId,
      )
    : []

  const merchantPayoutRequests = currentMerchant
    ? payoutRequests.filter((p) => p.merchantId === currentMerchant.id)
    : []

  const requestPayout = useCallback<PlatformContextValue["requestPayout"]>(
    async (input) => {
      const res = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error }
      setPayoutRequests((prev) => [data, ...prev])
      const lockedIds = new Set<string>(data.orderIds)
      setOrders((prev) =>
        prev.map((o) =>
          lockedIds.has(o.id) ? { ...o, payoutRequestId: data.id } : o,
        ),
      )
      return { ok: true, request: data }
    },
    [],
  )

  const approvePayout = useCallback<PlatformContextValue["approvePayout"]>(
    async (requestId) => {
      const res = await fetch(`/api/payouts/${requestId}/approve`, {
        method: "PATCH",
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error }
      setPayoutRequests((prev) =>
        prev.map((p) => (p.id === requestId ? data : p)),
      )
      return { ok: true }
    },
    [],
  )

  const rejectPayout = useCallback<PlatformContextValue["rejectPayout"]>(
    async (requestId, reason) => {
      const res = await fetch(`/api/payouts/${requestId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error }
      setPayoutRequests((prev) =>
        prev.map((p) => (p.id === requestId ? data : p)),
      )
      // Unlock the request's orders so they can be requested again.
      const unlockedIds = new Set<string>(data.orderIds)
      setOrders((prev) =>
        prev.map((o) =>
          unlockedIds.has(o.id) ? { ...o, payoutRequestId: null } : o,
        ),
      )
      return { ok: true }
    },
    [],
  )

  const markPayoutPaid = useCallback<PlatformContextValue["markPayoutPaid"]>(
    async (requestId) => {
      const res = await fetch(`/api/payouts/${requestId}/paid`, {
        method: "PATCH",
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error }
      setPayoutRequests((prev) =>
        prev.map((p) => (p.id === requestId ? data : p)),
      )
      return { ok: true }
    },
    [],
  )

  return (
    <PlatformContext.Provider
      value={{
        currentUser,
        isReady,
        isDataReady,
        dataError,
        refreshData,
        login,
        logout,
        updateProfileName,
        updateProfileImage,
        changePassword,
        securityConfig,
        updateSecurityConfig,
        team,
        createAccount,
        toggleAccountActive,
        togglePricingPermission,
        updateAccountWarehouse,
        merchants,
        approveMerchant,
        suspendMerchant,
        reactivateMerchant,
        setMerchantPricing,
        updateMerchantProfile,
        orders,
        pickupLocations,
        createPickupLocation,
        updatePickupLocation,
        deletePickupLocation,
        currentMerchant,
        createOrder,
        createOrders,
        riders,
        createRider,
        updateRider,
        toggleRiderActive,
        approveAndAssignOrder,
        currentRider,
        markOrderPickedUp,
        divisions,
        createDivision,
        updateDivision,
        deleteDivision,
        warehouses,
        createWarehouse,
        updateWarehouse,
        deleteWarehouse,
        currentWarehouse,
        receiveOrderAtWarehouse,
        warehouseDeliveryRiders,
        assignDeliveryRider,
        markOutForDelivery,
        markDelivered,
        markDeliveryFailed,
        warehouseFailedOrders,
        reattemptFailedOrder,
        returnFailedOrder,
        payoutRequests,
        warehouseUnsettledOrders,
        settleOrderCod,
        merchantPayableOrders,
        merchantPayoutRequests,
        requestPayout,
        approvePayout,
        rejectPayout,
        markPayoutPaid,
      }}
    >
      {children}
    </PlatformContext.Provider>
  )
}

export function usePlatform() {
  const ctx = useContext(PlatformContext)
  if (!ctx) {
    throw new Error("usePlatform must be used within a PlatformProvider")
  }
  return ctx
}
