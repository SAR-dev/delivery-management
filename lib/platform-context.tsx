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
  MerchantRegistrationInput,
  MerchantPricingInput,
  Order,
  PickupLocation,
  CreateOrderInput,
  Rider,
  Warehouse,
  PayoutRequest,
} from "@/lib/types"
import { DEFAULT_MERCHANT_PRICING } from "@/lib/mock-data"
import { calcDeliveryCharge, calcSecurityMoney } from "@/lib/pricing"
import { authClient } from "@/lib/auth-client"

interface NewAccountInput {
  name: string
  email: string
  phone: string
  role: Extract<Role, "ADMIN" | "WAREHOUSE_ADMIN">
  warehouseId?: string | null
  canManagePricing?: boolean
}

interface PlatformContextValue {
  currentUser: User | null
  isReady: boolean
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; user?: User; error?: string }>
  logout: () => Promise<void>

  securityConfig: SecurityMoneyConfig | null
  updateSecurityConfig: (
    next: Pick<
      SecurityMoneyConfig,
      "lowValueThreshold" | "lowValueFlatFee" | "highValuePercentage"
    >,
  ) => void

  team: User[]
  createAccount: (input: NewAccountInput) => void
  toggleAccountActive: (id: string) => void
  togglePricingPermission: (id: string) => void

  merchants: Merchant[]
  registerMerchant: (input: MerchantRegistrationInput) => Merchant
  approveMerchant: (id: string) => void
  suspendMerchant: (id: string) => void
  reactivateMerchant: (id: string) => void
  setMerchantPricing: (id: string, pricing: MerchantPricingInput) => void

  // --- Phase 3: orders (merchant-facing) ---
  orders: Order[]
  pickupLocations: PickupLocation[]
  // The merchant business for the currently logged-in merchant user.
  currentMerchant: Merchant | null
  createOrder: (
    input: CreateOrderInput,
  ) => { ok: boolean; order?: Order; error?: string }

  // --- Phase 4: order approval & pickup assignment (admin) ---
  riders: Rider[]
  // Approve a PENDING order and assign a pickup rider in one step.
  approveAndAssignOrder: (
    orderId: string,
    riderId: string,
  ) => { ok: boolean; error?: string }

  // --- Phase 5: pickup from merchant (rider) ---
  // The rider profile for the currently logged-in rider user.
  currentRider: Rider | null
  // Rider marks an APPROVED order assigned to them as PICKED_UP.
  markOrderPickedUp: (orderId: string) => { ok: boolean; error?: string }

  // --- Phase 6: parcel submitted to warehouse (warehouse admin) ---
  warehouses: Warehouse[]
  // The warehouse managed by the currently logged-in Warehouse Admin.
  currentWarehouse: Warehouse | null
  // Warehouse Admin logs a PICKED_UP parcel into their warehouse -> IN_WAREHOUSE.
  receiveOrderAtWarehouse: (orderId: string) => { ok: boolean; error?: string }

  // --- Phase 7: delivery rider assignment (warehouse admin) ---
  // Delivery riders based at the current Warehouse Admin's warehouse.
  warehouseDeliveryRiders: Rider[]
  // Warehouse Admin dispatches an IN_WAREHOUSE parcel to a delivery rider,
  // moving it IN_WAREHOUSE -> IN_TRANSIT and setting delivery_rider_id.
  assignDeliveryRider: (
    orderId: string,
    riderId: string,
  ) => { ok: boolean; error?: string }

  // --- Phase 8: delivery attempt (delivery rider -> customer) ---
  // Delivery rider starts the run: IN_TRANSIT -> OUT_FOR_DELIVERY.
  markOutForDelivery: (orderId: string) => { ok: boolean; error?: string }
  // Delivery rider completes delivery: OUT_FOR_DELIVERY -> DELIVERED.
  // `proofRef` stands in for the uploaded proof image (mock).
  markDelivered: (
    orderId: string,
    proofRef?: string,
  ) => { ok: boolean; error?: string }
  // Delivery rider records a failed attempt: OUT_FOR_DELIVERY -> FAILED_ATTEMPT.
  // A reason `note` is required.
  markDeliveryFailed: (
    orderId: string,
    note: string,
  ) => { ok: boolean; error?: string }

  // --- Phase 8B: failed delivery resolution (warehouse admin) -------------
  // FAILED_ATTEMPT parcels held at the current Warehouse Admin's warehouse,
  // awaiting a re-attempt / return decision.
  warehouseFailedOrders: Order[]
  // Send a FAILED_ATTEMPT parcel back out with its delivery rider:
  // FAILED_ATTEMPT -> OUT_FOR_DELIVERY.
  reattemptFailedOrder: (orderId: string) => { ok: boolean; error?: string }
  // Close a FAILED_ATTEMPT parcel as a return: FAILED_ATTEMPT -> RETURNED. No
  // COD is collected and no merchant payout is issued. A `reason` is required.
  returnFailedOrder: (
    orderId: string,
    reason: string,
  ) => { ok: boolean; error?: string }

  // --- Phase 9: COD reconciliation & merchant payout ----------------------
  payoutRequests: PayoutRequest[]
  // DELIVERED parcels at the current Warehouse Admin's warehouse whose COD the
  // rider has not yet settled. (Step 45.)
  warehouseUnsettledOrders: Order[]
  // Warehouse Admin records that the delivery rider has settled the collected
  // cash for a delivered parcel. Platform retains delivery charge + security
  // money; product cost becomes available for merchant payout.
  settleOrderCod: (orderId: string) => { ok: boolean; error?: string }

  // Delivered + COD-settled orders for the current merchant that are not yet
  // attached to an active payout request — i.e. available funds.
  merchantPayableOrders: Order[]
  // Payout requests belonging to the current merchant.
  merchantPayoutRequests: PayoutRequest[]
  // Merchant submits a payout request for all currently payable orders.
  requestPayout: (input: {
    payoutMethod: string
    payoutDetails: string
  }) => { ok: boolean; request?: PayoutRequest; error?: string }

  // Super Admin approves a PENDING payout request.
  approvePayout: (requestId: string) => { ok: boolean; error?: string }
  // Super Admin rejects a PENDING payout request (unlocks its orders). A
  // `reason` is required.
  rejectPayout: (
    requestId: string,
    reason: string,
  ) => { ok: boolean; error?: string }
  // Super Admin marks an APPROVED payout request as PAID.
  markPayoutPaid: (requestId: string) => { ok: boolean; error?: string }
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
  const [securityConfig, setSecurityConfig] = useState<SecurityMoneyConfig | null>(null)
  const [team, setTeam] = useState<User[]>([])
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [merchantUsers, setMerchantUsers] = useState<User[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([])
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([])
  const [riders, setRiders] = useState<Rider[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

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
      setSecurityConfig(null)
      return
    }

    let cancelled = false

    async function loadAll() {
      const [
        teamRes,
        merchantsRes,
        ordersRes,
        payoutsRes,
        pickupLocationsRes,
        ridersRes,
        warehousesRes,
        securityConfigRes,
      ] = await Promise.all([
        fetch("/api/team"),
        fetch("/api/merchants"),
        fetch("/api/orders"),
        fetch("/api/payouts"),
        fetch("/api/pickup-locations"),
        fetch("/api/riders"),
        fetch("/api/warehouses"),
        fetch("/api/security-config"),
      ])
      if (cancelled) return

      if (teamRes.ok) setTeam(await teamRes.json())
      if (merchantsRes.ok) setMerchants(await merchantsRes.json())
      if (ordersRes.ok) setOrders(await ordersRes.json())
      if (payoutsRes.ok) setPayoutRequests(await payoutsRes.json())
      if (pickupLocationsRes.ok) setPickupLocations(await pickupLocationsRes.json())
      if (ridersRes.ok) setRiders(await ridersRes.json())
      if (warehousesRes.ok) setWarehouses(await warehousesRes.json())
      if (securityConfigRes.ok) setSecurityConfig(await securityConfigRes.json())
    }

    loadAll()
    return () => {
      cancelled = true
    }
  }, [currentUser])

  const login = useCallback(async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase()
    const { data, error } = await authClient.signIn.email({
      email: normalized,
      password,
    })

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Invalid email or password." }
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

  const updateSecurityConfig = useCallback<
    PlatformContextValue["updateSecurityConfig"]
  >(
    (next) => {
      setSecurityConfig((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          ...next,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.name ?? "Super Admin",
        }
      })
    },
    [currentUser?.name],
  )

  const createAccount = useCallback((input: NewAccountInput) => {
    const id = `usr_${input.role === "ADMIN" ? "admin" : "wh"}_${Math.random()
      .toString(36)
      .slice(2, 7)}`
    const now = new Date().toISOString()
    const account: User = {
      id,
      name: input.name,
      email: input.email,
      emailVerified: false,
      phone: input.phone,
      role: input.role,
      isActive: true,
      canManagePricing:
        input.role === "ADMIN" ? (input.canManagePricing ?? false) : false,
      warehouseId:
        input.role === "WAREHOUSE_ADMIN" ? (input.warehouseId ?? null) : null,
      createdAt: now,
      updatedAt: now,
    }
    setTeam((prev) => [account, ...prev])
  }, [])

  const toggleAccountActive = useCallback((id: string) => {
    setTeam((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u)),
    )
  }, [])

  const togglePricingPermission = useCallback((id: string) => {
    setTeam((prev) =>
      prev.map((u) =>
        u.id === id && u.role === "ADMIN"
          ? { ...u, canManagePricing: !u.canManagePricing }
          : u,
      ),
    )
  }, [])

  // --- Phase 2: Merchant onboarding ---------------------------------------

  // Public registration: anyone can create a merchant. New merchants land in
  // PENDING with zeroed base rate and platform-default weight rules.
  const registerMerchant = useCallback<
    PlatformContextValue["registerMerchant"]
  >((input) => {
    const merchantId = `mch_${Math.random().toString(36).slice(2, 8)}`
    const merchant: Merchant = {
      id: merchantId,
      businessName: input.businessName,
      ownerName: input.ownerName,
      email: input.email,
      phone: input.phone,
      address: input.address,
      status: "PENDING",
      ...DEFAULT_MERCHANT_PRICING,
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date().toISOString(),
    }
    const now = new Date().toISOString()
    const user: User = {
      id: `usr_mch_${Math.random().toString(36).slice(2, 8)}`,
      name: input.ownerName,
      email: input.email.trim().toLowerCase(),
      emailVerified: false,
      phone: input.phone,
      role: "MERCHANT",
      isActive: true,
      canManagePricing: false,
      merchantId,
      password: input.password,
      createdAt: now,
      updatedAt: now,
    }
    setMerchants((prev) => [merchant, ...prev])
    setMerchantUsers((prev) => [user, ...prev])
    return merchant
  }, [])

  // Super Admin approves a pending merchant -> ACTIVE.
  const approveMerchant = useCallback(
    (id: string) => {
      setMerchants((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                status: "ACTIVE",
                approvedBy: currentUser?.name ?? "Super Admin",
                approvedAt: new Date().toISOString(),
              }
            : m,
        ),
      )
    },
    [currentUser?.name],
  )

  const suspendMerchant = useCallback((id: string) => {
    setMerchants((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "SUSPENDED" } : m)),
    )
  }, [])

  const reactivateMerchant = useCallback((id: string) => {
    setMerchants((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "ACTIVE" } : m)),
    )
  }, [])

  // Admin sets per-merchant pricing (base rate, per-kg, free/max weight).
  const setMerchantPricing = useCallback<
    PlatformContextValue["setMerchantPricing"]
  >((id, pricing) => {
    setMerchants((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...pricing } : m)),
    )
  }, [])

  // --- Phase 3: Order creation (merchant) ---------------------------------

  // The merchant business owned by the logged-in merchant user (if any).
  const currentMerchant =
    currentUser?.role === "MERCHANT" && currentUser.merchantId
      ? (merchants.find((m) => m.id === currentUser.merchantId) ?? null)
      : null

  const createOrder = useCallback<PlatformContextValue["createOrder"]>(
    (input) => {
      if (!currentMerchant) {
        return { ok: false, error: "No merchant context for current user." }
      }

      // Only an ACTIVE merchant may create orders. Pending merchants are not
      // yet approved; suspended merchants are blocked.
      if (currentMerchant.status !== "ACTIVE") {
        return {
          ok: false,
          error:
            currentMerchant.status === "PENDING"
              ? "Your merchant account is pending approval."
              : "Your merchant account is suspended and cannot create orders.",
        }
      }

      const weight = input.parcelWeightKg
      // Hard rejection: anything above the merchant's max weight (3 KG).
      if (weight > currentMerchant.maxWeightKg) {
        return {
          ok: false,
          error: `Parcel weight exceeds the ${currentMerchant.maxWeightKg} KG limit.`,
        }
      }
      if (weight <= 0) {
        return { ok: false, error: "Parcel weight must be greater than 0." }
      }
      if (input.productCost < 0) {
        return { ok: false, error: "Product cost cannot be negative." }
      }

      const { total: deliveryCharge } = calcDeliveryCharge(
        currentMerchant,
        weight,
      )
      if (!securityConfig) {
        return { ok: false, error: "Security config is not loaded yet. Please try again." }
      }
      const securityMoney = calcSecurityMoney(securityConfig, input.productCost)
      const totalCollectible =
        input.productCost + deliveryCharge + securityMoney

      // Derive the next sequence from the highest existing PF code so codes
      // stay unique even as orders are added/removed (length-based counting
      // could repeat a code).
      const maxSeq = orders.reduce((max, o) => {
        const n = Number.parseInt(o.code.replace(/^PF-/, ""), 10)
        return Number.isFinite(n) && n > max ? n : max
      }, 100258)
      const seq = maxSeq + 1
      const order: Order = {
        id: `ord_${Math.random().toString(36).slice(2, 8)}`,
        code: `PF-${seq}`,
        merchantId: currentMerchant.id,
        pickupLocationId: input.pickupLocationId,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        deliveryAddress: input.deliveryAddress,
        deliveryCity: input.deliveryCity,
        parcelWeightKg: weight,
        deliveryType: input.deliveryType,
        productCost: input.productCost,
        deliveryCharge,
        securityMoney,
        totalCollectible,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        deliveryAttempts: 0,
      }
      setOrders((prev) => [order, ...prev])
      return { ok: true, order }
    },
    [securityConfig, orders],
  )

  // --- Phase 4: Order approval & pickup assignment (admin) ----------------

  const approveAndAssignOrder = useCallback<
    PlatformContextValue["approveAndAssignOrder"]
  >(
    (orderId, riderId) => {
      const order = orders.find((o) => o.id === orderId)
      if (!order) {
        return { ok: false, error: "Order not found." }
      }
      if (order.status !== "PENDING") {
        return { ok: false, error: "Only pending orders can be approved." }
      }
      const rider = riders.find((r) => r.id === riderId)
      if (!rider || !rider.isActive) {
        return { ok: false, error: "Select an active pickup rider." }
      }
      // Pickup riders collect from merchants and are not based at a warehouse.
      // Warehouse-based (delivery) riders cannot be assigned as pickup riders.
      if (rider.warehouseId) {
        return {
          ok: false,
          error: "Select a pickup rider — this rider is a warehouse delivery rider.",
        }
      }
      // Verify weight compliance against the merchant's max weight rule.
      const merchant = merchants.find((m) => m.id === order.merchantId)
      if (merchant && order.parcelWeightKg > merchant.maxWeightKg) {
        return {
          ok: false,
          error: `Parcel weight exceeds the ${merchant.maxWeightKg} KG limit and cannot be approved.`,
        }
      }
      const now = new Date().toISOString()
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "APPROVED",
                approvedBy: currentUser?.name ?? "Admin",
                approvedAt: now,
                pickupRiderId: riderId,
                assignedAt: now,
              }
            : o,
        ),
      )
      return { ok: true }
    },
    [orders, riders, merchants, currentUser?.name],
  )

  // --- Phase 5: Pickup from merchant (rider) ------------------------------

  // The rider profile for the logged-in rider user (if any).
  const currentRider =
    currentUser?.role === "RIDER" && currentUser.riderId
      ? (riders.find((r) => r.id === currentUser.riderId) ?? null)
      : null

  const markOrderPickedUp = useCallback<
    PlatformContextValue["markOrderPickedUp"]
  >(
    (orderId) => {
      if (!currentRider) {
        return { ok: false, error: "No rider context for current user." }
      }
      const order = orders.find((o) => o.id === orderId)
      if (!order) {
        return { ok: false, error: "Order not found." }
      }
      // A rider may only collect parcels assigned to them.
      if (order.pickupRiderId !== currentRider.id) {
        return { ok: false, error: "This pickup is not assigned to you." }
      }
      if (order.status !== "APPROVED") {
        return {
          ok: false,
          error: "Only approved orders awaiting pickup can be collected.",
        }
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "PICKED_UP",
                pickedUpAt: new Date().toISOString(),
              }
            : o,
        ),
      )
      return { ok: true }
    },
    [orders],
  )

  // --- Phase 6: Parcel submitted to warehouse (warehouse admin) -----------

  // The warehouse managed by the logged-in Warehouse Admin (if any).
  const currentWarehouse =
    currentUser?.role === "WAREHOUSE_ADMIN" && currentUser.warehouseId
      ? (warehouses.find((w) => w.id === currentUser.warehouseId) ?? null)
      : null

  const receiveOrderAtWarehouse = useCallback<
    PlatformContextValue["receiveOrderAtWarehouse"]
  >(
    (orderId) => {
      if (!currentWarehouse) {
        return { ok: false, error: "No warehouse context for current user." }
      }
      const order = orders.find((o) => o.id === orderId)
      if (!order) {
        return { ok: false, error: "Order not found." }
      }
      // Only parcels a rider has picked up can be logged into the warehouse.
      if (order.status !== "PICKED_UP") {
        return {
          ok: false,
          error: "Only picked-up parcels can be received into the warehouse.",
        }
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "IN_WAREHOUSE",
                warehouseId: currentWarehouse.id,
                receivedAtWarehouseAt: new Date().toISOString(),
                receivedByWarehouse: currentUser?.name ?? "Warehouse Admin",
              }
            : o,
        ),
      )
      return { ok: true }
    },
    [orders, currentUser?.name],
  )

  // --- Phase 7: Delivery rider assignment (warehouse admin) ---------------

  // Active delivery riders based at the logged-in admin's warehouse. A
  // Warehouse Admin can only dispatch parcels to riders at their own hub.
  const warehouseDeliveryRiders = currentWarehouse
    ? riders.filter(
        (r) => r.warehouseId === currentWarehouse.id && r.isActive,
      )
    : []

  const assignDeliveryRider = useCallback<
    PlatformContextValue["assignDeliveryRider"]
  >(
    (orderId, riderId) => {
      if (!currentWarehouse) {
        return { ok: false, error: "No warehouse context for current user." }
      }
      const order = orders.find((o) => o.id === orderId)
      if (!order) {
        return { ok: false, error: "Order not found." }
      }
      // Only parcels held in this warehouse can be dispatched.
      if (order.status !== "IN_WAREHOUSE") {
        return {
          ok: false,
          error: "Only parcels held in the warehouse can be dispatched.",
        }
      }
      if (order.warehouseId !== currentWarehouse.id) {
        return {
          ok: false,
          error: "This parcel is held at a different warehouse.",
        }
      }
      // The delivery rider must be active and based at this warehouse.
      const rider = riders.find((r) => r.id === riderId)
      if (!rider || !rider.isActive) {
        return { ok: false, error: "Select an active delivery rider." }
      }
      if (rider.warehouseId !== currentWarehouse.id) {
        return {
          ok: false,
          error: "Select a delivery rider based at this warehouse.",
        }
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "IN_TRANSIT",
                deliveryRiderId: riderId,
                dispatchedAt: new Date().toISOString(),
                dispatchedBy: currentUser?.name ?? "Warehouse Admin",
              }
            : o,
        ),
      )
      return { ok: true }
    },
    [orders, riders, currentUser?.name],
  )

  // --- Phase 8: Delivery attempt (delivery rider -> customer) -------------

  // Guard shared by all three transitions: the order must exist and be
  // assigned to the currently logged-in rider as its delivery rider.
  const findMyDeliveryOrder = useCallback(
    (orderId: string): { order?: Order; error?: string } => {
      if (!currentRider) {
        return { error: "No rider context for current user." }
      }
      const order = orders.find((o) => o.id === orderId)
      if (!order) {
        return { error: "Order not found." }
      }
      if (order.deliveryRiderId !== currentRider.id) {
        return { error: "This delivery is not assigned to you." }
      }
      return { order }
    },
    [orders],
  )

  const markOutForDelivery = useCallback<
    PlatformContextValue["markOutForDelivery"]
  >(
    (orderId) => {
      const { order, error } = findMyDeliveryOrder(orderId)
      if (error) return { ok: false, error }
      if (order!.status !== "IN_TRANSIT") {
        return {
          ok: false,
          error: "Only in-transit parcels can be taken out for delivery.",
        }
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "OUT_FOR_DELIVERY",
                outForDeliveryAt: new Date().toISOString(),
                deliveryAttempts: (o.deliveryAttempts ?? 0) + 1,
              }
            : o,
        ),
      )
      return { ok: true }
    },
    [findMyDeliveryOrder],
  )

  const markDelivered = useCallback<PlatformContextValue["markDelivered"]>(
    (orderId, proofRef) => {
      const { order, error } = findMyDeliveryOrder(orderId)
      if (error) return { ok: false, error }
      if (order!.status !== "OUT_FOR_DELIVERY") {
        return {
          ok: false,
          error: "Only out-for-delivery parcels can be marked delivered.",
        }
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "DELIVERED",
                deliveredAt: new Date().toISOString(),
                deliveryProofRef:
                  proofRef ?? `proof_${o.code.toLowerCase()}.jpg`,
                amountCollected: o.totalCollectible,
              }
            : o,
        ),
      )
      return { ok: true }
    },
    [findMyDeliveryOrder],
  )

  const markDeliveryFailed = useCallback<
    PlatformContextValue["markDeliveryFailed"]
  >(
    (orderId, note) => {
      const { order, error } = findMyDeliveryOrder(orderId)
      if (error) return { ok: false, error }
      if (order!.status !== "OUT_FOR_DELIVERY") {
        return {
          ok: false,
          error: "Only out-for-delivery parcels can be marked failed.",
        }
      }
      // A reason is mandatory for a failed attempt.
      if (!note.trim()) {
        return { ok: false, error: "A reason note is required." }
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "FAILED_ATTEMPT",
                failedAttemptAt: new Date().toISOString(),
                failureNote: note.trim(),
              }
            : o,
        ),
      )
      return { ok: true }
    },
    [findMyDeliveryOrder],
  )

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

  // Shared guard: the order must exist, be in FAILED_ATTEMPT, and be held at
  // the current Warehouse Admin's warehouse.
  const findFailedWarehouseOrder = useCallback(
    (orderId: string): { order?: Order; error?: string } => {
      if (!currentWarehouse) {
        return { error: "No warehouse context for current user." }
      }
      const order = orders.find((o) => o.id === orderId)
      if (!order) {
        return { error: "Order not found." }
      }
      if (order.status !== "FAILED_ATTEMPT") {
        return { error: "Only failed-attempt parcels can be resolved." }
      }
      if (order.warehouseId !== currentWarehouse.id) {
        return { error: "This parcel is held at a different warehouse." }
      }
      return { order }
    },
    [orders],
  )

  const reattemptFailedOrder = useCallback<
    PlatformContextValue["reattemptFailedOrder"]
  >(
    (orderId) => {
      const { error } = findFailedWarehouseOrder(orderId)
      if (error) return { ok: false, error }
      const now = new Date().toISOString()
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "OUT_FOR_DELIVERY",
                // Clear the previous failure so the rider sees a fresh attempt.
                failureNote: null,
                failedAttemptAt: null,
                failedResolvedAt: now,
                failedResolvedBy: currentUser?.name ?? "Warehouse Admin",
                outForDeliveryAt: now,
                deliveryAttempts: (o.deliveryAttempts ?? 0) + 1,
              }
            : o,
        ),
      )
      return { ok: true }
    },
    [findFailedWarehouseOrder, currentUser?.name],
  )

  const returnFailedOrder = useCallback<
    PlatformContextValue["returnFailedOrder"]
  >(
    (orderId, reason) => {
      const { error } = findFailedWarehouseOrder(orderId)
      if (error) return { ok: false, error }
      if (!reason.trim()) {
        return { ok: false, error: "A return reason is required." }
      }
      const now = new Date().toISOString()
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "RETURNED",
                failedResolvedAt: now,
                failedResolvedBy: currentUser?.name ?? "Warehouse Admin",
                returnedAt: now,
                returnReason: reason.trim(),
              }
            : o,
        ),
      )
      return { ok: true }
    },
    [findFailedWarehouseOrder, currentUser?.name],
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
    (orderId) => {
      if (!currentWarehouse) {
        return { ok: false, error: "No warehouse context for current user." }
      }
      const order = orders.find((o) => o.id === orderId)
      if (!order) {
        return { ok: false, error: "Order not found." }
      }
      if (order.status !== "DELIVERED") {
        return {
          ok: false,
          error: "Only delivered parcels can be settled.",
        }
      }
      if (order.warehouseId !== currentWarehouse.id) {
        return {
          ok: false,
          error: "This parcel belongs to a different warehouse.",
        }
      }
      if (order.codSettledAt) {
        return { ok: false, error: "This parcel's COD is already settled." }
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                codSettledAt: new Date().toISOString(),
                codSettledBy: currentUser?.name ?? "Warehouse Admin",
              }
            : o,
        ),
      )
      return { ok: true }
    },
    [orders, currentUser?.name],
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
    (input) => {
      if (!currentMerchant) {
        return { ok: false, error: "No merchant context for current user." }
      }
      if (!input.payoutMethod.trim() || !input.payoutDetails.trim()) {
        return {
          ok: false,
          error: "Provide a payout method and account details.",
        }
      }
      const payable = orders.filter(
        (o) =>
          o.merchantId === currentMerchant.id &&
          o.status === "DELIVERED" &&
          Boolean(o.codSettledAt) &&
          !o.payoutRequestId,
      )
      if (payable.length === 0) {
        return { ok: false, error: "No settled funds available to request." }
      }
      const amount = payable.reduce((sum, o) => sum + o.productCost, 0)
      const id = `pr_${Math.random().toString(36).slice(2, 8)}`
      const maxSeq = payoutRequests.reduce((max, p) => {
        const n = Number.parseInt(p.code.replace(/^PR-/, ""), 10)
        return Number.isFinite(n) && n > max ? n : max
      }, 2041)
      const seq = maxSeq + 1
      const request: PayoutRequest = {
        id,
        code: `PR-${seq}`,
        merchantId: currentMerchant.id,
        orderIds: payable.map((o) => o.id),
        amount,
        status: "PENDING",
        payoutMethod: input.payoutMethod.trim(),
        payoutDetails: input.payoutDetails.trim(),
        requestedAt: new Date().toISOString(),
      }
      const payableIds = new Set(payable.map((o) => o.id))
      // Lock the included orders to this request.
      setOrders((prev) =>
        prev.map((o) =>
          payableIds.has(o.id) ? { ...o, payoutRequestId: id } : o,
        ),
      )
      setPayoutRequests((prev) => [request, ...prev])
      return { ok: true, request }
    },
    [orders, payoutRequests],
  )

  const approvePayout = useCallback<PlatformContextValue["approvePayout"]>(
    (requestId) => {
      const request = payoutRequests.find((p) => p.id === requestId)
      if (!request) {
        return { ok: false, error: "Payout request not found." }
      }
      if (request.status !== "PENDING") {
        return { ok: false, error: "Only pending requests can be approved." }
      }
      setPayoutRequests((prev) =>
        prev.map((p) =>
          p.id === requestId
            ? {
                ...p,
                status: "APPROVED",
                reviewedBy: currentUser?.name ?? "Super Admin",
                reviewedAt: new Date().toISOString(),
              }
            : p,
        ),
      )
      return { ok: true }
    },
    [payoutRequests, currentUser?.name],
  )

  const rejectPayout = useCallback<PlatformContextValue["rejectPayout"]>(
    (requestId, reason) => {
      const request = payoutRequests.find((p) => p.id === requestId)
      if (!request) {
        return { ok: false, error: "Payout request not found." }
      }
      if (request.status !== "PENDING") {
        return { ok: false, error: "Only pending requests can be rejected." }
      }
      if (!reason.trim()) {
        return { ok: false, error: "A rejection reason is required." }
      }
      // Unlock the request's orders so they can be requested again.
      const orderIds = new Set(request.orderIds)
      setOrders((prev) =>
        prev.map((o) =>
          orderIds.has(o.id) ? { ...o, payoutRequestId: null } : o,
        ),
      )
      setPayoutRequests((prev) =>
        prev.map((p) =>
          p.id === requestId
            ? {
                ...p,
                status: "REJECTED",
                reviewedBy: currentUser?.name ?? "Super Admin",
                reviewedAt: new Date().toISOString(),
                rejectReason: reason.trim(),
              }
            : p,
        ),
      )
      return { ok: true }
    },
    [payoutRequests, currentUser?.name],
  )

  const markPayoutPaid = useCallback<PlatformContextValue["markPayoutPaid"]>(
    (requestId) => {
      const request = payoutRequests.find((p) => p.id === requestId)
      if (!request) {
        return { ok: false, error: "Payout request not found." }
      }
      if (request.status !== "APPROVED") {
        return { ok: false, error: "Only approved requests can be paid." }
      }
      setPayoutRequests((prev) =>
        prev.map((p) =>
          p.id === requestId
            ? { ...p, status: "PAID", paidAt: new Date().toISOString() }
            : p,
        ),
      )
      return { ok: true }
    },
    [payoutRequests],
  )

  return (
    <PlatformContext.Provider
      value={{
        currentUser,
        isReady,
        login,
        logout,
        securityConfig,
        updateSecurityConfig,
        team,
        createAccount,
        toggleAccountActive,
        togglePricingPermission,
        merchants,
        registerMerchant,
        approveMerchant,
        suspendMerchant,
        reactivateMerchant,
        setMerchantPricing,
        orders,
        pickupLocations,
        currentMerchant,
        createOrder,
        riders,
        approveAndAssignOrder,
        currentRider,
        markOrderPickedUp,
        warehouses,
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
