// Centralized, structured copy for page headers (titles + subtitles) across
// every console. Grouped by area → page so a screen's wording lives in one
// predictable place. Dynamic parts (the signed-in user's first name, the
// active warehouse) are expressed as functions that take those values, so the
// pages stay the single owners of *data* while this file owns the *words*.

export const pageContent = {
  dashboard: {
    overview: {
      title: (firstName: string) => `Welcome back, ${firstName}`,
      description:
        "Your command center for approvals, riders, merchants, and daily delivery operations.",
      // Shown instead of `description` while the platform still needs setup.
      setupDescription:
        "Finish the setup checklist below to start onboarding merchants and moving parcels.",
    },
    orders: {
      title: "Order approvals",
      description:
        "Review pending orders, verify weight compliance, then approve and assign a pickup rider.",
    },
    securityMoney: {
      title: "Security money rules",
      description:
        "Configure how the refundable security amount is calculated on every order. These rules apply to all merchants.",
    },
    team: {
      title: "Team & admins",
      description:
        "Create and manage Admin and Warehouse Admin accounts, and control who can set merchant pricing.",
    },
    merchants: {
      title: "Merchants",
      description:
        "Review new registrations, approve businesses, and set each merchant's delivery pricing.",
    },
    divisions: {
      title: "Divisions",
      description:
        "Manage the geographic divisions used across warehouses, merchants, pickup locations, and delivery addresses.",
    },
    warehouses: {
      title: "Warehouses",
      description:
        "Manage the warehouse hubs parcels are routed through, dispatched from, and reconciled at.",
    },
    payouts: {
      title: "Merchant payouts",
      description:
        "Review payout requests against delivered, COD-settled orders. Approving locks the amount; rejecting releases the orders back to the merchant.",
    },
    riders: {
      title: "Riders",
      description:
        "Manage the rider roster. Every rider belongs to a warehouse; their task type controls whether they pick up, deliver, or both.",
    },
    auditLogs: {
      title: "Audit logs",
      description:
        "A read-only trail of state-changing actions across the platform — who did what, and when.",
    },
    emailLogs: {
      title: "Email logs",
      description:
        "Every transactional email the platform has attempted to send, including delivery failures.",
    },
    announcements: {
      title: "Announcements",
      description:
        "Create and manage platform-wide announcements targeted at specific roles.",
    },
    announcementsInbox: {
      title: "Inbox",
      description: "Active platform announcements targeted at your role.",
    },
  },
  warehouse: {
    riders: {
      title: (firstName: string) => `Riders, ${firstName}`,
      description: (warehouseName: string) =>
        `Manage the riders based at ${warehouseName} — update their details, task type, and active status.`,
    },
    orders: {
      title: (firstName: string) => `Order progress, ${firstName}`,
      description: (warehouseName: string) =>
        `Track every parcel moving through ${warehouseName}, from intake to delivery.`,
    },
    intake: {
      title: (firstName: string) => `Warehouse intake, ${firstName}`,
      description: (warehouseName: string) =>
        `Receive picked-up parcels into ${warehouseName} and log them into inventory.`,
    },
    dispatch: {
      title: (firstName: string) => `Dispatch desk, ${firstName}`,
      description: (warehouseName: string) =>
        `Assign delivery riders to parcels waiting in ${warehouseName} and send them out for the final mile.`,
    },
    exceptions: {
      title: (firstName: string) => `Exceptions desk, ${firstName}`,
      description: (warehouseName: string) =>
        `Resolve failed delivery attempts at ${warehouseName} — re-attempt the delivery or close the parcel as a return.`,
    },
    reconciliation: {
      title: (firstName: string) => `COD reconciliation, ${firstName}`,
      description:
        "Match collected cash against delivered orders. The platform keeps delivery charge and security money; product cost becomes payable to the merchant.",
    },
    announcements: {
      title: "Inbox",
      description: "Active platform announcements from the ParcelFlow team.",
    },
  },
  rider: {
    todo: {
      title: (firstName: string) => `Today's tasks, ${firstName}`,
      description:
        "Every pickup and delivery that needs your attention right now, in one place.",
    },
    pickup: {
      title: (firstName: string) => `Pickup queue, ${firstName}`,
      description:
        "Collect approved parcels from merchants and confirm each pickup as you go.",
    },
    delivery: {
      title: (firstName: string) => `Delivery queue, ${firstName}`,
      description:
        "Take dispatched parcels out for delivery and record each outcome on the spot.",
    },
    announcements: {
      title: "Inbox",
      description: "Active platform announcements from the ParcelFlow team.",
    },
  },
  merchant: {
    overview: {
      title: (firstName: string) => `Welcome back, ${firstName}`,
      description:
        "Book new deliveries and follow every parcel from pickup to doorstep in real time.",
    },
    business: {
      title: "Business profile",
      description:
        "Keep your business contact details current and review the delivery pricing set for your account.",
      // Shown when no business is linked to the signed-in account yet.
      missingDescription:
        "Manage your business details and view your delivery pricing.",
    },
    newOrder: {
      title: "New delivery order",
      description:
        "Add one or more parcels and watch delivery charges update live as you enter details.",
    },
    finance: {
      title: "Finances & payouts",
      description:
        "Track your available balance and request payouts. Payouts cover product cost only — delivery charge and security money are retained by the platform.",
    },
    announcements: {
      title: "Inbox",
      description: "Active platform announcements.",
    },
  },
} as const
