# CRM Order Control Center — Architecture Review

## Overview

**Stack:** Node.js/Express + PostgreSQL 16 + React 18/Vite + Tailwind/shadcn/ui  
**Deployment:** Docker Compose (multi-stage build)  
**Auth:** JWT (Bearer token) + express-session (configured but unused)  
**Database:** PostgreSQL with pgcrypto UUIDs  

---

## 🔴 CRITICAL: Security Issues

### 1. SQL Injection via String Interpolation
**File:** [`server/routes/dashboard.js`](server/routes/dashboard.js:10)

```javascript
const roleFilter = req.user.custom_role === 'STAFF' 
  ? `WHERE created_by = '${req.user.email}'` : '';
```

`req.user.email` is interpolated directly into SQL. While currently from JWT, this pattern is dangerous if email is ever user-controlled. Affects lines 10, 47, 69, 83.

**Fix:** Use parameterized queries consistently.

### 2. No Rate Limiting on Auth Endpoints
**File:** [`server/routes/auth.js`](server/routes/auth.js:8)

Login/register endpoints have no rate limiting. Vulnerable to brute force attacks.

**Fix:** Add `express-rate-limit` on `/api/auth/*`.

### 3. Weak JWT Secret Fallback
**File:** [`server/middleware/auth.js`](server/middleware/auth.js:4)

```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'crm-jwt-secret';
```

If `JWT_SECRET` env var is missing, a hardcoded weak secret is used.

**Fix:** Throw error on startup if `JWT_SECRET` not set.

### 4. Permissive CORS
**File:** [`server/index.js`](server/index.js:227)

```javascript
app.use(cors({ origin: true, credentials: true }));
```

Allows ANY origin. Should be restricted to frontend domain.

### 5. No Input Validation on Server
No validation library (e.g., `zod`, `joi`, `express-validator`) used anywhere server-side. All route handlers trust `req.body` completely.

**Fix:** Add input validation on all POST/PUT routes.

### 6. No Authorization on CRUD Routes
Products, customers, kecamatan routes have no role restrictions. Any authenticated user (including STAFF) can delete products or modify master data.

**Fix:** Add `requireRole` middleware on destructive operations.

### 7. Admin Credentials Seeded on Every Startup
**File:** [`server/index.js`](server/index.js:210-218)

```javascript
if (parseInt(result.rows[0].count) === 0) {
  const hash = await bcrypt.hash('admin123', 10);
  // seeds admin@zaneva.com / admin123
}
```

If all users are deleted (via reset-all-data), admin is re-seeded with known password.

### 8. Error Messages Leak Internals
**File:** [`server/routes/auth.js`](server/routes/auth.js:30)

```javascript
error: 'Login failed: ' + err.message
```

Exposes internal error details to client.

---

## 🟠 HIGH: Architecture Issues

### 9. Schema Duplication
**Files:** [`db/init.sql`](db/init.sql:1) and [`server/index.js`](server/index.js:12-162)

Entire database schema is duplicated — once in `init.sql` for Docker, once in `index.js` autoSeed. Schema changes must be made in two places.

**Fix:** Use `init.sql` as single source of truth. Run migration on startup instead of inline schema.

### 10. No Database Transactions
**File:** [`server/routes/orders.js`](server/routes/orders.js:78-133)

Order creation inserts order header + multiple items without transaction. If item insert fails mid-loop, orphan order exists with no items.

**Fix:** Wrap in `BEGIN`/`COMMIT` transaction using `pool.connect()`.

### 11. Bulk Operations Not Atomic
**Files:** [`server/routes/orders.js`](server/routes/orders.js:224-244), [`server/routes/orders.js`](server/routes/orders.js:264-278)

Bulk finance/resi operations loop without transactions. Partial failures leave inconsistent state.

### 12. Dashboard Fetches All Data Client-Side
**File:** [`client/src/pages/Dashboard.jsx`](client/src/pages/Dashboard.jsx:36-53)

```javascript
const data = await api.getOrders({ limit: 1000 });
// ... filters in JS with useMemo
```

Fetches up to 1000 orders + 5000 order items, then filters/stats in browser. Should be server-side aggregation via `/api/dashboard/stats`.

### 13. Order Number Collision Risk
**File:** [`server/utils/helpers.js`](server/utils/helpers.js:3-7)

```javascript
function generateOrderNumber() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CRM-${date}-${random}`;
}
```

Only 9000 possible values per day. With 100+ orders/day, collision probability grows fast.

**Fix:** Use DB sequence or UUID-based approach.

### 14. express-session Configured but Unused
**File:** [`server/index.js`](server/index.js:230-235)

Session middleware is configured but auth uses JWT Bearer tokens. Dead code adding unnecessary overhead.

---

## 🟡 MEDIUM: Code Quality Issues

### 15. Massive Unused Client Dependencies
**File:** [`client/package.json`](client/package.json:45-78)

Unused packages bloating bundle:
- `@stripe/react-stripe-js`, `@stripe/stripe-js` — no Stripe integration found
- `three` — 3D library, no usage
- `react-leaflet` — maps, no usage
- `react-quill` — rich text editor, no usage
- `react-markdown` — markdown renderer, no usage
- `canvas-confetti` — likely unused
- `@hello-pangea/dnd` — drag and drop, limited usage

### 16. Duplicate Date Libraries
**File:** [`client/package.json`](client/package.json:52,62)

Both `date-fns` and `moment` are dependencies. Pick one (prefer `date-fns` — already used in code).

### 17. No React Error Boundaries
No error boundary component. Single component crash kills entire app UI.

### 18. No Code Splitting / Lazy Loading
**File:** [`client/src/pages.config.js`](client/src/pages.config.js:50-63)

All 13 pages eagerly imported. No `React.lazy()` or dynamic imports. Initial bundle includes everything.

### 19. Inconsistent API Response Shapes
Some routes return `{ orders: [], total }`, others `{ data: [] }`, others bare arrays. Inconsistent contract.

### 20. No Database Connection Pool Config
**File:** [`server/utils/db.js`](server/utils/db.js:3-5)

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

No `max`, `idleTimeoutMillis`, `connectionTimeoutMillis` configured.

### 21. No Structured Logging
Only `console.log/error` throughout. No log levels, no structured output, no request ID tracking.

### 22. Missing Health Check Endpoint
Docker compose has healthcheck but server has no `/health` route. Docker healthcheck will always fail.

### 23. Port Configuration Mismatch
- `docker-compose.yml` maps `3000:3000`
- `Dockerfile` exposes 3000
- `server/index.js` defaults to 3001
- Works only because docker-compose sets `PORT=3000` env var

### 24. Reset-Data Endpoint Dangerous
**File:** [`server/routes/users.js`](server/routes/users.js:64-79)

Deletes ALL data across 9 tables. No backup, no confirmation token, no audit log entry for this action.

---

## 🟢 LOW: Minor Issues / Suggestions

### 25. No API Versioning
All routes under `/api/`. No versioning strategy for future breaking changes.

### 26. No Request ID / Correlation ID
Makes debugging production issues difficult.

### 27. No Database Indexes for Common Queries
Missing indexes on `orders.nama_pemesan`, `orders.jasa_pengiriman`, `orders.finance_status`.

### 28. Mixed Language in Code
Indonesian field names (`nama_pemesan`, `jenis_transaksi`, `total_belanja`) mixed with English (`status`, `email`). Consider standardizing.

### 29. No TypeScript on Server
Client has `.ts` utilities but server is pure JS. Type safety would catch many bugs.

### 30. Client ThemeProvider Missing
Open tab shows `ThemeProvider.jsx` but file not in component tree. May be orphaned.

---

## Summary by Priority

| Priority | Count | Key Areas |
|----------|-------|-----------|
| 🔴 Critical | 8 | SQL injection, auth security, input validation |
| 🟠 High | 6 | Transactions, schema duplication, perf |
| 🟡 Medium | 10 | Bundle size, code quality, consistency |
| 🟢 Low | 6 | Best practices, future-proofing |
