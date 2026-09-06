# SwiftPOS — Enterprise-Grade Multi-Tenant POS Transformation Plan
> **Goal:** Evolve the current single-codebase Vanilla/Express POS (`D:\projects\POS`) into a **small-business-friendly but enterprise-capable, multi-tenant SaaS POS** with 3 monetized tiers (Basic / Standard / Premium), a **Capacitor mobile app** sharing the web codebase, **printer + inventory integration, RBAC, reporting, M-Pesa & bank payments, AI analytics (Premium)**, and a **Super Admin (Owner) portal** to govern all vendors/tenants with strict data isolation.

**Version:** 1.0 — 2026-09-06  
**Owner:** Codecine Creations (Platform Owner)  
**Repo:** `POSVanillaVersion` (Express 5 + Mongoose 8 + Vanilla HTML/Tailwind)

---

## Table of Contents
1. [Vision & Principles](#1-vision--principles)
2. [Current State Audit](#2-current-state-audit)
3. [Target Architecture](#3-target-architecture)
4. [Tier Feature Matrix (The Core Monetization)](#4-tier-feature-matrix)
5. [Domain Model & Multi-Tenancy Design](#5-domain-model--multi-tenancy-design)
6. [Module Specifications](#6-module-specifications)
7. [Mobile App (Capacitor - Same Codebase)](#7-mobile-app-capacitor--same-codebase)
8. [Printer Integration](#8-printer-integration)
9. [RBAC & Access Control](#9-rbac--access-control)
10. [Reporting & AI Analytics](#10-reporting--ai-analytics)
11. [Payments (M-Pesa / Banks / Cards)](#11-payments--m-pesa--banks--cards)
12. [Super Admin Portal (Platform Owner)](#12-super-admin-portal-platform-owner)
13. [Cross-Cutting Concerns](#13-cross-cutting-concerns)
14. [Execution Roadmap (Phased)](#14-execution-roadmap-phased)
15. [API & Route Map](#15-api--route-map)
16. [File / Folder Structure (Target)](#16-file--folder-structure-target)
17. [Acceptance Criteria & QA](#17-acceptance-criteria--qa)
18. [Risks & Mitigations](#18-risks--mitigations)
19. [Next Actions](#19-next-actions)

---

## 1. Vision & Principles

**Vision:** One installable codebase → Work on laptop/tablet/phone → Works offline → Prints everywhere → Grows from kiosk to 50-branch chain without migration.

**Design Principles:**
- **Mobile-first but desktop-class:** Tailwind UI already done; keep `public/` as single SPA-like source, wrap with Capacitor.
- **Tenant isolation by default:** Every `business` is a tenant. All queries scoped `business = req.user.business`. SuperAdmin bypasses via separate auth domain.
- **Tier = Capability Gate, not UI fork:** Same code, feature flags from `Plan` + middleware `requireFeature(flag)`.
- **Enterprise from day 1:** Audit logs, idempotent sales, inventory FIFO/weighted avg, concurrent stock decrement (`findOneAndUpdate` with `$inc` + version), exportable reports.
- **Kenya-first payments:** M-Pesa STK/Paybill is baseline (Basic), Cards/Bank/Paystack is upsell (Premium). Abstracted via `PaymentProvider` interface.

---

## 2. Current State Audit

### What exists and is solid
- `app.js:19` mongoose connect, `config/paymentProviders.config.js:2` placeholder, CORS + CSP headers.
- Models: `models/businessDetails.js:3` (tenant root), `models/user.js:3` (role enum, business FK), `models/inventory.js:3` (business FK), `models/sale.js:3` (business FK, items[]), `models/subscription.model.js:3` (business+plan, status, paystack/mpesa fields), `models/plan.model.js:3` (seeded in `app.js:104` - basic/Standard/premium/trial).
- Controllers: `controllers/business.controller.js:8` register + trial sub, `controllers/sales.controller.js:6` inventory decrement + sale, `controllers/inventory.controller.js:11` CRUD + bulk import/export (csv/xlsx/pdf), `controllers/reports.controller.js:25` overview/product/category.
- Middleware: `middleware/auth.middleware.js:3` `verifyToken`, `middleware/subscription.middleware.js:4` active-subscription gate, `middleware/adminAuth.js:1`.
- Frontend: `public/index.html`, `dashboard.html`, `sales.html:384` modern glass-morphism checkout, printer-ready receipt.

### Critical Gaps (Blocking Enterprise)
| Area | Issue | Evidence |
| :--- | :--- | :--- |
| **Plan model** | Only `userLimit` + `roleManagement`; no feature flags, limits, storage entitlements | `models/plan.model.js:3` |
| **SuperAdmin** | Broken import `require("../models/Admin")` vs `SuperAdmin.js`, no routes wired, duplicated `app.use("/", userRoutes)` | `controllers/superAdmin.controller.js:1`, `app.js:92` |
| **Auth gaps** | No `verifyAdminToken`, no RBAC middleware, `business.getAllBusinesses` signature inverted | `middleware/auth.middleware.js:3`, `controllers/business.controller.js:186` |
| **Tenant leakage** | `getReceipt` not scoped by business, inventory lookup `findById(id, business)` wrong signature | `controllers/sales.controller.js:20`, `controllers/reports.controller.js:110` |
| **Payments** | M-Pesa STK not wired to checkout (only subscription), Paystack `currency: KES` mismatch, env has sandbox 174379 | `controllers/subscriptions.controller.js:52`, `controllers/payments.controller.js` missing |
| **Printing** | No ESC/POS, no QZ/Browser Print, no Capacitor printer plugin | no code |
| **Mobile** | No Capacitor config, `public/index.html` not PWA-manifested | `package.json:21` no capacitor |
| **Reporting** | No profit/loss, tax, low-stock alerts, no date-range filters or exports per tier | `controllers/reports.controller.js:25` |
| **RBAC** | User roles unused in routes; no permission matrix | `routes/*.js` |
| **Observability** | No audit log, no rate limit, weak JWT handling (1d expiry, no refresh) | `app.js:112` |

---

## 3. Target Architecture

```
                ┌─────────────────────────────────┐
                │  Super Admin Portal ( /admin )  │ Owner manages tenants, plans, revenue
                └──────────┬──────────────────────┘
                           │ Admin JWT (role=superadmin)
┌─────────┐   ┌────────────▼────────────┐   ┌──────────────┐
│ Web App │──▶│  Express 5 API (REST)   │◀──│ Capacitor App│ (same public/ + native plugins)
│ public/ │   │  /api/* business-scoped │   │ Android/iOS  │
└─────────┘   └────────────┬────────────┘   └──────┬───────┘
                           │                        │ Bluetooth/ESC-POS/USB
              ┌────────────▼──────────┐    ┌───────▼────────┐
              │ MongoDB (per-tenant   │    │  Printer SDK   │
              │  logical isolation)   │    │  (ESCPOS/Capacitor-Printer) │
              └────────────┬──────────┘    └────────────────┘
                           │
              ┌────────────▼──────────┐
              │ External: M-Pesa Daraja, Paystack, Banks, AI (OpenAI/Gemini), Email, S3 |
              └───────────────────────┘
```

**Stack Decisions (Reuse + Add):**
- **Backend:** Keep Express 5, Mongoose 8, JWT httpOnly cookies, add `helmet`, `express-rate-limit`, `pino`.
- **DB:** MongoDB single cluster, **row-level tenant isolation** (`business` foreign key + compound indexes `{business, _id}`). Choice vs DB-per-tenant: row-level is cheaper for SMB scale; add `tenantId` check in a Mongoose plugin (`tenantPlugin`) that auto-injects `business` filter.
- **Frontend:** Keep Vanilla + Tailwind CDN for now, but introduce `Vite` build step for Capacitor asset bundling. No framework migration required.
- **Mobile:** `Capacitor 6` wrapping `public/` (set `webDir: public`). No duplicate codebase.
- **Auth:** Dual realm: `business token` (payload `{id, business, role}`) vs `superadmin token` (payload `{id, role: superadmin}`) signed with different `JWT_SECRET_SUPERADMIN`.
- **Storage:** Local Mongo for multi-tenant, `uploads/` → migrate to S3-compatible (optional Premium).

---

## 4. Tier Feature Matrix

**Source of truth will be `Plan.features: Map<String, Boolean|Number>` seeded from matrix.**

| Capability | **Basic** (KES 2,000) | **Standard** (KES 3,500) | **Premium** (KES 15,000) | **Trial** (0) |
|---|---:|---:|---:|---:|
| **Users** | 2 max, no roles (admin+cashier only) | 5 max, full RBAC | 20 max (configurable), full RBAC + audit | 1 admin |
| **Products** | 500 SKU limit | Unlimited | Unlimited + Variants/Bundles/BOM | 50 |
| **Branches/Stores** | 1 store | 3 stores | Unlimited + stock transfer | 1 |
| **Inventory** | Basic CRUD + CSV/XLSX import, low-stock badge | + Barcodes, FIFO/WAC valuation, stock alerts email, batch/expiry | + Multi-warehouse, purchase orders, supplier mgmt, stocktake, inter-branch | Basic |
| **Sales / POS Terminal** | Cash, M-Pesa STK Push (Daraja) only | + + Paystack/Cards | + Bank (Pesalink/KCB etc), Split payment, layaway, credit | Cash only |
| **Receipts / Printing** | Browser print + PDF | + 58mm Bluetooth ESC/POS via mobile | + 80mm, USB, network, kitchen printer, auto-reprint | Browser |
| **Offline Mode** | No | Queued sales → sync on reconnect (IndexedDB) | Full offline + conflict resolution | No |
| **Reporting** | Daily sales, total revenue/orders (`reports.controller.js:25`) | + Category, product sales, tax summary, export CSV/Excel | + Profit & loss, COGS, cashier performance, stock movement, custom date range + PDF + scheduled email | Basic |
| **AI Analytics (Premium only)** | — | — | Demand forecast, dead-stock detection, pricing suggestions, anomaly fraud, natural-language Q&A (“best day last month?”) via LLM on aggregated data | — |
| **Customers & Loyalty** | Walk-in only | + Customer directory, debt/credit ledger | + Loyalty points, SMS/email campaigns | None |
| **Support** | Email (72h) | Chat + Email (24h) | Priority Chat + Phone + Dedicated CSM | Community |
| **API / Integrations** | — | Read-only sales API | Full REST + webhooks + accounting (QuickBooks/Xero) | — |
| **Duration** | Monthly | Monthly | Monthly / Annual (-15%) | 30 days |

**Enforcement:**
```js
// middleware/tier.middleware.js:10
function requireFeature(flag, limit) // checks req.subscription.plan.features[flag]
// e.g., router.post("/inventory/import/xlsx", verifyToken, requireFeature("bulkImport"), controller...)
```

---

## 5. Domain Model & Multi-Tenancy Design

### New / Extended Schemas

**Plan (`models/plan.model.js:3`) — EXTEND:**
```js
{
  name: String, price: Number, description: String,
  billingCycle: {type:String, enum:["monthly","annual"]},
  features: { // replaces userLimit/roleManagement booleans
    maxUsers: Number, maxProducts: Number, maxStores: Number,
    roleManagement: Boolean, multiStore: Boolean, barcode: Boolean,
    offlineMode: Boolean, mpesa: Boolean, cardPayments: Boolean,
    bankPayments: Boolean, printerBluetooth: Boolean, printerNetwork: Boolean,
    reportsBasic: Boolean, reportsAdvanced: Boolean, reportsAIS: Boolean,
    loyalty: Boolean, apiAccess: Boolean
  },
  isActive: Boolean, trialDays: Number
}
```

**Business (`models/businessDetails.js:3`) — EXTEND:**
```js
{ businessName, businessLocation, businessPhone, businessEmail, logoUrl,
  identificationNumber, status: enum[active,suspended,pending],
  tier: ref Plan, settings: ref Settings, stripeCustomerId, mpesaTill,
  createdBySuperAdmin, dateCreated }
```

**Store/Branch (NEW `models/store.model.js`):**
```js
{ business: ref BusinessDetails, name, location, isMain: Boolean, cashiers: [ref User] }
```

**User (`models/user.js:3`) — keep, add:**
```js
{ store: ref Store, permissions: [String], // explicit overrides
  invitedBy, mustChangePassword: Boolean }
```

**Inventory (`models/inventory.js:3`) — EXTEND:**
```js
{ sku, barcode, variantGroup, costPrice, sellingPrice: productPrice,
  quantity: productQuantity, reorderLevel, expiryDate, supplier: ref Supplier,
  store: ref Store, business, valuationMethod, images:[String] }
```

**Sale (`models/sale.js:3`) — EXTEND:**
```js
{ receiptNo: String, store: ref Store, cashier: ref User, customer: ref Customer,
  items:[{productId, quantity, price, costPrice}], subtotal, taxRate, taxAmount, discount, total,
  paymentMethod: enum[cash, mpesa_stk, mpesa_paybill, card, bank, split],
  paymentStatus: enum[paid,pending,failed], mpesaReceipt, splitPayments:[{method, amount}],
  business, createdAt, syncedAt, offlineId }
```

**New models:** `models/customer.model.js`, `models/supplier.model.js`, `models/purchaseOrder.model.js`, `models/auditLog.model.js`, `models/paymentTransaction.model.js`, `models/aiInsight.model.js`.

### Tenant Isolation Pattern

**Mongoose Plugin `utils/tenantPlugin.js`:**
```js
schema.pre(/^find/, function() { if(this.getOptions().skipTenant!==true && this.business) this.where({business}) })
```
- Every request: `req.user.business` injected by `verifyToken`.
- SuperAdmin routes use `skipTenant: true`.
- Compound indexes: `db.inventory.createIndex({business:1, productBatchNumber:1}, {unique:true})`.

**Data Separation Guarantees:**
- Code review checklist: no `find({})` without business filter.
- Automated test: try to fetch another business's product → must 404.

---

## 6. Module Specifications

### 6.1 Auth, Onboarding & Subscription Lifecycle
- **Flow:** Landing `index.html` → `POST /api/business/register` (`controllers/business.controller.js:8`) → auto trial sub (`Subscription: active, trial`) → JWT cookie → `GET /dashboard.html` → `subscriptionChecker.js` gate → upgrade modal via Paystack/M-Pesa.
- **Fixes:** Correct `getAllBusinesses` args (`req,res`), add `verifyAdminToken` to `middleware/auth.middleware.js:3`, separate cookie names `token` vs `adminToken`.
- **Renewal cron:** Nightly job `scripts/checkExpiringSubscriptions.js` → 7/3/1 day email + in-app banner, auto-expire `endDate < now → status=expired`.
- **Paystack upgrade:** Already in `controllers/subscriptions.controller.js:375` `upgradeSubscription` — abstract to `services/paymentService.js` so both Paystack and M-Pesa call same `activateSubscription(business, planId)`.

### 6.2 Inventory
- Keep `controllers/inventory.controller.js:11` CRUD, add:
  - `POST /api/inventory/barcode/lookup` (open barcode DB)
  - `POST /api/inventory/adjust` with audit log (`who, why, delta`)
  - Low-stock trigger: after `findOneAndUpdate $inc`, if `quantity <= reorderLevel` → enqueue email + push.
- **Limits by tier:** `requirePlanLimit("maxProducts")` counts `Inventory.countDocuments({business})` before `addStock`.
- **Bulk ops:** Keep `addStockByCsv`, `uploadProductByXlsx`, add background queue for >1k rows (BullMQ or `setImmediate` chunk).

### 6.3 Sales / Checkout
- Keep `sales.html:416` cart + `controllers/sales.controller.js:6` `processSale`, refactor:
  - Transactional: use Mongoose `session.startTransaction()` for decrement + sale create.
  - Fix `Inventory.findById(item.productId, item.business)` → `findOne({_id, business})` (`sales.controller.js:19` bug).
  - Add `store` scoping, split payments, discount, customer attach.
  - **Tier gate:** `mpesa_stk` allowed Basic+, `card` Standard+, `bank` Premium only.
  - Idempotency: client sends `Idempotency-Key: offlineId`, server `findOne({offlineId, business})` prevents double-charge.

### 6.4 Settings & Business Profile
- Extend `models/settings.js:1` (taxRate, receipt footer, logo, currency KES, mpesaTill mapping).

### 6.5 Support/Chat
- Keep `routes/support.routes.js` + `controllers/support.controller.js` but scope by business. Add SuperAdmin `adminSupport` assignment.

---

## 7. Mobile App (Capacitor — Same Codebase)

**Principle:** *No second codebase.* `public/` is the app.

**Setup Steps:**
```bash
npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init SwiftPOS com.codecine.swiftpos --web-dir=public
npm i @capacitor/preferences @capacitor/network @capacitor/app @capacitor/status-bar
npm i capacitor-printer  # or @robingenz/capacitor-printer
# optional: capacitor-escpos-printer, cordova-plugin-printer (fallback)
npx cap add android
# Vite build copies public -> dist handled already static
```
- **Config `capacitor.config.ts`:**
```ts
{ appId:'com.codecine.swiftpos', webDir:'public', server:{androidScheme:'https'},
  plugins:{ Preferences:{}, Printer:{}, Network:{}} }
```
- **Shared logic:** All `public/js/*.js` remain. Add `public/js/capacitor-bridge.js`:
```js
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { Printer } from 'capacitor-printer';
export const isNative = Capacitor.isNativePlatform();
export async function printReceipt(html){ if(isNative) await Printer.print({html}); else window.print(); }
```
- **Offline:** Use `IndexedDB` (`idb` lib) + `Network` listener. On `sales.js` submit: if `!navigator.onLine`, stash to `pendingSales` queue, display “Queued — will sync”. Background `syncPendingSales()` on `Network.addListener('networkStatusChange')`.
- **Build pipeline:** `npm run build` → `npx cap sync` → `npx cap open android`.
- **Distribution:** Basic/Standard/Premium all get same APK; feature gates remain server-side (JWT).

---

## 8. Printer Integration

| Target | Web (Desktop) | Capacitor Mobile |
| :--- | :--- | :--- |
| **58mm Bluetooth Thermal** | `Web Bluetooth API` + `escpos` lib (experimental) | `capacitor-printer` / `escpos-printer` plugin → `Printer.print({data: escposBuffer})` |
| **80mm USB** | `QZ Tray` or `BrowserPrint` (Zebra) fallback | USB OTG via same plugin |
| **Network (Epson, Star)** | Direct `fetch http://printer-ip:9100` (ESC/POS) via backend proxy `/api/print/proxy` | Same network print |
| **PDF fallback** | Already `exportInventoryPdf` (`inventory.controller.js:489`) + receipt PDF via `pdfkit` | System print share |

**Implementation:**
- `services/printerService.js`: `generateEscPos(sale, storeSettings)` builds buffer (header/logo/text/Qr).
- Endpoint `POST /api/print/receipt/:saleId` → returns `escposBuffer` + `html`.
- Frontend `sales.js:printReceipt(saleId)` → detect native → `CapacitorPrinter.print` else `window.open(receipt.html)`.

---

## 9. RBAC & Access Control

**Roles:**

| Role | Scope | Key Permissions |
| :--- | :--- | :--- |
| `admin` (business owner) | All stores under business | `*` |
| `manager` | Assigned store(s) | inventory:crud, sales:crud, reports:view, users:manage(cashier,inventory) |
| `cashier` | One store | sales:create, sales:viewOwn, inventory:view |
| `inventory` | Inventory only | inventory:crud, reports:stock |
| `superadmin` (platform) | All businesses | tenants:crud, plans:crud, analytics:platform |

**Middleware `middleware/rbac.middleware.js:1` (NEW):**
```js
function authorize(...allowedRoles){ return (req,res,next)=>{ if(!allowedRoles.includes(req.user.role)) return 403; next(); } }
function checkPermission(perm){ /* look up role→perms map + user.permissions overrides */ }
```
- Guard routes: `router.post("/inventory/add", verifyToken, authorize("admin","manager","inventory"), requireFeature("inventoryCrud"), ctrl)`
- Frontend: `public/js/auth.js` reads `jwt role` → hides DOM (`data-requires-role="admin"`).

---

## 10. Reporting & AI Analytics

### Reporting Tiers
- **Basic:** `GET /api/reports/sales-overview?period=daily` (`reports.controller.js:25`), `GET /api/reports/recent-transactions`. CSV export.
- **Standard:** Adds `GET /api/reports/tax-summary`, `category-sales`, `product-sales` with date filters `?from=&to=&storeId=`, Excel export.
- **Premium:** Adds `GET /api/reports/profit-loss` (joins `costPrice`), `GET /api/reports/stock-movement`, `GET /api/reports/cashier-performance`, scheduled email `cron/reports.js`, custom dashboards (Chart.js already in dashboard).
- All reports **automatically scoped** `business` + optional `store`.

### AI Analytics (Premium Only — `services/aiService.js`)
- **Data pipeline (nightly):** Aggregate `Sale` + `Inventory` per business → anonymized JSON → vectorize.
- **Use LLM (OpenAI/Gemini via `utils/aiClient.js`):**
  - `forecastDemand(sku, 30d)` → predicted qty, reorder suggestion.
  - `detectDeadStock()` → items not sold 60d.
  - `anomalyDetection()` → cashier returns spike, after-hours discount.
  - Chat Q&A endpoint `POST /api/ai/query {question:"what sold best last week?"}` → LLM constrained to `SELECT`-like aggregation over business data, never cross-tenant.
- **Cost control:** AI calls only for Premium active subs; cache 24h in `aiInsight` collection.
- **Gate:** `requireFeature("reportsAIS")` → 403 on Basic/Standard with upsell CTA.

---

## 11. Payments — M-Pesa / Banks / Cards

**Abstraction `services/paymentProvider.js`:**
```js
interface PaymentProvider { initiate({amount, phone, businessId, reference}) => {status, txId};
  verify(txId) => status; refund(txId) => status; }
```
Implementations: `MpesaDarajaProvider` (Daraja STK Push), `PaystackProvider` (already `subscriptions.controller.js:52`), `BankProvider` (stub for Pesalink).

**Flows:**
- **Checkout (Basic — M-Pesa STK):** `sales.html: checkout-form` → `POST /api/payments/mpesa/stk-push {phone, amount}` → Daraja `Lipa Na Mpesa Online` (`config` sandbox `MPESA_SHORTCODE:174379` `.env:7`) → callback `POST /payments/mpesa/c2b/confirmation` → mark `Sale.paymentStatus=paid`.
  - Env: fill `MPESA_CONSUMER_KEY/SECRET`, `MPESA_PASSKEY`, callback via `ngrok` tunneled (`MPESA_STK_PUSH_CALLBACK_URL` `.env:9`).
- **Subscriptions (Standard/Premium):** Keep Paystack flow `initiatePaystackPayment` + webhook `verifyPaystackPayment` (`subscriptions.controller.js:52,153`). Add **M-Pesa subscription** alternative for Basic renewals (same Daraja STK).
- **Premium Bank:** `POST /api/payments/bank/initiate` → generate `bankReference` + instructions, reconcile via manual CSV upload or bank webhook stub.
- **At checkout:** UI shows only allowed methods: `GET /api/payment-methods?businessId` filtered by `plan.features`.

---

## 12. Super Admin Portal (Platform Owner)

**Separate realm `/superadmin/*`:**
- **Auth fix:** Use `models/SuperAdmin.js:3` (rename model to `SuperAdmin`), `routes/superAdmin.routes.js:6` register/login produce `adminToken` (cookie `adminToken` + `JWT_SECRET_SUPERADMIN`). Add `middleware/adminAuth.js:1` `verifyAdminToken`.
- **Frontend pages (NEW `public/admin/`):**
  - `admin/login.html`, `admin/dashboard.html` (KPIs: MRR, churn, active tenants, trial conversions)
  - `admin/tenants.html` — DataTable `GET /api/superadmin/businesses` (paginated, search, filter by plan/status), actions: view, suspend/activate, impersonate (generate short-lived business JWT), extend trial.
  - `admin/plans.html` — CRUD `Plan` (price, features matrix), seed editor.
  - `admin/subscriptions.html` — All subs `GET /api/superadmin/subscriptions`, expiry alerts, manual renew/cancel.
  - `admin/support.html` — All tickets `adminSupport.controller.js:1`, assign, reply.
  - `admin/analytics.html` — Platform revenue chart, plan distribution, AI cost.
  - `admin/settings.html` — Global configs (M-Pesa creds per env, Paystack keys, maintenance mode).
- **Routes (NEW `routes/superAdmin.routes.js:6`):**
```js
router.use(verifyAdminToken);
router.get("/businesses", superAdminCtrl.listBusinesses); // with pagination
router.patch("/businesses/:id/status", superAdminCtrl.updateStatus);
router.post("/businesses/:id/impersonate", superAdminCtrl.impersonate);
router.get("/metrics", superAdminCtrl.metrics);
router.get("/plans", superAdminCtrl.plans); // reuse but admin-scoped
```
- **Data isolation enforcement:** SuperAdmin queries use `.find({})` with `skipTenant:true`; all business-user APIs remain isolated.

---

## 13. Cross-Cutting Concerns

- **Security:** `helmet`, `rateLimit({windowMs:15*60*1000, max:200})`, `bcrypt 10 rounds`, httpOnly secure cookies, CORS whitelist by env, input validation `joi`/`zod`, audit log writes to `auditLog` on every `POST/PUT/DELETE`.
- **Validation:** New `middleware/validateBusinessRegistration.middleware.js` already exists — extend to `validateSale`, `validateInventory`.
- **Email:** `utils/emailService.js:1` via `nodemailer` (`GMAIL_USER` `.env:12`) for welcome, low-stock, expiry, AI insights digest.
- **File Uploads:** `middleware/multerConfig.js:1`, `utils/upload.js` → add image optimization `sharp`.
- **Backups & Compliance:** Daily `mongodump` + S3 sync, soft-delete `deletedAt` on inventory, GDPR: `DELETE /api/business/gdpr/export` & `gdpr/delete`.
- **Testing:** `test-plan.md` exists — add `jest` + `supertest` suites per tenant isolation, tier gate, payment mock.
- **CI/CD:** `.github/workflows/ping-render.yml` keep; add `deploy.yml` (build → `cap sync` → Render deploy).
- **Observability:** `pino` logs + `morgan`, Sentry (optional).

---

## 14. Execution Roadmap (Phased)

### Phase 0 — Foundation & Hardening (Week 1) — *Must do before new features*
- [ ] Fix `controllers/superAdmin.controller.js:1` model import, wire `routes/superAdmin.routes.js` in `app.js:58` (`app.use("/api/superadmin", superAdminRoutes)`), fix duplicate `app.use("/", userRoutes)` `app.js:92`.
- [ ] Add `verifyAdminToken` to `middleware/auth.middleware.js`, create `middleware/rbac.middleware.js`, `middleware/tier.middleware.js`, `middleware/tenant.middleware.js`.
- [ ] Create `utils/tenantPlugin.js` and apply to `Inventory`, `Sale`, `User`, `Subscription`.
- [ ] Harden `controllers/sales.controller.js:19` (`findOne`), scope `getReceipt`, add compound indexes migration.
- [ ] Extend `models/plan.model.js` to `features` map, write migration `scripts/migratePlans.js` converting old `userLimit/roleManagement`.
- [ ] Update `app.js:104` seed to new matrix, add rate-limit + helmet.
- **Exit:** `npm test` tenant isolation tests pass, SuperAdmin can log in.

### Phase 1 — RBAC & Tenant-Safe Core (Week 2)
- [ ] Implement role-permission map, protect all `routes/*.js` with `authorize()` + `requireFeature()`.
- [ ] Frontend: `public/js/auth.js` hides forbidden nav, `public/users.html` role editor (admin only).
- [ ] Create `Store` model, add store selector to `sales.html` + `inventory.html`, scope all queries `store` where applicable.
- [ ] Audit log `models/auditLog.model.js` + write on sale/inventory/user changes.
- **Exit:** Cashier cannot hit `/api/inventory/add` → 403, logs visible in DB.

### Phase 2 — Payments Re-Architecture (Week 2-3)
- [ ] Abstract `services/paymentService.js` + `providers/mpesa.js`, `providers/paystack.js`, `providers/bank.js`.
- [ ] Wire M-Pesa STK at checkout (`routes/payments.routes.js` → `POST /mpesa/stk-push`, callback handler verified), fix Paystack currency bug (`currency: USD` vs KES) in `controllers/subscriptions.controller.js:114`.
- [ ] `GET /api/payment-methods` returns filtered by tier; `sales.html:532` `payment-methods-container` renders only allowed.
- [ ] Subscription renewal via M-Pesa (Basic) + Paystack (Standard/Premium) unified.
- **Exit:** Basic tenant can STK-push KES 10 test (`174379` sandbox) and see `Sale paid`.

### Phase 3 — Inventory & Sales Enterprise Upgrade (Week 3-4)
- [ ] Add `costPrice`, `reorderLevel`, `barcode`, `supplier` to inventory, FIFO/WAC calc `services/inventoryValuation.js`.
- [ ] Stock alerts + supplier `purchaseOrder` flow, batch import background job.
- [ ] Sales: transactions, split payment, discount, customer attach, idempotency key, offlineId.
- [ ] Receipt: `services/receiptService.js` (html + escpos + pdf), QR code (sale verify URL).
- **Exit:** Create PO → receive → stock in → POS sale → receipt PDF matches.

### Phase 4 — Reporting & AI Analytics (Week 4-5)
- [ ] Enhance `controllers/reports.controller.js` with date/store filters, `profit-loss` (needs costPrice), `cashier-performance`.
- [ ] Export endpoints `?format=csv|xlsx|pdf` already partially there (`exportInventoryCsv/Excel/Pdf`) — add same for reports.
- [ ] AI service (Premium): `utils/aiClient.js` (OpenAI), caching, `POST /api/ai/insights` + `POST /api/ai/query`. Gate with tier.
- [ ] Dashboard charts (`public/js/dashboard.js:1`, `reports.js:1`) wire to new APIs with tier upsell banners.
- **Exit:** Premium tenant sees “Forecast” card, Basic sees locked with “Upgrade to Premium”.

### Phase 5 — Capacitor Mobile + Printer (Week 5-6) — *Parallelizable with Phase 4*
- [ ] `npm i capacitor`, init, `capacitor.config.ts`, `public/js/capacitor-bridge.js`.
- [ ] IndexedDB offline queue + sync service `public/js/offlineSync.js`.
- [ ] Test `npx cap run android`, `ios`.
- [ ] Printer: `services/printerService.js` + native plugin + web fallback, test on 58mm/80mm hardware (provide `docs/PRINTER_SETUP.md`).
- **Exit:** APK installs, creates sale offline, syncs when online, prints via Bluetooth.

### Phase 6 — Super Admin Portal (Week 6-7) — *Parallelizable with Phase 5*
- [ ] Build `public/admin/*` pages, reuse glass design, wire to new `superAdmin` routes.
- [ ] Metrics `superAdmin.controller.js:1` aggregation: `MRR = sum(subscription.price where status=active)`.
- [ ] Impersonate, suspend, plan editor, support queue.
- [ ] E2E test: Owner creates tenant via landing → sees it in admin → suspends → tenant gets 403.
- **Exit:** Owner can govern all vendors from `/admin/dashboard.html`.

### Phase 7 — Hardening, Billing Polish & Launch (Week 7-8)
- [ ] M-Pesa production credentials, Paystack live keys, domain callback URLs (`paymentProviders.config.js:2`).
- [ ] Email templates, scheduled reports, backup cron, Sentry, PWA manifest + install prompt.
- [ ] Load test (k6: 100 concurrent sales), security audit (jwt, tenant, RBAC), docs.
- [ ] Migration script for existing data, `JAVASCRIPT_FIX_SUMMARY.md`-style regression pass.
- **Exit:** Tag `v2.0-enterprise`, deploy Render + Play Store internal test.

**Overall: ~7-8 weeks with 2 devs (backend + frontend/mobile). Phases 4/5/6 parallel → 5 weeks aggressive.**

---

## 15. API & Route Map

| Method | Path | Auth | Tier | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/api/business/register` | public | — | Register + trial |
| POST | `/api/auth/login` | public | — | Business user login |
| GET | `/api/business/details` | verifyToken | any | Tenant profile (`business.controller.js:145`) |
| GET | `/api/inventory` | verifyToken | any* | List (scoped) |
| POST | `/api/inventory/add` | verifyToken+RBAC | any | Add SKU |
| POST | `/api/inventory/import/xlsx` | verifyToken | Standard+ | Bulk import |
| POST | `/api/sales` | verifyToken | any | `processSale` |
| POST | `/api/payments/mpesa/stk-push` | verifyToken | Basic+ | Daraja STK |
| POST | `/api/payments/mpesa/callback` | public (sig) | — | Daraja callback |
| POST | `/api/payments/paystack/initialize` | verifyToken | Standard+ | Paystack init (`subscriptions.controller.js:52`) |
| POST | `/api/payments/bank/initiate` | verifyToken | Premium | Bank ref |
| GET | `/api/reports/sales-overview` | verifyToken | Basic+ | Overview |
| GET | `/api/reports/profit-loss` | verifyToken | Premium | P&L |
| POST | `/api/ai/query` | verifyToken | Premium | LLM Q&A |
| GET | `/api/superadmin/businesses` | verifyAdminToken | — | List tenants |
| PATCH | `/api/superadmin/businesses/:id/status` | verifyAdminToken | — | Suspend/activate |
| POST | `/api/superadmin/plans` | verifyAdminToken | — | Plan CRUD |

*Tier row shows minimum tier.

---

## 16. File / Folder Structure (Target)

```
D:\projects\POS/
├── app.js                          # add helmet, tier middleware wiring
├── capacitor.config.ts             # NEW
├── package.json                    # add @capacitor/*
├── config/
│   ├── paymentProviders.config.js:2
│   └── ai.config.js                # NEW
├── middleware/
│   ├── auth.middleware.js:3        # add verifyAdminToken
│   ├── rbac.middleware.js          # NEW
│   ├── tier.middleware.js          # NEW (requireFeature)
│   ├── tenant.middleware.js        # NEW
│   └── validate*.middleware.js
├── models/
│   ├── plan.model.js:3             # EXTEND features
│   ├── businessDetails.js:3        # EXTEND
│   ├── store.model.js              # NEW
│   ├── user.js:3                   # EXTEND store
│   ├── inventory.js:3              # EXTEND
│   ├── sale.js:3                   # EXTEND
│   ├── customer.model.js           # NEW
│   ├── supplier.model.js           # NEW
│   ├── auditLog.model.js           # NEW
│   └── aiInsight.model.js          # NEW
├── services/
│   ├── paymentService.js           # NEW + providers/
│   ├── printerService.js           # NEW
│   ├── inventoryValuation.js       # NEW
│   ├── aiService.js                # NEW
│   └── reportService.js            # NEW (refactor reports.controller)
├── controllers/                    # refactor to use services + tenant scope
├── routes/                         # add tier/rbac guards everywhere
├── public/
│   ├── index.html                  # landing keeps 3 tiers
│   ├── dashboard.html / sales.html:384 / inventory.html
│   ├── admin/                      # NEW superadmin portal
│   │   ├── login.html, dashboard.html, tenants.html, plans.html
│   └── js/
│       ├── capacitor-bridge.js     # NEW
│       ├── offlineSync.js          # NEW
│       ├── printer.js              # NEW
│       └── ...existing
├── scripts/
│   ├── migratePlans.js             # NEW
│   ├── checkExpiringSubscriptions.js
│   └── seedSuperAdmin.js
├── docs/
│   ├── PRINTER_SETUP.md            # NEW
│   └── API.md                      # NEW
└── POS_ENTERPRISE_PLAN.md          # THIS FILE
```

---

## 17. Acceptance Criteria & QA

**Per-Tier Gate Tests:**
- [ ] Basic user sees only Cash + M-Pesa at checkout; hitting `/api/payments/paystack/initialize` → 403 `upgrade required`.
- [ ] Standard user can import 1k SKU XLSX; Premium can also `POST /api/ai/query`.
- [ ] Inventory `countDocuments({business})` = 501 → Basic `POST /inventory/add` → 403 `limit reached`.
- [ ] Capacitor APK: Airplane mode → 3 sales → re-enable → `pendingSales.length===0` after sync.
- [ ] Printer: sale → `POST /api/print/receipt/:id` → Bluetooth print on Infinix/Android 13.

**Tenant Isolation:**
- [ ] Tenant A `GET /api/inventory/:id` with Tenant B's id → 404 (not 200).
- [ ] SuperAdmin `GET /api/superadmin/businesses` sees all, but `GET /api/inventory` with adminToken → 401 (wrong realm).

**Payments:**
- [ ] STK push to `2547XXXXXXXX` → callback → `Sale.paymentStatus=paid` + inventory decremented exactly once (idempotency).

---

## 18. Risks & Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| Mongo field-level tenant leak (missing `business` filter) | Data breach | Tenant plugin + CI grep for `find(` without business + pentest |
| Paystack `KES` currency bug live (`subscriptions.controller.js:114`) | Payments fail | Fix to `USD` conversion or register KES merchant; add integration test |
| M-Pesa sandbox vs production callback URL `.env:9` ngrok expiry | No callbacks | Use Render public URL `https://api.yourdomain.com/payments/mpesa/callback`, add retry log |
| Capacitor printer fragmentation (Android vendors) | Print fails | Offer HTML/PDF fallback + tested plugin list `capacitor-printer` + `escpos` |
| AI cost overrun (Premium) | Margin erosion | Cache 24h, monthly quota per business, prompt size caps |
| `html-pdf` dep deprecated (`package.json:31`) | Build break | Migrate to `puppeteer` or `pdfkit` only |

---

## 19. Next Actions

1. **Approve tier matrix prices/features** — adjust KES and limits (2/5/20 users etc.) before Phase 0.
2. **Confirm branding:** keep `SwiftPOS` vs new name; provide logo for receipt header.
3. **Provide M-Pesa production creds** (shortcode, passkey) + Paystack live keys to replace `.env:5` sandbox.
4. **Printer hardware:** procure 1× 58mm Bluetooth (XPrinter) + 1× 80mm network for Phase 5 testing.
5. **Owner seeds:** Run `node scripts/seedSuperAdmin.js --email owner@swiftpos.co.ke --password <strong>` after Phase 0.
6. **Kickoff Phase 0:** Create branch `feature/enterprise-phase0` and start checklist `##14 Phase 0`.

> **Execute in order.** Each phase's `Exit` is a merge gate. This doc is the contract; update it with `decision log` at bottom as choices are made.

---

**Decision Log**
| Date | Decision | By |
| :--- | --- | --- |
| 2026-09-06 | Initial plan drafted from repo audit | Muse Spark |
|  |  |  |

