// lib/db/seed-credentials.ts
// Dev-only — never import this in production code paths

export const SEED_CREDENTIALS = [{
  label: "Nadia Rahman",
  email: "superadmin@parcelflow.io",
  password: "superadmin123",
  role: "Super Admin"
}, {label: "Tanvir Hossain", email: "tanvir@parcelflow.io", password: "admin123", role: "Admin"}, {
  label: "Sadia Karim",
  email: "sadia@parcelflow.io",
  password: "admin123",
  role: "Admin"
}, {
  label: "Rifat Chowdhury",
  email: "rifat@parcelflow.io",
  password: "warehouse123",
  role: "Warehouse Admin"
}, {
  label: "Maliha Akter",
  email: "maliha@parcelflow.io",
  password: "warehouse123",
  role: "Warehouse Admin"
}, {
  label: "Imran Kabir",
  email: "imran@threadline.com",
  password: "merchant123",
  role: "Merchant"
}, {
  label: "Farzana Yasmin",
  email: "farzana@greenleaf.com",
  password: "merchant123",
  role: "Merchant"
}, {label: "Jahangir Alam", email: "jahangir@parcelflow.io", password: "rider123", role: "Rider"}, {
  label: "Shahin Mia",
  email: "shahin@parcelflow.io",
  password: "rider123",
  role: "Rider"
}, {label: "Rasel Khan", email: "rasel@parcelflow.io", password: "rider123", role: "Rider"}, {
  label: "Kamrul Islam",
  email: "kamrul@parcelflow.io",
  password: "rider123",
  role: "Rider"
},] as const
