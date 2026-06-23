# ParcelFlow — Feature Flow

ParcelFlow is a B2B delivery and logistics platform that manages the full parcel lifecycle across four roles: **Super Admin**, **Admin**, **Merchant**, **Warehouse**, and **Rider**. Each role has its own isolated portal. Anyone can track an order publicly without logging in.

---

## Roles at a Glance

| Role | Portal | Responsibility |
|---|---|---|
| Super Admin | `/dashboard` | Platform oversight, team & infrastructure management |
| Admin | `/dashboard` | Day-to-day operations, merchants, riders, payouts |
| Warehouse | `/warehouse` | Intake, dispatch, exceptions, cash reconciliation |
| Merchant | `/merchant` | Place orders, track deliveries, manage finances |
| Rider | `/rider` | Pickup and delivery queues |
| Public | `/track` | Track any order by ID — no login needed |

---

## Order Lifecycle

Every parcel moves through these stages in sequence:

```
PENDING → APPROVED → PICKED_UP → AT_WAREHOUSE → DISPATCHED → DELIVERED
                                                           ↘ RETURNED
                                                ↘ EXCEPTION
                    ↘ REJECTED  (at PENDING or APPROVED stage)
```

Each status transition is triggered by a specific role action described below.

---

## 1. Merchant Portal `/merchant`

### Place an Order
1. Merchant selects a **pickup location** (their registered business address or branch).
2. Fills in recipient name, phone, delivery address, and division.
3. Chooses **delivery type** (standard or express).
4. Enters **parcel weight** — the system calculates the delivery charge in real time using the merchant's pricing tier:
    - Base rate covers the free weight allowance.
    - Extra weight above the allowance is billed per kg (rounded up).
    - Orders exceeding the merchant's max weight are blocked.
5. Enters **product cost** (COD amount) — security money is auto-calculated on top (flat fee for low-value parcels, percentage for high-value).
6. Order is created in **PENDING** status and queued for admin review.

### Track & Manage Orders
- View all orders with live status badges.
- See the full status timeline for any individual order.
- Attach delivery map links and proof images when creating an order.

### Finance
- View the running balance of earnings (COD collected minus charges and security money).
- Submit **payout requests** against the available balance.
- Track request status (PENDING → APPROVED / REJECTED).

### Business Profile
- Manage business name, address, and contact details.
- Upload a business avatar (stored via the configured storage backend).

---

## 2. Admin Portal `/dashboard`

### Order Management
- View all orders across all merchants.
- **Approve** a PENDING order → status moves to APPROVED, making it visible to riders for pickup.
- **Reject** a PENDING or APPROVED order → status moves to REJECTED with a reason.
- Filter and search orders by status, merchant, and date.

### Merchant Management
- Review and **activate / deactivate** merchant accounts.
- Set per-merchant **pricing tiers** (base rate, extra rate per kg, free weight, max weight).
- View all orders placed by a merchant.

### Rider Management (Admin only)
- View the full rider roster across all warehouses.
- Edit a rider's **task type** (PICKUP / DELIVERY / BOTH) and **home warehouse**.
- Activate or deactivate rider accounts.

### Payout Requests
- Review merchant payout requests.
- Approve or reject with a note; approved payouts deduct from the merchant's balance.

### Super Admin Extras
- **Team management** — provision and manage Admin and Warehouse Admin accounts.
- **Divisions** — create and manage geographic delivery divisions.
- **Warehouses** — create and manage warehouse hubs.
- **Security money config** — set the platform-wide low-value threshold, flat fee, and high-value percentage used to auto-calculate security money on each order.
- **Payouts** — full visibility across all merchant payout requests.

---

## 3. Warehouse Portal `/warehouse`

### Intake Queue
- Lists all APPROVED orders pending physical receipt at the warehouse.
- Warehouse staff marks parcels as **received** → status moves to AT_WAREHOUSE.

### Dispatch Desk
- Lists all AT_WAREHOUSE orders ready to go out for delivery.
- Assigns a **delivery rider** and dispatches → status moves to DISPATCHED.

### Order Progress
- Full view of all orders currently in the warehouse's pipeline with their status.

### Riders
- Manage riders **scoped to this warehouse only** (task type, active status, details).
- Cannot reassign a rider to a different warehouse (that's Admin-only).

### Exceptions
- Flag a DISPATCHED order as an **exception** (e.g. recipient unreachable, address issue).
- Exceptions are visible to admins for resolution.

### COD Reconciliation
- Track cash-on-delivery amounts collected by riders.
- Mark COD as reconciled once cash is handed over to the warehouse.

---

## 4. Rider Portal `/rider`

### To-do
- Dashboard summary of pending tasks (pickups and deliveries due today).

### Pickup Queue
- Lists APPROVED orders assigned to this rider for merchant pickup.
- Rider marks as **picked up** → status moves to PICKED_UP.
- Upload a **proof photo** at pickup.

### Delivery Queue
- Lists DISPATCHED orders assigned to this rider for final-mile delivery.
- Rider marks as **delivered** → status moves to DELIVERED.
- Or marks as **returned** if delivery failed → status moves to RETURNED.
- Upload a **proof photo** at delivery or return.

---

## 5. Public Order Tracking `/track`

No login required. Anyone with an order ID can:

- Search for an order by ID.
- See the **full status timeline** with timestamps.
- View the delivery area (masked for privacy — shows general area, not the full address).
- See the merchant store name and a masked recipient phone number.
- View delivery proof photos if attached.

---

## Cross-Cutting Features

### Authentication
- Email and password login via **Better Auth**.
- Role-based routing — each role is redirected to its own portal on sign-in.
- Inactive accounts are blocked at login.

### Image Uploads
- Avatars (merchant and rider profiles), pickup-location photos, and delivery proof images.
- Pluggable storage backend controlled by `STORAGE_PROVIDER` in `.env`:
    - `local` — files written to disk, served via the app (default, zero setup).
    - `r2` — files uploaded to Cloudflare R2 and served from a public CDN URL.

### Pricing Engine
- Per-merchant pricing tiers (base rate, extra rate per kg, free weight allowance, max weight).
- Delivery charge calculated at order creation time and locked in on approval.
- Security money (platform fee) calculated separately on the product cost.

### Environment Validation
- All required env vars are validated at server startup using Zod.
- The server refuses to boot with a clear error message listing every missing or invalid variable — no silent misconfiguration in production.
