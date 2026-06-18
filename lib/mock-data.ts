import type {
  User,
  Warehouse,
  SecurityMoneyConfig,
  Merchant,
  PickupLocation,
  Order,
  Rider,
  PayoutRequest,
} from "@/lib/types"

// =============================================================================
// ID reference map (cuid2 — matches what the app layer generates at runtime)
// =============================================================================

// Users
const USR_SUPER    = "byai6ci02ogt3lnawaro35pj"
const USR_ADMIN_01 = "u5f1ybhii5mzu2ejkcckusxn"
const USR_ADMIN_02 = "xr4s7lha6epx9lv9q59n5czu"
const USR_WH_01    = "x60dwd1h0fyp7jxpr86vp8ue"
const USR_WH_02    = "q05x0r1u33o482an65id6dsa"
const USR_MCH_01   = "b7ou67y7wgz52n6h56brvu7a"
const USR_MCH_02   = "g73o2veh2xe6g1053dgrbs0f"
const USR_RDR_01   = "b1vumrk4al17bfcdrh8sy0fx"
const USR_RDR_02   = "fqfr9el8wj8vm6daorxq2aab"
const USR_RDR_03   = "ilqxbvdg73konhlso4w7vqa4"
const USR_RDR_D_01 = "aczezx2g544hbgtun37478zq"

// Warehouses
const WH_DHAKA  = "b5mujkfyyq6qqw5t1unbm8b7"
const WH_CTG    = "op3s6e6t0q4oaerl6boqng1r"
const WH_SYLHET = "u9kbfapo43wkoj65972psioh"

// Riders
const RDR_01   = "wcsub4pe1pk4x5zd7gri7ee2"
const RDR_02   = "q4am2x0nkz1m2a2m47if7vra"
const RDR_03   = "gililvghb53wij1p965csiax"
const RDR_04   = "ksd77tlqpuvwkaygj5ucjjjs"
const RDR_D_01 = "khelbntdjda5h8y3pa7etjd4"
const RDR_D_02 = "zgwc6kqieyjt9oa8txs18n49"
const RDR_D_03 = "ju4o1ji4z9lxwyb1iw4sd5nd"
const RDR_D_04 = "rv4r3rbtyrceo203xzas257d"

// Merchants
const MCH_01 = "ucteju8w92cww2x029etxv67"
const MCH_02 = "uuz3r7ln1o2ipbr12rnowx2q"
const MCH_03 = "ur2kbc58wjhxvkjha2fsjcxc"
const MCH_04 = "y1m2o1zcyftdqes7gd36rwjd"
const MCH_05 = "nsfktk64zjut01r2x93hnweu"

// Pickup locations
const PL_01 = "hu22eapfey4srbcrn87uu8dy"
const PL_02 = "zf18qsus6o4l4cgt98s0d5ng"
const PL_03 = "i8407hm6he3upn30fse0qj4w"

// Orders
const ORD_01 = "drieuxxjt70yx2p21s5itsvs"
const ORD_02 = "hnbwmr22caet61ey365e6irx"
const ORD_03 = "zrwpbc3uawa3dp8p2fm890r6"
const ORD_04 = "vdkisd09zdgxf6csufb9x6t8"
const ORD_05 = "i91xwpi5kbbqozueb8y1hoqx"
const ORD_06 = "ynq7gdy7f1bzvmtjipol9gvh"
const ORD_07 = "wkequtjhojn0fptvaekgd27w"
const ORD_08 = "r5q5zhtr37xjlpmd91k8d48w"
const ORD_09 = "t4sr2h9n3j7ml253k7a9m8xx"
const ORD_10 = "lp77ebws2n5edjk3g21ebi6f"
const ORD_11 = "uzcmncpas06zsjjc4q2bdbyi"
const ORD_12 = "p3gfiuld4l805tixug8pwqjh"
const ORD_13 = "wwywgid7ili0s9tw143wc4u0"
const ORD_14 = "nxu47gm70g9snsbmqc3y6u9j"
const ORD_15 = "q7s1xm0ng2iz4niaqvm7vz4m"
const ORD_16 = "bir2621ivna3xm9ue2e51tiq"
const ORD_17 = "l0n1vgduq8v5sbq0i44c9i40"
const ORD_18 = "gvqst74z0k9azwudqedvfylw"

// Payout requests
const PR_01 = "jokxrrtood7ik5zheahhzp1r"
const PR_02 = "jybrz4o9bx5nefstz1drr1ex"

// =============================================================================
// Users (joined shape of user + profile tables)
// =============================================================================

// The single Super Admin (created via db:seed in the real backend).
export const SUPER_ADMIN: User = {
  id: USR_SUPER,
  name: "Nadia Rahman",
  email: "superadmin@parcelflow.io",
  emailVerified: true,
  phone: "+8801711000001",
  role: "SUPER_ADMIN",
  isActive: true,
  canManagePricing: false,
  createdAt: "2025-01-04T09:00:00Z",
  updatedAt: "2025-01-04T09:00:00Z",
}

// Demo credentials shown on the login screen (Super Admin).
export const DEMO_CREDENTIALS = {
  email: "superadmin@parcelflow.io",
  password: "superadmin123",
}

// Merchant demo credentials (the owner of "Threadline Apparel").
export const MERCHANT_DEMO_CREDENTIALS = {
  email: "imran@threadline.com",
  password: "merchant123",
}

// Rider demo credentials (Shahin Mia, who has assigned pickups in the seed).
export const RIDER_DEMO_CREDENTIALS = {
  email: "shahin@parcelflow.io",
  password: "rider123",
}

// Warehouse Admin demo credentials (Rifat, who manages the Dhaka Central Hub).
export const WAREHOUSE_DEMO_CREDENTIALS = {
  email: "rifat@parcelflow.io",
  password: "warehouse123",
}

// Merchant user accounts. Each is linked to an ACTIVE merchant business.
// (Mock auth: any of these emails log in with password "merchant123".)
export const MERCHANT_USERS: User[] = [
  {
    id: USR_MCH_01,
    name: "Imran Kabir",
    email: "imran@threadline.com",
    emailVerified: true,
    phone: "+8801712345601",
    role: "MERCHANT",
    isActive: true,
    canManagePricing: false,
    merchantId: MCH_01,
    createdAt: "2025-01-12T10:05:00Z",
    updatedAt: "2025-01-12T10:05:00Z",
  },
  {
    id: USR_MCH_02,
    name: "Farzana Yasmin",
    email: "farzana@greenleaf.com",
    emailVerified: true,
    phone: "+8801712345602",
    role: "MERCHANT",
    isActive: true,
    canManagePricing: false,
    merchantId: MCH_02,
    createdAt: "2025-01-13T09:20:00Z",
    updatedAt: "2025-01-13T09:20:00Z",
  },
]

// Rider user accounts. Each is linked to a Rider profile. Pickup riders sign
// in here to see their assigned pickup queue (Phase 5).
// (Mock auth: any of these emails log in with password "rider123".)
export const RIDER_USERS: User[] = [
  {
    id: USR_RDR_01,
    name: "Jahangir Alam",
    email: "jahangir@parcelflow.io",
    emailVerified: true,
    phone: "+8801911000001",
    role: "RIDER",
    isActive: true,
    canManagePricing: false,
    riderId: RDR_01,
    createdAt: "2025-01-08T08:00:00Z",
    updatedAt: "2025-01-08T08:00:00Z",
  },
  {
    id: USR_RDR_02,
    name: "Shahin Mia",
    email: "shahin@parcelflow.io",
    emailVerified: true,
    phone: "+8801911000002",
    role: "RIDER",
    isActive: true,
    canManagePricing: false,
    riderId: RDR_02,
    createdAt: "2025-01-08T08:05:00Z",
    updatedAt: "2025-01-08T08:05:00Z",
  },
  {
    id: USR_RDR_03,
    name: "Rasel Khan",
    email: "rasel@parcelflow.io",
    emailVerified: true,
    phone: "+8801911000003",
    role: "RIDER",
    isActive: true,
    canManagePricing: false,
    riderId: RDR_03,
    createdAt: "2025-01-08T08:10:00Z",
    updatedAt: "2025-01-08T08:10:00Z",
  },
  // Delivery rider login (Kamrul, based at the Dhaka Central Hub). Used for the
  // Phase 8 delivery-attempt demo.
  {
    id: USR_RDR_D_01,
    name: "Kamrul Islam",
    email: "kamrul@parcelflow.io",
    emailVerified: true,
    phone: "+8801911000010",
    role: "RIDER",
    isActive: true,
    canManagePricing: false,
    riderId: RDR_D_01,
    createdAt: "2025-01-09T08:00:00Z",
    updatedAt: "2025-01-09T08:00:00Z",
  },
]

export const INITIAL_SECURITY_MONEY_CONFIG: SecurityMoneyConfig = {
  id: "default",
  lowValueThreshold: 1000,
  lowValueFlatFee: 10,
  highValuePercentage: 1,
  updatedAt: "2025-01-04T09:05:00Z",
  updatedBy: "Nadia Rahman",
}

export const INITIAL_TEAM: User[] = [
  {
    id: USR_ADMIN_01,
    name: "Tanvir Hossain",
    email: "tanvir@parcelflow.io",
    emailVerified: true,
    phone: "+8801711000010",
    role: "ADMIN",
    isActive: true,
    canManagePricing: true,
    createdAt: "2025-01-06T10:30:00Z",
    updatedAt: "2025-01-06T10:30:00Z",
  },
  {
    id: USR_ADMIN_02,
    name: "Sadia Karim",
    email: "sadia@parcelflow.io",
    emailVerified: true,
    phone: "+8801711000011",
    role: "ADMIN",
    isActive: true,
    canManagePricing: false,
    createdAt: "2025-01-09T14:10:00Z",
    updatedAt: "2025-01-09T14:10:00Z",
  },
  {
    id: USR_WH_01,
    name: "Rifat Chowdhury",
    email: "rifat@parcelflow.io",
    emailVerified: true,
    phone: "+8801711000020",
    role: "WAREHOUSE_ADMIN",
    isActive: true,
    canManagePricing: false,
    warehouseId: WH_DHAKA,
    createdAt: "2025-01-07T08:45:00Z",
    updatedAt: "2025-01-07T08:45:00Z",
  },
  {
    id: USR_WH_02,
    name: "Maliha Akter",
    email: "maliha@parcelflow.io",
    emailVerified: true,
    phone: "+8801711000021",
    role: "WAREHOUSE_ADMIN",
    isActive: false,
    canManagePricing: false,
    warehouseId: WH_CTG,
    createdAt: "2025-01-11T11:20:00Z",
    updatedAt: "2025-01-11T11:20:00Z",
  },
]

export const WAREHOUSES: Warehouse[] = [
  {
    id: WH_DHAKA,
    name: "Dhaka Central Hub",
    address: "Plot 22, Tejgaon Industrial Area",
    city: "Dhaka",
    managedBy: USR_WH_01,
    isActive: true,
  },
  {
    id: WH_CTG,
    name: "Chattogram Port Hub",
    address: "Agrabad Commercial Area, Block C",
    city: "Chattogram",
    managedBy: USR_WH_02,
    isActive: true,
  },
  {
    id: WH_SYLHET,
    name: "Sylhet Regional Depot",
    address: "Zindabazar Main Road",
    city: "Sylhet",
    managedBy: null,
    isActive: false,
  },
]

// Default pricing applied to a brand-new (PENDING) merchant. Base rate is 0
// until an Admin assigns it after approval, per the spec.
export const DEFAULT_MERCHANT_PRICING = {
  baseRate: 0,
  extraRatePerKg: 15,
  maxWeightKg: 3,
  freeWeightKg: 1,
}

// Initial merchant directory. Mix of statuses so the management screen has
// pending approvals, priced ACTIVE merchants, and a suspended one.
export const INITIAL_MERCHANTS: Merchant[] = [
  {
    id: MCH_01,
    businessName: "Threadline Apparel",
    ownerName: "Imran Kabir",
    email: "imran@threadline.com",
    phone: "+8801712345601",
    address: "House 14, Road 7, Dhanmondi, Dhaka",
    status: "ACTIVE",
    baseRate: 60,
    extraRatePerKg: 15,
    maxWeightKg: 3,
    freeWeightKg: 1,
    approvedBy: "Nadia Rahman",
    approvedAt: "2025-01-12T10:00:00Z",
    createdAt: "2025-01-10T08:30:00Z",
  },
  {
    id: MCH_02,
    businessName: "GreenLeaf Organics",
    ownerName: "Farzana Yasmin",
    email: "farzana@greenleaf.com",
    phone: "+8801712345602",
    address: "Shop 3, Gulshan Avenue, Dhaka",
    status: "ACTIVE",
    baseRate: 55,
    extraRatePerKg: 20,
    maxWeightKg: 3,
    freeWeightKg: 1,
    approvedBy: "Nadia Rahman",
    approvedAt: "2025-01-13T09:15:00Z",
    createdAt: "2025-01-11T12:00:00Z",
  },
  {
    id: MCH_03,
    businessName: "PixelCase Gadgets",
    ownerName: "Sabbir Ahmed",
    email: "sabbir@pixelcase.com",
    phone: "+8801712345603",
    address: "Level 4, Bashundhara City, Dhaka",
    status: "PENDING",
    baseRate: 0,
    extraRatePerKg: 15,
    maxWeightKg: 3,
    freeWeightKg: 1,
    approvedBy: null,
    approvedAt: null,
    createdAt: "2025-01-18T14:45:00Z",
  },
  {
    id: MCH_04,
    businessName: "Bloom & Co.",
    ownerName: "Naila Haque",
    email: "naila@bloomco.com",
    phone: "+8801712345604",
    address: "Plot 9, Uttara Sector 4, Dhaka",
    status: "PENDING",
    baseRate: 0,
    extraRatePerKg: 15,
    maxWeightKg: 3,
    freeWeightKg: 1,
    approvedBy: null,
    approvedAt: null,
    createdAt: "2025-01-19T11:10:00Z",
  },
  {
    id: MCH_05,
    businessName: "Urban Crate",
    ownerName: "Rezaul Haque",
    email: "rezaul@urbancrate.com",
    phone: "+8801712345605",
    address: "Agrabad Commercial Area, Chattogram",
    status: "SUSPENDED",
    baseRate: 70,
    extraRatePerKg: 15,
    maxWeightKg: 3,
    freeWeightKg: 1,
    approvedBy: "Nadia Rahman",
    approvedAt: "2025-01-09T16:20:00Z",
    createdAt: "2025-01-08T10:00:00Z",
  },
]

// Pickup locations belonging to merchants. Required when creating an order.
export const INITIAL_PICKUP_LOCATIONS: PickupLocation[] = [
  {
    id: PL_01,
    merchantId: MCH_01,
    label: "Main Store — Dhanmondi",
    address: "House 14, Road 7, Dhanmondi, Dhaka",
  },
  {
    id: PL_02,
    merchantId: MCH_01,
    label: "Warehouse — Tejgaon",
    address: "Plot 5, Tejgaon Industrial Area, Dhaka",
  },
  {
    id: PL_03,
    merchantId: MCH_02,
    label: "GreenLeaf Outlet — Gulshan",
    address: "Shop 3, Gulshan Avenue, Dhaka",
  },
]

// Riders available across the lifecycle. Pickup riders (RDR_01–RDR_04) leave
// warehouseId null. Delivery riders (RDR_D_*) are based at a warehouse and are
// the ones a Warehouse Admin can dispatch from that warehouse (Phase 7).
export const INITIAL_RIDERS: Rider[] = [
  {
    id: RDR_01,
    name: "Jahangir Alam",
    phone: "+8801911000001",
    zone: "Dhanmondi / Mohammadpur",
    isActive: true,
    warehouseId: null,
  },
  {
    id: RDR_02,
    name: "Shahin Mia",
    phone: "+8801911000002",
    zone: "Gulshan / Banani",
    isActive: true,
    warehouseId: null,
  },
  {
    id: RDR_03,
    name: "Rasel Khan",
    phone: "+8801911000003",
    zone: "Uttara / Tongi",
    isActive: true,
    warehouseId: null,
  },
  {
    id: RDR_04,
    name: "Forhad Hossain",
    phone: "+8801911000004",
    zone: "Tejgaon / Bashundhara",
    isActive: false,
    warehouseId: null,
  },
  // Delivery riders based at the Dhaka Central Hub (WH_DHAKA).
  {
    id: RDR_D_01,
    name: "Kamrul Islam",
    phone: "+8801911000010",
    zone: "Dhanmondi / Banani",
    isActive: true,
    warehouseId: WH_DHAKA,
  },
  {
    id: RDR_D_02,
    name: "Tareq Aziz",
    phone: "+8801911000011",
    zone: "Uttara / Mirpur",
    isActive: true,
    warehouseId: WH_DHAKA,
  },
  {
    id: RDR_D_03,
    name: "Sohel Rana",
    phone: "+8801911000012",
    zone: "Bashundhara / Badda",
    isActive: false,
    warehouseId: WH_DHAKA,
  },
  // Delivery rider based at the Chattogram Port Hub (WH_CTG).
  {
    id: RDR_D_04,
    name: "Nasir Uddin",
    phone: "+8801911000013",
    zone: "Agrabad / Halishahar",
    isActive: true,
    warehouseId: WH_CTG,
  },
]

// Seed orders for the Threadline merchant so their dashboard isn't empty.
export const INITIAL_ORDERS: Order[] = [
  {
    id: ORD_01,
    code: "PF-100231",
    merchantId: MCH_01,
    pickupLocationId: PL_01,
    recipientName: "Sumaiya Islam",
    recipientPhone: "+8801811112233",
    deliveryAddress: "Flat B2, Road 11, Banani, Dhaka",
    deliveryCity: "Dhaka",
    parcelWeightKg: 2,
    deliveryType: "STANDARD",
    productCost: 5000,
    deliveryCharge: 75,
    securityMoney: 50,
    totalCollectible: 5125,
    status: "DELIVERED",
    createdAt: "2025-01-15T09:30:00Z",
    approvedBy: "Tanvir Hossain",
    approvedAt: "2025-01-15T10:05:00Z",
    pickupRiderId: RDR_02,
    assignedAt: "2025-01-15T10:06:00Z",
    pickedUpAt: "2025-01-15T11:00:00Z",
    warehouseId: WH_DHAKA,
    receivedAtWarehouseAt: "2025-01-15T12:00:00Z",
    receivedByWarehouse: "Rifat Chowdhury",
    deliveryRiderId: RDR_D_01,
    dispatchedAt: "2025-01-15T13:00:00Z",
    dispatchedBy: "Rifat Chowdhury",
    outForDeliveryAt: "2025-01-15T14:00:00Z",
    deliveredAt: "2025-01-15T16:30:00Z",
    deliveryProofRef: "proof_pf-100231.jpg",
    amountCollected: 5125,
    deliveryAttempts: 1,
    // Cash settled by the rider but not yet requested for payout — shows up as
    // available funds on the merchant's financial dashboard (Phase 9).
    codSettledAt: "2025-01-15T18:00:00Z",
    codSettledBy: "Rifat Chowdhury",
  },
  {
    id: ORD_02,
    code: "PF-100247",
    merchantId: MCH_01,
    pickupLocationId: PL_01,
    recipientName: "Rakib Hasan",
    recipientPhone: "+8801822223344",
    deliveryAddress: "House 7, Sector 10, Uttara, Dhaka",
    deliveryCity: "Dhaka",
    parcelWeightKg: 0.8,
    deliveryType: "FRAGILE",
    productCost: 800,
    deliveryCharge: 60,
    securityMoney: 10,
    totalCollectible: 870,
    status: "IN_TRANSIT",
    createdAt: "2025-01-19T13:10:00Z",
    deliveryAttempts: 0,
    approvedBy: "Tanvir Hossain",
    approvedAt: "2025-01-19T13:40:00Z",
    pickupRiderId: RDR_03,
    assignedAt: "2025-01-19T13:41:00Z",
    pickedUpAt: "2025-01-19T14:20:00Z",
    warehouseId: WH_DHAKA,
    receivedAtWarehouseAt: "2025-01-19T16:00:00Z",
    receivedByWarehouse: "Rifat Chowdhury",
    deliveryRiderId: RDR_D_01,
    dispatchedAt: "2025-01-19T17:30:00Z",
    dispatchedBy: "Rifat Chowdhury",
  },
  {
    id: ORD_03,
    code: "PF-100258",
    merchantId: MCH_01,
    pickupLocationId: PL_02,
    recipientName: "Tania Ahmed",
    recipientPhone: "+8801833334455",
    deliveryAddress: "Plot 19, Bashundhara R/A, Dhaka",
    deliveryCity: "Dhaka",
    parcelWeightKg: 3,
    deliveryType: "STANDARD",
    productCost: 12000,
    deliveryCharge: 90,
    securityMoney: 120,
    totalCollectible: 12210,
    status: "PENDING",
    createdAt: "2025-01-20T11:45:00Z",
    deliveryAttempts: 0,
  },
  {
    id: ORD_04,
    code: "PF-100260",
    merchantId: MCH_02,
    pickupLocationId: PL_03,
    recipientName: "Nusrat Jahan",
    recipientPhone: "+8801844445566",
    deliveryAddress: "Flat 5C, Road 27, Gulshan 1, Dhaka",
    deliveryCity: "Dhaka",
    parcelWeightKg: 1.5,
    deliveryType: "STANDARD",
    productCost: 2200,
    deliveryCharge: 65,
    securityMoney: 22,
    totalCollectible: 2287,
    status: "PENDING",
    createdAt: "2025-01-20T15:20:00Z",
    deliveryAttempts: 0,
  },
  {
    id: ORD_05,
    code: "PF-100261",
    merchantId: MCH_01,
    pickupLocationId: PL_01,
    recipientName: "Imtiaz Mahmud",
    recipientPhone: "+8801855556677",
    deliveryAddress: "House 22, Road 5, Dhanmondi, Dhaka",
    deliveryCity: "Dhaka",
    parcelWeightKg: 0.5,
    deliveryType: "FRAGILE",
    productCost: 650,
    deliveryCharge: 60,
    securityMoney: 10,
    totalCollectible: 720,
    status: "PENDING",
    createdAt: "2025-01-21T08:55:00Z",
    deliveryAttempts: 0,
  },
  // Approved orders awaiting pickup, assigned to Shahin Mia (RDR_02) — these
  // populate the rider's pickup queue for the Phase 5 demo.
  {
    id: ORD_06,
    code: "PF-100262",
    merchantId: MCH_01,
    pickupLocationId: PL_01,
    recipientName: "Adnan Sami",
    recipientPhone: "+8801866667788",
    deliveryAddress: "Flat 4A, Road 12, Banani, Dhaka",
    deliveryCity: "Dhaka",
    parcelWeightKg: 1.2,
    deliveryType: "STANDARD",
    productCost: 1800,
    deliveryCharge: 75,
    securityMoney: 18,
    totalCollectible: 1893,
    status: "APPROVED",
    createdAt: "2025-01-21T10:15:00Z",
    deliveryAttempts: 0,
    approvedBy: "Tanvir Hossain",
    approvedAt: "2025-01-21T10:40:00Z",
    pickupRiderId: RDR_02,
    assignedAt: "2025-01-21T10:41:00Z",
  },
  {
    id: ORD_07,
    code: "PF-100263",
    merchantId: MCH_02,
    pickupLocationId: PL_03,
    recipientName: "Lamia Chowdhury",
    recipientPhone: "+8801877778899",
    deliveryAddress: "House 9, Road 27, Gulshan 1, Dhaka",
    deliveryCity: "Dhaka",
    parcelWeightKg: 2.5,
    deliveryType: "FRAGILE",
    productCost: 3200,
    deliveryCharge: 95,
    securityMoney: 32,
    totalCollectible: 3327,
    status: "APPROVED",
    createdAt: "2025-01-21T11:05:00Z",
    deliveryAttempts: 0,
    approvedBy: "Tanvir Hossain",
    approvedAt: "2025-01-21T11:30:00Z",
    pickupRiderId: RDR_02,
    assignedAt: "2025-01-21T11:31:00Z",
  },
  // Picked-up parcels en route to the warehouse — these populate the Warehouse
  // Admin intake queue for the Phase 6 demo.
  {
    id: ORD_08,
    code: "PF-100264",
    merchantId: MCH_01,
    pickupLocationId: PL_01,
    recipientName: "Faria Tabassum",
    recipientPhone: "+8801888889900",
    deliveryAddress: "House 31, Road 8, Dhanmondi, Dhaka",
    deliveryCity: "Dhaka",
    parcelWeightKg: 1,
    deliveryType: "STANDARD",
    productCost: 1500,
    deliveryCharge: 60,
    securityMoney: 15,
    totalCollectible: 1575,
    status: "PICKED_UP",
    createdAt: "2025-01-21T09:10:00Z",
    deliveryAttempts: 0,
    approvedBy: "Tanvir Hossain",
    approvedAt: "2025-01-21T09:30:00Z",
    pickupRiderId: RDR_01,
    assignedAt: "2025-01-21T09:31:00Z",
    pickedUpAt: "2025-01-21T10:05:00Z",
  },
  {
    id: ORD_09,
    code: "PF-100265",
    merchantId: MCH_02,
    pickupLocationId: PL_03,
    recipientName: "Sabbir Rahman",
    recipientPhone: "+8801899990011",
    deliveryAddress: "Flat 7B, Road 11, Banani, Dhaka",
    deliveryCity: "Dhaka",
    parcelWeightKg: 2.2,
    deliveryType: "FRAGILE",
    productCost: 4200,
    deliveryCharge: 85,
    securityMoney: 42,
    totalCollectible: 4327,
    status: "PICKED_UP",
    createdAt: "2025-01-21T09:40:00Z",
    deliveryAttempts: 0,
    approvedBy: "Sadia Karim",
    approvedAt: "2025-01-21T10:00:00Z",
    pickupRiderId: RDR_03,
    assignedAt: "2025-01-21T10:01:00Z",
    pickedUpAt: "2025-01-21T10:50:00Z",
  },
  // Parcels already received into the Dhaka Central Hub (WH_DHAKA) awaiting a
  // delivery rider — these populate the Warehouse Admin dispatch queue for the
  // Phase 7 demo.
  {
    id: ORD_10,
    code: "PF-100266",
    merchantId: MCH_01,
    pickupLocationId: PL_01,
    recipientName: "Mizanur Rahman",
    recipientPhone: "+8801800001122",
    deliveryAddress: "House 5, Road 16, Dhanmondi, Dhaka",
    deliveryCity: "Dhaka",
    parcelWeightKg: 1.4,
    deliveryType: "STANDARD",
    productCost: 2600,
    deliveryCharge: 70,
    securityMoney: 26,
    totalCollectible: 2696,
    status: "IN_WAREHOUSE",
    createdAt: "2025-01-21T08:20:00Z",
    deliveryAttempts: 0,
    approvedBy: "Tanvir Hossain",
    approvedAt: "2025-01-21T08:45:00Z",
    pickupRiderId: RDR_01,
    assignedAt: "2025-01-21T08:46:00Z",
    pickedUpAt: "2025-01-21T09:30:00Z",
    warehouseId: WH_DHAKA,
    receivedAtWarehouseAt: "2025-01-21T11:15:00Z",
    receivedByWarehouse: "Rifat Chowdhury",
  },
  {
    id: ORD_11,
    code: "PF-100267",
    merchantId: MCH_02,
    pickupLocationId: PL_03,
    recipientName: "Anika Tasnim",
    recipientPhone: "+8801800002233",
    deliveryAddress: "Flat 9C, Road 7, Uttara Sector 4, Dhaka",
    deliveryCity: "Dhaka",
    parcelWeightKg: 0.9,
    deliveryType: "FRAGILE",
    productCost: 1100,
    deliveryCharge: 55,
    securityMoney: 11,
    totalCollectible: 1166,
    status: "IN_WAREHOUSE",
    createdAt: "2025-01-21T08:55:00Z",
    deliveryAttempts: 0,
    approvedBy: "Sadia Karim",
    approvedAt: "2025-01-21T09:10:00Z",
    pickupRiderId: RDR_02,
    assignedAt: "2025-01-21T09:11:00Z",
    pickedUpAt: "2025-01-21T10:00:00Z",
    warehouseId: WH_DHAKA,
    receivedAtWarehouseAt: "2025-01-21T11:40:00Z",
    receivedByWarehouse: "Rifat Chowdhury",
  },
  // Parcels dispatched to delivery rider Kamrul (RDR_D_01) — these populate the
  // delivery rider's queue for the Phase 8 delivery-attempt demo.
  {
    id: ORD_12,
    code: "PF-100268",
    merchantId: MCH_01,
    pickupLocationId: PL_01,
    recipientName: "Farhana Akter",
    recipientPhone: "+8801800003344",
    deliveryAddress: "House 22, Road 11, Banani, Dhaka",
    deliveryCity: "Dhaka",
    parcelWeightKg: 1.1,
    deliveryType: "STANDARD",
    productCost: 1900,
    deliveryCharge: 60,
    securityMoney: 19,
    totalCollectible: 1979,
    status: "IN_TRANSIT",
    createdAt: "2025-01-21T07:50:00Z",
    deliveryAttempts: 0,
    approvedBy: "Tanvir Hossain",
    approvedAt: "2025-01-21T08:05:00Z",
    pickupRiderId: RDR_01,
    assignedAt: "2025-01-21T08:06:00Z",
    pickedUpAt: "2025-01-21T08:50:00Z",
    warehouseId: WH_DHAKA,
    receivedAtWarehouseAt: "2025-01-21T10:30:00Z",
    receivedByWarehouse: "Rifat Chowdhury",
    deliveryRiderId: RDR_D_01,
    dispatchedAt: "2025-01-21T12:15:00Z",
    dispatchedBy: "Rifat Chowdhury",
  },
  {
    id: ORD_13,
    code: "PF-100269",
    merchantId: MCH_02,
    pickupLocationId: PL_03,
    recipientName: "Sabbir Ahmed",
    recipientPhone: "+8801800004455",
    deliveryAddress: "Flat 4B, Road 27, Dhanmondi, Dhaka",
    deliveryCity: "Dhaka",
    parcelWeightKg: 0.6,
    deliveryType: "STANDARD",
    productCost: 850,
    deliveryCharge: 50,
    securityMoney: 9,
    totalCollectible: 909,
    status: "OUT_FOR_DELIVERY",
    createdAt: "2025-01-21T07:20:00Z",
    approvedBy: "Sadia Karim",
    approvedAt: "2025-01-21T07:35:00Z",
    pickupRiderId: RDR_02,
    assignedAt: "2025-01-21T07:36:00Z",
    pickedUpAt: "2025-01-21T08:20:00Z",
    warehouseId: WH_DHAKA,
    receivedAtWarehouseAt: "2025-01-21T10:05:00Z",
    receivedByWarehouse: "Rifat Chowdhury",
    deliveryRiderId: RDR_D_01,
    dispatchedAt: "2025-01-21T12:10:00Z",
    dispatchedBy: "Rifat Chowdhury",
    outForDeliveryAt: "2025-01-21T13:00:00Z",
    deliveryAttempts: 1,
  },
  // A parcel whose delivery failed and is now back at the Dhaka Central Hub
  // (WH_DHAKA) awaiting a Warehouse Admin re-attempt / return decision —
  // populates the Phase 8B exceptions queue.
  {
    id: ORD_14,
    code: "PF-100270",
    merchantId: MCH_01,
    pickupLocationId: PL_01,
    recipientName: "Rumana Kabir",
    recipientPhone: "+8801800005566",
    deliveryAddress: "House 8, Road 3, Dhanmondi, Dhaka",
    deliveryCity: "Dhaka",
    parcelWeightKg: 1.3,
    deliveryType: "STANDARD",
    productCost: 2400,
    deliveryCharge: 65,
    securityMoney: 24,
    totalCollectible: 2489,
    status: "FAILED_ATTEMPT",
    createdAt: "2025-01-20T07:10:00Z",
    approvedBy: "Tanvir Hossain",
    approvedAt: "2025-01-20T07:30:00Z",
    pickupRiderId: RDR_01,
    assignedAt: "2025-01-20T07:31:00Z",
    pickedUpAt: "2025-01-20T08:20:00Z",
    warehouseId: WH_DHAKA,
    receivedAtWarehouseAt: "2025-01-20T10:00:00Z",
    receivedByWarehouse: "Rifat Chowdhury",
    deliveryRiderId: RDR_D_01,
    dispatchedAt: "2025-01-20T11:30:00Z",
    dispatchedBy: "Rifat Chowdhury",
    outForDeliveryAt: "2025-01-20T12:40:00Z",
    deliveryAttempts: 1,
    failedAttemptAt: "2025-01-20T15:20:00Z",
    failureNote: "Recipient not available, phone switched off after two calls.",
  },
  // --- Phase 9 demo data --------------------------------------------------
  // Delivered parcels whose COD has NOT been settled by the rider yet — these
  // populate the Warehouse Admin's COD reconciliation queue (steps 44-46).
  {
    id: ORD_15,
    code: "PF-100271",
    merchantId: MCH_01,
    pickupLocationId: PL_01,
    recipientName: "Tahmid Khan",
    recipientPhone: "+8801800006677",
    deliveryAddress: "House 12, Road 9, Dhanmondi, Dhaka",
    deliveryCity: "Dhaka",
    parcelWeightKg: 1.6,
    deliveryType: "STANDARD",
    productCost: 3400,
    deliveryCharge: 70,
    securityMoney: 34,
    totalCollectible: 3504,
    status: "DELIVERED",
    createdAt: "2025-01-21T07:00:00Z",
    approvedBy: "Tanvir Hossain",
    approvedAt: "2025-01-21T07:20:00Z",
    pickupRiderId: RDR_01,
    assignedAt: "2025-01-21T07:21:00Z",
    pickedUpAt: "2025-01-21T08:10:00Z",
    warehouseId: WH_DHAKA,
    receivedAtWarehouseAt: "2025-01-21T10:00:00Z",
    receivedByWarehouse: "Rifat Chowdhury",
    deliveryRiderId: RDR_D_01,
    dispatchedAt: "2025-01-21T11:30:00Z",
    dispatchedBy: "Rifat Chowdhury",
    outForDeliveryAt: "2025-01-21T13:00:00Z",
    deliveredAt: "2025-01-21T15:10:00Z",
    deliveryProofRef: "proof_pf-100271.jpg",
    amountCollected: 3504,
    deliveryAttempts: 1,
  },
  {
    id: ORD_16,
    code: "PF-100272",
    merchantId: MCH_02,
    pickupLocationId: PL_03,
    recipientName: "Nabila Rahman",
    recipientPhone: "+8801800007788",
    deliveryAddress: "Flat 6A, Road 11, Banani, Dhaka",
    deliveryCity: "Dhaka",
    parcelWeightKg: 2.4,
    deliveryType: "FRAGILE",
    productCost: 6200,
    deliveryCharge: 95,
    securityMoney: 62,
    totalCollectible: 6357,
    status: "DELIVERED",
    createdAt: "2025-01-21T06:30:00Z",
    approvedBy: "Sadia Karim",
    approvedAt: "2025-01-21T06:50:00Z",
    pickupRiderId: RDR_02,
    assignedAt: "2025-01-21T06:51:00Z",
    pickedUpAt: "2025-01-21T07:40:00Z",
    warehouseId: WH_DHAKA,
    receivedAtWarehouseAt: "2025-01-21T09:30:00Z",
    receivedByWarehouse: "Rifat Chowdhury",
    deliveryRiderId: RDR_D_01,
    dispatchedAt: "2025-01-21T11:00:00Z",
    dispatchedBy: "Rifat Chowdhury",
    outForDeliveryAt: "2025-01-21T12:30:00Z",
    deliveredAt: "2025-01-21T14:40:00Z",
    deliveryProofRef: "proof_pf-100272.jpg",
    amountCollected: 6357,
    deliveryAttempts: 1,
  },
  // Delivered + COD-settled, attached to a PENDING payout request (locked).
  {
    id: ORD_17,
    code: "PF-100273",
    merchantId: MCH_02,
    pickupLocationId: PL_03,
    recipientName: "Junaid Bashar",
    recipientPhone: "+8801800008899",
    deliveryAddress: "House 3, Road 27, Gulshan 1, Dhaka",
    deliveryCity: "Dhaka",
    parcelWeightKg: 1.2,
    deliveryType: "STANDARD",
    productCost: 2800,
    deliveryCharge: 55,
    securityMoney: 28,
    totalCollectible: 2883,
    status: "DELIVERED",
    createdAt: "2025-01-18T07:00:00Z",
    approvedBy: "Tanvir Hossain",
    approvedAt: "2025-01-18T07:20:00Z",
    pickupRiderId: RDR_02,
    assignedAt: "2025-01-18T07:21:00Z",
    pickedUpAt: "2025-01-18T08:10:00Z",
    warehouseId: WH_DHAKA,
    receivedAtWarehouseAt: "2025-01-18T10:00:00Z",
    receivedByWarehouse: "Rifat Chowdhury",
    deliveryRiderId: RDR_D_01,
    dispatchedAt: "2025-01-18T11:30:00Z",
    dispatchedBy: "Rifat Chowdhury",
    outForDeliveryAt: "2025-01-18T13:00:00Z",
    deliveredAt: "2025-01-18T15:10:00Z",
    deliveryProofRef: "proof_pf-100273.jpg",
    amountCollected: 2883,
    deliveryAttempts: 1,
    codSettledAt: "2025-01-18T18:00:00Z",
    codSettledBy: "Rifat Chowdhury",
    payoutRequestId: PR_01,
  },
  // Delivered + COD-settled, already PAID out in a closed payout request.
  {
    id: ORD_18,
    code: "PF-100274",
    merchantId: MCH_01,
    pickupLocationId: PL_01,
    recipientName: "Mehjabin Haque",
    recipientPhone: "+8801800009900",
    deliveryAddress: "House 5, Road 16, Dhanmondi, Dhaka",
    deliveryCity: "Dhaka",
    parcelWeightKg: 0.9,
    deliveryType: "STANDARD",
    productCost: 1500,
    deliveryCharge: 60,
    securityMoney: 15,
    totalCollectible: 1575,
    status: "DELIVERED",
    createdAt: "2025-01-14T07:00:00Z",
    approvedBy: "Tanvir Hossain",
    approvedAt: "2025-01-14T07:20:00Z",
    pickupRiderId: RDR_01,
    assignedAt: "2025-01-14T07:21:00Z",
    pickedUpAt: "2025-01-14T08:10:00Z",
    warehouseId: WH_DHAKA,
    receivedAtWarehouseAt: "2025-01-14T10:00:00Z",
    receivedByWarehouse: "Rifat Chowdhury",
    deliveryRiderId: RDR_D_01,
    dispatchedAt: "2025-01-14T11:30:00Z",
    dispatchedBy: "Rifat Chowdhury",
    outForDeliveryAt: "2025-01-14T13:00:00Z",
    deliveredAt: "2025-01-14T15:10:00Z",
    deliveryProofRef: "proof_pf-100274.jpg",
    amountCollected: 1575,
    deliveryAttempts: 1,
    codSettledAt: "2025-01-14T18:00:00Z",
    codSettledBy: "Rifat Chowdhury",
    payoutRequestId: PR_02,
  },
]

// Seed payout requests (Phase 9). One PENDING request from GreenLeaf awaiting
// Super Admin review (its order is locked), and one already-PAID request from
// Threadline to show a settled history.
export const INITIAL_PAYOUT_REQUESTS: PayoutRequest[] = [
  {
    id: PR_01,
    code: "PR-2041",
    merchantId: MCH_02,
    orderIds: [ORD_17],
    amount: 2800,
    status: "PENDING",
    payoutMethod: "bKash",
    payoutDetails: "+8801712345602",
    requestedAt: "2025-01-19T09:30:00Z",
  },
  {
    id: PR_02,
    code: "PR-2038",
    merchantId: MCH_01,
    orderIds: [ORD_18],
    amount: 1500,
    status: "PAID",
    payoutMethod: "Bank transfer",
    payoutDetails: "City Bank · A/C 1402300456789",
    requestedAt: "2025-01-15T10:00:00Z",
    reviewedBy: "Nadia Rahman",
    reviewedAt: "2025-01-15T14:00:00Z",
    paidAt: "2025-01-16T11:00:00Z",
  },
]
