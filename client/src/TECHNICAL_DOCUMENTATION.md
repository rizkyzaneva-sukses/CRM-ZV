# CRM Order Control Center — Technical Documentation

> **Complete rebuild guide for developers**
> Generated: 2026-06-27
> Platform: Base44 (React + Vite + Tailwind CSS + BaaS)

---

## Table of Contents

1. [App Overview](#1-app-overview)
2. [Database Schema](#2-database-schema)
3. [All Pages & Routes](#3-all-pages--routes)
4. [All Components](#4-all-components)
5. [All Functions & Business Logic](#5-all-functions--business-logic)
6. [API Endpoints](#6-api-endpoints)
7. [Integrations](#7-integrations)
8. [Full Source Code](#8-full-source-code)

---

## 1. APP OVERVIEW

### App Name
**CRM Order Control Center** (internal brand: "Zaneva")

### Purpose
A centralized order management system for an Indonesian e-commerce/hijab business. It manages the full order lifecycle: order entry (manual or bulk Excel upload) → finance approval (for CASH orders) → shipping label generation → resi (tracking number) upload → export to courier templates (SAP, J&T) → print shipping labels.

### Core Features
- **Dashboard** — Real-time stats, sales charts (daily/weekly/monthly), status distribution, shipping performance, filterable order table with CSV export
- **Input Order** — Manual form entry or bulk Excel upload; auto-creates/updates customer records; per-item shipping service selection; auto-calculates totals
- **Finance Approval** — Approve/reject CASH orders (single or bulk)
- **Upload Resi** — Upload Excel from SAP/J&T to auto-match orders by recipient name and fill tracking numbers
- **Print Resi** — Generate & print shipping labels (105mm × 148mm / A6) with barcodes; separate tabs for SAP/J&T vs other couriers
- **Export Center** — Download CSV templates formatted for SAP, J&T, and CRM import
- **Master Data** — Upload/manage Product, KecamatanSAP, KecamatanJNT databases; manage shipping services
- **Customer Management** — View/search customer database
- **Audit Log** — Track all import/delete/reset actions
- **User Management** — Invite users, assign roles, edit/delete users, reset all order data (Owner only)
- **Manual Book** — In-app documentation with Download All Data tab (Owner only)
- **Reset Data** — Permanently delete all orders & order items (Owner only)

### User Roles & Permissions

| Role | Access |
|------|--------|
| **OWNER** | Full access: all menus + Finance Approval + User Management + Reset Data + Download All Data |
| **STAFF** | Dashboard (own orders only), Input Order, Customers, Manual Book |
| **FINANCE** | All main menus + Finance Approval + Export Center, Manual Book |
| **INVENTORI** | Dashboard, Upload Resi, Print Resi, Export Center, Manual Book |

Role is determined by `user.custom_role` field (falls back to `OWNER` if `user.role === 'admin'`, else `STAFF`).

---

## 2. DATABASE SCHEMA

All entities are NoSQL document collections (Base44 BaaS / MongoDB-compatible). Every record has built-in fields: `id`, `created_date`, `updated_date`, `created_by_id`. The `created_by` field (email string) is used for row-level filtering.

### 2.1 Order

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| order_number | string | — | Format: `CRM-YYYYMMDD-XXXX` |
| order_date | string (date) | — | Order date |
| nama_pemesan | string | ✅ | Customer name |
| alamat | string | ✅ | Shipping address |
| no_telepon | string | ✅ | Phone number |
| kode_pos | string | — | Postal code |
| berat_kg | number | — | Total weight |
| jenis_transaksi | enum: `CASH`, `COD` | ✅ | Transaction type |
| instruksi_pengiriman | string | — | Delivery instructions |
| jasa_pengiriman | string | ✅ | Shipping service code |
| provinsi | string | — | Province |
| kota_kab | string | — | City/regency |
| kecamatan | string | — | District |
| kecamatan_kode | string | — | SAP district code |
| ketentuan | string | — | Customer category |
| metode_pembayaran | string | — | Payment method (BCA, BNI, etc.) |
| transfer_atas_nama | string | — | Transfer account name |
| total_belanja | number | — | Subtotal of items |
| ongkir | number | — | Shipping cost |
| penanganan | number | — | Handling fee (3% for COD) |
| total | number | — | Grand total |
| no_resi | string | — | Tracking number |
| status_pesanan | enum: `DRAFT`, `WAITING_FINANCE`, `READY_TO_PROCESS`, `RESI_UPDATED`, `REJECTED` | — | Default: `DRAFT` |
| platform | string | — | Default: `CRM` |
| finance_status | enum: `PENDING`, `APPROVED`, `REJECTED` | — | Finance verification |
| finance_verified_at | string (date-time) | — | Verification timestamp |
| finance_verified_by | string | — | Verifier email |
| last_updated_by | string | — | Last editor email |

### 2.2 OrderItem

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| order_id | string | ✅ | FK → Order.id |
| sku | string | — | Product SKU |
| nama_produk | string | ✅ | Product name |
| qty | number | ✅ | Quantity |
| harga_setelah_diskon | number | — | Price after discount (total for qty) |
| subtotal_item | number | — | qty × harga |
| jasa_pengiriman | string | — | Per-item shipping code |
| berat_kg | number | — | Item weight |
| provinsi | string | — | |
| kota_kab | string | — | |
| kecamatan | string | — | |
| kecamatan_kode | string | — | SAP district code |
| status_tercover | string | — | Coverage status |
| instruksi_pengiriman | string | — | Per-item delivery instructions |

### 2.3 Product

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sku | string | — | Product SKU |
| nama_produk | string | ✅ | Product name |
| harga | number | ✅ | Price after discount per unit |
| brand | string | — | Brand |

### 2.4 Customer

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| nama | string | ✅ | Full name |
| no_telepon | string | ✅ | Phone (used as unique key for auto-upsert) |
| alamat | string | ✅ | Address |
| provinsi | string | — | |
| kota_kab | string | — | |
| kecamatan | string | — | |
| kode_pos | string | — | |
| email | string | — | |
| notes | string | — | |
| total_orders | number | — | Default: 0 |
| last_order_date | string (date) | — | |

### 2.5 ShippingService

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | ✅ | Display name (SAP, J&T, JNE...) |
| code | string | ✅ | System code (lowercase, no space) |
| platform | string | — | Marketplace |
| brand | string | — | Associated brand |
| is_active | boolean | — | Default: true |

### 2.6 KecamatanSAP

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| kode | string | ✅ | SAP district code (unique) |
| kecamatan | string | ✅ | District name |
| kota_kab | string | ✅ | City/regency |
| provinsi | string | ✅ | Province |
| status_tercover | string | — | Coverage: "Ya" / "Tidak" |

### 2.7 KecamatanJNT

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| kode | string | — | |
| kecamatan | string | ✅ | District |
| kota_kab | string | ✅ | City/regency |
| provinsi | string | ✅ | Province |

### 2.8 AuditLog

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| action | string | ✅ | e.g. `IMPORT_PRODUCT`, `DELETE_ALL`, `RESET_ALL_ORDERS` |
| entity_name | string | ✅ | Affected entity |
| status | enum: `SUCCESS`, `PARTIAL`, `FAILED` | ✅ | |
| total_records | number | — | |
| success_count | number | — | |
| skipped_count | number | — | |
| failed_count | number | — | |
| error_details | string | — | JSON string of errors |
| performed_by | string | — | User email |

### 2.9 PrintLog

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| order_id | string | ✅ | FK → Order.id |
| order_number | string | ✅ | |
| no_resi | string | — | Printed tracking number |
| printed_by | string | — | User email |

### 2.10 ResiImportException

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| no_waybill | string | ✅ | Tracking number from file |
| penerima | string | ✅ | Recipient name from file |
| reason | string | ✅ | Why it didn't match |
| resolved | boolean | — | Default: false |
| resolved_by | string | — | |
| resolved_at | string (date-time) | — | |

### 2.11 User (Built-in)

| Field | Type | Description |
|-------|------|-------------|
| id | string | Built-in |
| email | string | Built-in, read-only |
| full_name | string | Editable |
| role | string | `admin` / `user` (platform-level) |
| custom_role | string | App-level: `OWNER`, `STAFF`, `FINANCE`, `INVENTORI` |
| created_date | string | Built-in |

### Relationships

```
Order (1) ──< OrderItem (N)     [OrderItem.order_id → Order.id]
Order (1) ──< PrintLog (N)      [PrintLog.order_id → Order.id]
Customer (1) ──< Order (N)      [linked via no_telepon, not FK]
KecamatanSAP ── Order           [Order.kecamatan_kode → KecamatanSAP.kode]
KecamatanJNT ── Order           [matched by provinsi+kota_kab+kecamatan]
ShippingService ── Order        [Order.jasa_pengiriman → ShippingService.code]
Product ── OrderItem            [OrderItem.sku → Product.sku]
```

---

## 3. ALL PAGES & ROUTES

Routes are defined in `pages.config.js` and rendered via `App.jsx`. The `createPageUrl(name)` helper converts page names to URL paths by replacing spaces with hyphens.

| Page | Route | Role Access | Description |
|------|-------|-------------|-------------|
| Dashboard | `/` (mainPage) | All | Stats, charts, filtered order table, CSV export |
| InputOrder | `/InputOrder` | All | Create/edit order (manual or Excel upload) |
| OrderDetail | `/OrderDetail?id={id}` | All (owner of order or finance) | View single order, approve/reject |
| CustomerManagement | `/CustomerManagement` | All | Customer database |
| UploadResi | `/UploadResi` | All | Upload resi Excel, auto-match to orders |
| PrintResi | `/PrintResi` | All | Generate & print shipping labels |
| ExportCenter | `/ExportCenter` | All (Finance/Owner/Inventori see date range) | Download SAP/J&T/CRM templates |
| MasterData | `/MasterData` | All | Upload/manage Product, KecamatanSAP, KecamatanJNT, ShippingService |
| FinanceApproval | `/FinanceApproval` | FINANCE, OWNER | Approve/reject CASH orders |
| AuditLog | `/AuditLog` | All | View audit trail |
| UserManagement | `/UserManagement` | OWNER | Invite/edit/delete users, reset data |
| ResetData | `/ResetData` | OWNER | Delete all orders & items |
| ManualBook | `/ManualBook` | All | In-app docs + Download All Data (Owner only) |
| Inventori | `/Inventori` | INVENTORI | Inventory hub (redirects to inventory features) |

**Edit mode**: `InputOrder?edit={orderId}` loads existing order for editing.

---

## 4. ALL COMPONENTS

### 4.1 Layout Components

#### `Layout.jsx` (root layout)
- **Props**: `{ children, currentPageName }`
- **Logic**: Fetches current user via `base44.auth.me()`, derives `customRole` (`user.custom_role` or `OWNER` if admin). Injects dark theme CSS variables. Renders Sidebar + TopBar + main content. Passes `{ user, customRole }` to children via `React.cloneElement`.

#### `components/layout/Sidebar.jsx`
- **Props**: `{ currentPage, customRole }`
- **Logic**: Builds menu items array based on role. Uses `createPageUrl()` for links. Highlights active page.

#### `components/layout/TopBar.jsx`
- **Props**: `{ user, customRole }`
- **Logic**: Displays user info and role badge.

#### `components/layout/MobileNav.jsx`
- **Props**: `{ currentPage, customRole }`
- **Logic**: Mobile bottom navigation, role-filtered items.

### 4.2 Form Components

#### `components/forms/OrderItemsForm.jsx`
- **Props**: `{ items, onChange, shippingServices }`
- **Logic**: Manages order item list with add/remove. Toggle "same shipping" applies global shipping settings to all items. Integrates `ProductSearch` and `ItemShippingForm`.

#### `components/forms/KecamatanSearch.jsx`
- **Props**: `{ isSAP, serviceLabel, value, onChange }`
- **Logic**: Cascading searchable dropdowns for Province → City → District. Fetches from `KecamatanSAP` or `KecamatanJNT` based on `isSAP`. Returns `{ provinsi, kota_kab, kecamatan, kecamatan_kode, status_tercover }`.

#### `components/forms/ShippingServiceCombobox.jsx`
- **Props**: `{ value, onChange, services }`
- **Logic**: Searchable dropdown for shipping service selection with outside-click detection.

#### `components/forms/ItemShippingForm.jsx`
- **Props**: `{ item, index, allServices, onChange }`
- **Logic**: Per-item shipping service and weight inputs.

#### `components/forms/ProductSearch.jsx`
- **Props**: `{ onSelectProduct }`
- **Logic**: Searches Product entity by name/SKU, calls `onSelectProduct(product)`.

#### `components/forms/OrderFilters.jsx`
- **Props**: `{ filters, onFilterChange, onClear }`
- **Logic**: Filter UI for search, date range, status, shipping service.

#### `components/forms/ShippingServiceManagement.jsx`
- **Logic**: CRUD UI for ShippingService entity.

### 4.3 Dashboard Components

#### `components/dashboard/StatsCard.jsx`
- **Props**: `{ title, value, icon, color }`

#### `components/dashboard/OrdersTable.jsx`
- **Props**: `{ orders, loading, customRole }`
- **Logic**: Renders order rows with links to OrderDetail, edit, and status badges.

#### `components/dashboard/SalesChart.jsx`
- **Props**: `{ data, title }`
- **Logic**: Recharts bar/line chart for sales data.

#### `components/dashboard/StatusPieChart.jsx`
- **Props**: `{ data, title }`
- **Logic**: Recharts pie chart for order status distribution.

#### `components/dashboard/ShippingPerformance.jsx`
- **Props**: `{ data, title }`
- **Logic**: Recharts chart for shipping service performance.

### 4.4 Resi Components

#### `components/resi/ResiLabel.jsx`
- **Props**: `{ order, items, senderName, senderPhone }`
- **Logic**: Renders printable shipping label (150mm × 100mm) with JsBarcode-generated barcodes for resi number and order number.

### 4.5 Utility Components

#### `components/manualbook/DownloadAllData.jsx`
- **Props**: `{ customRole }`
- **Logic**: Owner-only. Fetches all entities, downloads as JSON or CSV (per-entity or all-in-one).

#### `components/ui/StatusBadge.jsx`
- **Props**: `{ status }`
- **Logic**: Color-coded badge for order status.

### 4.6 shadcn/ui Components
Standard shadcn/ui library at `@/components/ui/`: button, card, input, label, textarea, select, tabs, table, dialog, checkbox, badge, dropdown-menu, popover, command, toast, etc.

---

## 5. ALL FUNCTIONS & BUSINESS LOGIC

### 5.1 Utility Functions

#### `utils/index.ts` — `createPageUrl(pageName)`
```ts
export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}
```

#### `components/utils/shippingUtils.jsx`

**`normalizeShippingService(serviceName)`** — Normalizes shipping service strings to base keys (`sap`, `jnt`, `jne`, `sicepat`, `anteraja`, `ninja`, `idexpress`, `lion`, `wahana`, `tiki`, `pos`, `shopee`, `grab`, `gojek`). Case-insensitive substring matching.

**`isSAPService(serviceName)`** → `boolean` — Returns true if normalized === 'sap'.

**`isJNTService(serviceName)`** → `boolean`

**`getServiceDisplayName(normalizedService)`** → human-readable label.

#### `components/utils/dateUtils.jsx`

All functions use `Asia/Jakarta` timezone via `date-fns-tz`.

**`getCurrentDateJakarta()`** → Date object in Jakarta TZ.

**`formatDateJakarta(date, formatStr)`** → formatted string (default `yyyy-MM-dd`). Parses ISO strings as UTC by appending 'Z' if missing.

**`formatInJakarta(date, formatStr)`** → formatted string (default `dd MMM yyyy`).

**`getTodayJakarta()`** → today's date as `yyyy-MM-dd` string.

### 5.2 Order Creation Logic (InputOrder.jsx)

**`generateOrderNumber()`**:
```js
const date = format(new Date(), 'yyyyMMdd');
const random = Math.floor(1000 + Math.random() * 9000);
return `CRM-${date}-${random}`;
```

**Auto-calculations**:
- `total_belanja` = sum of all `item.harga_setelah_diskon`
- `penanganan` (COD only) = `Math.round((total_belanja + ongkir) * 0.03)` — 3% handling fee
- `total` = `total_belanja + ongkir + penanganan`

**Status assignment on create**:
- CASH → `status_pesanan: 'WAITING_FINANCE'`, `finance_status: 'PENDING'`
- COD → `status_pesanan: 'READY_TO_PROCESS'`, `finance_status: null`

**Validation rules**:
1. `nama_pemesan`, `alamat`, `no_telepon` required
2. At least 1 item with `nama_produk`
3. Every item must have `jasa_pengiriman`
4. If any item is SAP → `kecamatan_kode` required on order
5. If SAP + COD + `status_tercover === 'Tidak'` → confirmation prompt

**Customer auto-upsert**: On order save, queries `Customer.filter({ no_telepon })`. If exists, updates `last_order_date` and increments `total_orders`. If not, creates new Customer.

**Edit mode**: Deletes all existing OrderItems, recreates them. Sets `last_updated_by`.

### 5.3 Finance Approval Logic (FinanceApproval.jsx & OrderDetail.jsx)

**Approve**: Sets `finance_status: 'APPROVED'`, `status_pesanan: 'READY_TO_PROCESS'`, `finance_verified_at`, `finance_verified_by`, `last_updated_by`.

**Reject**: Sets `finance_status: 'REJECTED'`, `status_pesanan: 'REJECTED'`.

Supports bulk approve/reject via checkbox selection.

### 5.4 Upload Resi Logic (UploadResi.jsx)

**`matchResiWithOrders(resiData, orders)`**:
- For each resi entry (with `no_waybill` and `penerima`):
  - Find orders where `nama_pemesan.toLowerCase().trim() === penerima.toLowerCase().trim()` AND `!order.no_resi`
  - If exactly 1 match → `matched`
  - If multiple → pick most recent by `created_date` → `matched_multiple`
  - If none → `unmatched`

**Apply update**: Updates matched orders with `no_resi` and `status_pesanan: 'RESI_UPDATED'`. Saves unmatched as `ResiImportException`. Sends notification email via `base44.integrations.Core.SendEmail`.

### 5.5 Print Resi Logic (PrintResi.jsx)

**Two tabs**:
1. **SAP & J&T** — Requires `no_resi` from Upload Resi. Creates PrintLog, opens print window with barcode labels.
2. **Other couriers** — Auto-generates resi if missing via `generateAutoResi()`:
   ```js
   const ts = Date.now().toString().slice(-6);
   const prefix = (order.jasa_pengiriman || 'EXP').toUpperCase().slice(0, 3).replace(/\s/g,'');
   return `${prefix}${ts}${Math.floor(Math.random()*900+100)}`;
   ```

**Label generation**: Builds HTML string with inline styles (105mm × 148mm, A6), injects JsBarcode script via CDN in a new window, calls `window.print()`.

**Sender phone mapping** (`SENDER_PHONES`): Maps staff emails to phone numbers.

### 5.6 Export Center Logic (ExportCenter.jsx)

**SAP Template** — 27 columns matching SAP import format. Validates all SAP orders have `kecamatan_kode`. COD → `NILAI COD` = order.total, `COD/NONCOD` = 2. CASH → 1. Insurance = 0.3 if nilai_barang > 500000.

**J&T Template** — 32 columns. Sender hardcoded to Zaneva Cimahi. `Jenis Layanan: 'EZ'`, `Keterangan: 'TOLONG HUBUNGI SEBELUM DIKIRIM!'`.

**CRM Template** — Per-item rows. Ongkir divided equally across items. COD adds 3% to `HARGA AKHIR`.

### 5.7 Master Data Upload Logic (MasterData.jsx)

**`handleUpload(entityName, file)`**:
1. Parse Excel via `XLSX.read(buffer)`
2. Transform rows based on entity (Product, KecamatanSAP, KecamatanJNT)
3. `removeDuplicates()` — dedup within file by key (kode for SAP, provinsi-kota-kecamatan for JNT, sku/nama_produk for Product)
4. Check existing DB records to skip already-existing entries
5. Insert one-by-one with `retryWithBackoff()` (3 retries, exponential delay)
6. Save AuditLog entry
7. Show summary alert

**`handleDeleteAll(entityName)`** — Deletes in parallel batches of 20, saves AuditLog.

### 5.8 Reset Data Logic (ResetData.jsx & UserManagement.jsx)

Owner-only. Requires typing "RESET SEMUA DATA" to confirm. Deletes all OrderItems then all Orders. Saves AuditLog with action `RESET_ALL_ORDERS`.

### 5.9 Download All Data Logic (DownloadAllData.jsx)

Owner-only. Fetches all 10 entities via `base44.entities.{Name}.list()`. Downloads as JSON (nested object) or CSV (sections with headers). Per-entity or all-in-one.

---

## 6. API ENDPOINTS

This app uses the **Base44 SDK** (`@/api/base44Client`) — no custom REST endpoints. All data operations go through the SDK's entity methods:

### Entity CRUD (SDK methods)

| Method | Signature | Description |
|--------|-----------|-------------|
| list | `base44.entities.{Name}.list(sort, limit)` | List records |
| filter | `base44.entities.{Name}.filter(query, sort, limit)` | Filtered list |
| get | `base44.entities.{Name}.get(id)` | Single record |
| create | `base44.entities.{Name}.create(data)` | Create one |
| update | `base44.entities.{Name}.update(id, data)` | Update one |
| delete | `base44.entities.{Name}.delete(id)` | Delete one |
| bulkCreate | `base44.entities.{Name}.bulkCreate([...])` | Bulk create |
| bulkUpdate | `base44.entities.{Name}.bulkUpdate([{id, ...}])` | Bulk update |
| updateMany | `base44.entities.{Name}.updateMany(query, {$set: ...})` | Update by query |
| deleteMany | `base44.entities.{Name}.deleteMany(query)` | Delete by query |

### Auth SDK

| Method | Description |
|--------|-------------|
| `base44.auth.me()` | Current user |
| `base44.auth.isAuthenticated()` | Promise<boolean> |
| `base44.auth.logout(redirectUrl)` | Logout |
| `base44.auth.redirectToLogin(nextUrl)` | Redirect to login |
| `base44.auth.updateMe(data)` | Update current user |
| `base44.users.inviteUser(email, role)` | Invite user |

### Realtime

```js
const unsubscribe = base44.entities.{Name}.subscribe((event) => {
  // event: { id, type: 'create'|'update'|'delete', data }
});
```

---

## 7. INTEGRATIONS

### 7.1 Core Integrations (Built-in, always available)

| Integration | Usage |
|-------------|------|
| **InvokeLLM** | LLM calls (not currently used in main flows) |
| **UploadFile** | File uploads to storage |
| **SendEmail** | Used in UploadResi to notify finance team (`rizkyzaneva@gmail.com`) |
| **GenerateImage** | AI image generation |
| **GenerateSpeech** | TTS |
| **GenerateVideo** | AI video generation |
| **ExtractDataFromUploadedFile** | Extract structured data from files |
| **TranscribeAudio** | Audio transcription |

**Email notification** (UploadResi.jsx):
```js
await base44.integrations.Core.SendEmail({
  to: 'rizkyzaneva@gmail.com',
  subject: `🚚 Resi Update: ${matched.length} Orders Updated`,
  body: emailBody,
});
```

### 7.2 External Libraries (npm)

| Library | Purpose |
|---------|---------|
| `xlsx` | Excel/CSV parsing & generation |
| `jsbarcode` | Barcode generation for shipping labels |
| `recharts` | Dashboard charts |
| `date-fns` + `date-fns-tz` | Jakarta timezone date handling |
| `@tanstack/react-query` | Server state management & caching |
| `react-router-dom` | Routing |
| `lucide-react` | Icons |
| `framer-motion` | Animations |
| `react-hook-form` | Forms |
| `react-markdown` | Markdown rendering |

### 7.3 No OAuth Connectors
No third-party OAuth connectors are currently configured.

---

## 8. FULL SOURCE CODE

### 8.1 Project Structure

```
src/
├── App.jsx                          # Router & auth wrapper
├── main.jsx                         # Entry point
├── Layout.jsx                       # Root layout (Sidebar + TopBar)
├── pages.config.js                  # Page routing config (auto-generated)
├── index.css                        # Tailwind + design tokens
├── tailwind.config.js               # Tailwind config
├── pages/
│   ├── Dashboard.jsx
│   ├── InputOrder.jsx
│   ├── OrderDetail.jsx
│   ├── FinanceApproval.jsx
│   ├── UploadResi.jsx
│   ├── PrintResi.jsx
│   ├── ExportCenter.jsx
│   ├── MasterData.jsx
│   ├── CustomerManagement.jsx
│   ├── AuditLog.jsx
│   ├── UserManagement.jsx
│   ├── ResetData.jsx
│   ├── ManualBook.jsx
│   └── Inventori.jsx
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx
│   │   ├── TopBar.jsx
│   │   └── MobileNav.jsx
│   ├── forms/
│   │   ├── OrderItemsForm.jsx
│   │   ├── KecamatanSearch.jsx
│   │   ├── ShippingServiceCombobox.jsx
│   │   ├── ItemShippingForm.jsx
│   │   ├── ProductSearch.jsx
│   │   ├── OrderFilters.jsx
│   │   └── ShippingServiceManagement.jsx
│   ├── dashboard/
│   │   ├── StatsCard.jsx
│   │   ├── OrdersTable.jsx
│   │   ├── SalesChart.jsx
│   │   ├── StatusPieChart.jsx
│   │   └── ShippingPerformance.jsx
│   ├── resi/
│   │   └── ResiLabel.jsx
│   ├── manualbook/
│   │   └── DownloadAllData.jsx
│   ├── utils/
│   │   ├── shippingUtils.jsx
│   │   └── dateUtils.jsx
│   └── ui/                          # shadcn/ui components
│       ├── button.jsx
│       ├── card.jsx
│       ├── input.jsx
│       ├── label.jsx
│       ├── select.jsx
│       ├── tabs.jsx
│       ├── table.jsx
│       ├── dialog.jsx
│       ├── checkbox.jsx
│       ├── StatusBadge.jsx
│       └── ... (all shadcn components)
├── entities/                        # JSON schemas
│   ├── Order.json
│   ├── OrderItem.json
│   ├── Product.json
│   ├── Customer.json
│   ├── ShippingService.json
│   ├── KecamatanSAP.json
│   ├── KecamatanJNT.json
│   ├── AuditLog.json
│   ├── PrintLog.json
│   └── ResiImportException.json
├── lib/
│   ├── AuthContext.jsx              # Auth provider
│   ├── query-client.js              # React Query client
│   ├── utils.js                     # cn() class merger
│   ├── app-params.js
│   └── NavigationTracker.jsx
├── hooks/
│   └── use-mobile.jsx
├── api/
│   └── base44Client.js              # Pre-initialized Base44 SDK
└── utils/
    └── index.ts                     # createPageUrl()
```

### 8.2 App.jsx (Router)

```jsx
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (<div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    </div>);
  }
  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    else if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }
  return (
    <Routes>
      <Route path="/" element={<LayoutWrapper currentPageName={mainPageKey}><MainPage /></LayoutWrapper>} />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route key={path} path={`/${path}`} element={<LayoutWrapper currentPageName={path}><Page /></LayoutWrapper>} />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}
export default App
```

### 8.3 Layout.jsx (Root Layout with Dark Theme)

```jsx
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import TopBar from '@/components/layout/TopBar';
import { Loader2 } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try { setUser(await base44.auth.me()); }
      catch (error) { console.error('Error loading user:', error); }
      finally { setLoading(false); }
    };
    loadUser();
  }, []);

  let customRole = 'STAFF';
  if (user?.custom_role) customRole = user.custom_role;
  else if (user?.role === 'admin') customRole = 'OWNER';

  if (loading) return (<div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>);

  return (
    <div className="min-h-screen bg-[#0B0F1A]">
      <style>{`/* Dark theme CSS variables — see source */`}</style>
      <div className="flex">
        <Sidebar currentPage={currentPageName} customRole={customRole} />
        <div className="flex-1 flex flex-col min-h-screen">
          <TopBar user={user} customRole={customRole} />
          <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 overflow-auto">
            {React.cloneElement(children, { user, customRole })}
          </main>
        </div>
      </div>
      <MobileNav currentPage={currentPageName} customRole={customRole} />
    </div>
  );
}
```

### 8.4 Design System (index.css tokens)

Dark theme color palette (HSL):
- Background: `222 47% 5%` (#0B0F1A)
- Card: `222 47% 11%` (#121A2A)
- Primary: `142 71% 45%` (emerald)
- Border: `222 40% 20%` (#22304A)
- Foreground: `220 40% 94%` (#EAF0FF)
- Muted foreground: `220 25% 70%` (#B8C3E0)

### 8.5 Entity Schema Example (Order.json)

```json
{
  "name": "Order",
  "type": "object",
  "properties": {
    "order_number": { "type": "string", "description": "Format: CRM-YYYYMMDD-XXXX" },
    "order_date": { "type": "string", "format": "date" },
    "nama_pemesan": { "type": "string" },
    "alamat": { "type": "string" },
    "no_telepon": { "type": "string" },
    "kode_pos": { "type": "string" },
    "berat_kg": { "type": "number" },
    "jenis_transaksi": { "type": "string", "enum": ["CASH", "COD"] },
    "instruksi_pengiriman": { "type": "string" },
    "jasa_pengiriman": { "type": "string" },
    "provinsi": { "type": "string" },
    "kota_kab": { "type": "string" },
    "kecamatan": { "type": "string" },
    "kecamatan_kode": { "type": "string", "description": "SAP district code" },
    "ketentuan": { "type": "string" },
    "metode_pembayaran": { "type": "string" },
    "transfer_atas_nama": { "type": "string" },
    "total_belanja": { "type": "number" },
    "ongkir": { "type": "number" },
    "penanganan": { "type": "number" },
    "total": { "type": "number" },
    "no_resi": { "type": "string" },
    "status_pesanan": { "type": "string", "enum": ["DRAFT", "WAITING_FINANCE", "READY_TO_PROCESS", "RESI_UPDATED", "REJECTED"], "default": "DRAFT" },
    "platform": { "type": "string", "default": "CRM" },
    "finance_status": { "type": "string", "enum": ["PENDING", "APPROVED", "REJECTED"] },
    "finance_verified_at": { "type": "string", "format": "date-time" },
    "finance_verified_by": { "type": "string" },
    "last_updated_by": { "type": "string" }
  },
  "required": ["nama_pemesan", "alamat", "no_telepon", "jenis_transaksi", "jasa_pengiriman"]
}
```

### 8.6 Order Status Flow

```
[Create COD]     → READY_TO_PROCESS → (Upload Resi) → RESI_UPDATED → (Print) → PrintLog
[Create CASH]    → WAITING_FINANCE → (Finance Approve) → READY_TO_PROCESS → ...
                                   → (Finance Reject)  → REJECTED
```

### 8.7 Key Business Rules Summary

1. **COD orders** skip finance approval (direct to READY_TO_PROCESS); CASH orders require approval
2. **Handling fee** auto-calculated at 3% for COD: `Math.round((total_belanja + ongkir) * 0.03)`
3. **Customer auto-upsert** on every order save (keyed by `no_telepon`)
4. **SAP orders** require `kecamatan_kode` from KecamatanSAP database
5. **SAP + COD + uncovered area** triggers confirmation warning
6. **Resi matching** is case-insensitive name match between file "Penerima" and order "nama_pemesan"
7. **Print labels**: SAP/J&T require pre-uploaded resi; other couriers auto-generate
8. **Audit logging** on all imports, deletes, and resets
9. **Row-level security**: STAFF sees only own orders (`created_by === user.email`); others see all
10. **Download All Data** restricted to OWNER role only

### 8.8 Rebuild Notes

To rebuild this app from scratch on Base44:

1. **Create entities** (Section 2) as JSON schemas in `entities/` folder
2. **Install npm packages**: xlsx, jsbarcode, recharts, date-fns, date-fns-tz, @tanstack/react-query, react-router-dom, lucide-react, framer-motion, react-hook-form, react-markdown
3. **Create pages** (Section 3) following the routing in `pages.config.js`
4. **Implement Layout** with dark theme (#0B0F1A background, emerald primary)
5. **Wire up Base44 SDK** at `@/api/base44Client` for entity CRUD and auth
6. **Implement business logic** per Section 5 — especially order status flow, auto-calculations, and resi matching
7. **Set up auth** via Base44's built-in AuthProvider (no custom login page)
8. **Configure roles** via `user.custom_role` field (OWNER, STAFF, FINANCE, INVENTORI)
9. **Email notifications** via `base44.integrations.Core.SendEmail` (configure recipient in UploadResi.jsx)
10. **Print labels** use JsBarcode CDN + window.print() with A6 page size

---

*End of Documentation*