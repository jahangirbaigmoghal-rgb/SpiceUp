# SpiceUp Auth Hardening + Clerk Migration — Design Spec

**Date:** 2026-06-25
**Status:** Awaiting user review (pre-implementation)
**Scope:** Full hardening (Phase A + B + C + D) + migration of Admin/Manager/Customer auth to Clerk
**Sequencing:** Phased PRs (A → B → C → D)
**Provider:** Clerk

---

## 1. Background & Motivation

A security audit of the `server/` codebase (grounded in the "don't build auth from scratch," "auth checklist," and "JWT alg-confusion" reviews) surfaced concrete vulnerabilities in SpiceUp's current authentication. This spec defines a phased plan to (a) close those holes and (b) migrate the outsourceable login flows to a battle-tested provider (Clerk), while keeping the cashier PIN custom — the one flow no managed provider fits.

### The "Invalid PIN" symptom
Two compounding causes:
- **Operational:** On Vercel serverless, the in-memory rate limiter (`middleware/security.js`) resets per-instance and the boot-seed (`api/index.js`) is fragile, making PIN login unreliable on the deployed server.
- **Logical:** `verifyPin` (`authController.js:128`) only accepts `manager/admin/super_admin` roles. Entering a cashier PIN (`3333`) at a manager-gate (void/refund) returns "invalid manager PIN."

Both are addressed by this plan.

---

## 2. Audit Findings (concrete, with file:line)

### 🔴 CRITICAL
| # | Finding | Location |
|---|---------|----------|
| C1 | **JWT verify does not pin algorithm** (alg-confusion / `none`-alg attack) | `middleware/auth.js:34` |
| C2 | **Rate limit is in-memory → dead on Vercel serverless** (4-digit PIN brute-force open) | `middleware/security.js:33` |
| C3 | **Plaintext PINs written to server logs** (credential leak) | `authController.js:134,141,146,154` |
| C4 | **Live secrets committed** — real Atlas URI (user+password) + dev JWT secrets in repo | `server/.env` |

### 🟠 HIGH
| # | Finding | Location |
|---|---------|----------|
| H1 | **Public order lookup = PII leak / IDOR** — unauthenticated, returns customer name+phone+address; refs enumerable | `orderRoutes.js:21`, `orderController.js:1088` |
| H2 | **Logout is client-side only** — no server-side token invalidation; stolen token lives 8h | `authController.js:107` |
| H3 | **Tenant not bound to token** — JWT carries only `{ userId }`; tenant resolved globally, not from identity. Safe today (single-tenant) but the exact multi-tenant leak vector | `authController.js:17`, `middleware/tenant.js` |

### 🟡 MEDIUM
| # | Finding | Location |
|---|---------|----------|
| M1 | `sameSite:'none'` + `credentials:true` opens CSRF surface | `authController.js:11`, `app.js:48` |
| M2 | 4-digit PINs weak without real lockout | `models/User.js` |

---

## 3. Per-Role Auth Model (target state)

| Role | Auth method | Token | Notes |
|------|-------------|-------|-------|
| **Cashier (POS)** | Custom 4–6 digit PIN (bcrypt) + Redis lockout | Local JWT, httpOnly cookie, 15m access + refresh | Shared terminal, <2s. Not outsourcable. |
| **Admin / Manager** | Clerk phone-OTP (primary); PIN documented fallback | Clerk-signed JWT → verified by existing middleware | Sensitive: money, reports, settings |
| **Customer (PWA)** | Clerk: mobile OTP, Google, Facebook, or email/password | Clerk JWT | Their own device |

### Identity bridging
Clerk authenticates **identity**; your backend stays the source of truth for **tenant + role + money**. Flow:
1. User authenticates with Clerk (OTP/social/email) → Clerk mints JWT.
2. Frontend sends Clerk JWT as `Authorization: Bearer <token>`.
3. `authenticate()` middleware verifies the Clerk JWT using Clerk's JWKS (RS256), extracts `clerkUserId` (the `sub` claim).
4. Middleware loads local `User`/`Customer` by `clerkUserId` → attaches `req.userId`, `req.role`, `req.tenantId`.
5. Money/report/tenant logic is untouched — it already keys off `req.*`.

This keeps blast radius small: Clerk owns passwords/OTP delivery; your code owns authorization.

---

## 4. Token & Security Model

- **Algorithm pinning:** every `jwt.verify` passes `algorithms: [...]` explicitly. Local JWTs → `['HS256']`; Clerk JWTs → `['RS256']` via `clerkBackend`/`@clerk/express`.
- **Hardened claims (local JWTs):** `{ sub, role, tenant, type: 'access'|'refresh' }`.
- **Expiry:** access 15m, refresh 7d, revocable server-side (Redis denylist).
- **Logout:** `/logout` pushes token jti to Redis denylist (not just cookie clear).
- **Lockout:** 5 failed PIN/OTP attempts → 15-min lockout, counter persisted per-user in Redis + mirrored on the User doc.
- **Tenant binding:** `req.tenantId` derived from the authenticated token, not the global resolver, for all authenticated routes.
- **No PII/PIN in logs.**

---

## 5. Phased Implementation Plan

### Phase A — Critical fixes (no architecture change)
**Goal:** close the worst holes with minimal risk. Independent, mergeable PR.

1. Pin `algorithms: ['HS256']` on every `jwt.verify` (`middleware/auth.js`, `config/socket.js` if applicable).
2. Delete all PIN `console.log` lines (`authController.js:134,141,146,154`).
3. **Rotate Atlas password**; purge `server/.env` from git + history; add to `.gitignore`; set Vercel env vars (production secrets only).
4. Gate `GET /api/orders/ref/:reference` — require a long unguessable token OR authenticated caller; stop returning phone/address to anonymous requests.
5. Wire `express-rate-limit` → Upstash `RedisStore` (`config/redis.js` already present).

**Exit criteria:** `grep jwt.verify` shows `algorithms:` on every call; no PIN in logs; `.env` gone from git; Atlas password rotated; order ref endpoint returns 401 for anonymous; rate-limit survives instance churn.

### Phase B — Token integrity & lockout
**Goal:** close the token/IDOR root causes. Builds on Phase A.

6. Add `tenant` + `role` claims to locally-issued JWTs; `authenticate()` derives `req.tenantId` from token for authenticated routes.
7. Short-lived access (15m) + refresh (7d) tokens; refresh stored in Redis; `/logout` adds jti to Redis denylist.
8. Per-user failed-attempt counters → lockout after 5 (Redis + `User.failedAttempts`).

**Exit criteria:** forged/dropped-tenant token rejected; refresh flow works; logout invalidates token server-side; 6th failed PIN locks for 15 min.

### Phase C — Managed-auth migration (Clerk)
**Goal:** outsource Admin/Manager/Customer auth. Largest PR; isolated behind a feature flag.

9. Schema: add `clerkUserId` (unique, sparse) to `User` + `Customer`; add `failedAttempts`, `lockedUntil`.
10. New `controllers/clerkWebhook.js` — on `user.created`, backfill/find local User/Customer by phone/email, link `clerkUserId`.
11. `authenticate()` accepts **either** legacy local JWT (cashier) **or** Clerk JWT (admin/customer) via dual verification path.
12. Enable Clerk phone-OTP (admin/manager); social + mobile OTP + email/password (customer PWA). Frontend swaps to Clerk components.
13. CSRF protection (double-submit token) for cookie-auth paths.

**Exit criteria:** admin logs in via phone OTP; customer via Google/mobile; cashier still via PIN; `authenticate()` handles both token types; webhook links identity on first login.

### Phase D — Defense in depth & regression guards
**Goal:** prevent regressions + harden the edges.

14. 6-digit PIN option on `User` (configurable per user).
15. Automated test suite: assert every `/:id` route is tenant-scoped (IDOR regression guard); assert every `jwt.verify` pins algorithms.
16. Update `CLAUDE.md` security rules:
    - "Every `jwt.verify` must pass `algorithms: [...]`."
    - "Every issued token must have an `expiresIn`."
    - "Every DB query touching tenant-scoped data must filter by `req.tenantId`."
    - "Never log credentials, PINs, tokens, or PII."

**Exit criteria:** test suite green; `CLAUDE.md` rules added; 6-digit PIN available.

---

## 6. Files Touched (preview)

| Area | Files |
|------|-------|
| Middleware | `middleware/auth.js`, `middleware/security.js`, `middleware/tenant.js` |
| Auth | `controllers/authController.js`, `routes/authRoutes.js`, new `controllers/clerkWebhook.js`, new `services/lockout.js` |
| Models | `models/User.js`, `models/Customer.js` |
| Config | `config/env.js`, `config/redis.js`, new `config/clerk.js` |
| Data leak | `controllers/orderController.js` (gate public ref) |
| Infra | `api/index.js`, `vercel.json`, `.gitignore`, rotate `.env` |
| Tests | `tests/smoke.test.js`, new IDOR/token tests |
| Docs | `CLAUDE.md` security rules, this spec |

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Clerk migration breaks existing admin/customer sessions | Feature-flag the dual-verify path; keep legacy JWT working until cutover |
| Atlas password rotation locks out running server | Rotate, update Vercel env, redeploy; keep old password disabled (not deleted) until verified |
| Redis downtime → lockout/ratelimit fail-open vs fail-closed | Fail **closed** on auth (deny login), fail **open** on non-auth rate-limit |
| Refresh-token UX interrupts cashiers mid-shift | Silent refresh in background; access TTL tuned so refresh is invisible |
| Purging `.env` from git history rewrites history | Coordinate repo rewrite + force-push notice; ensure all devs re-clone |

---

## 8. Out of Scope (explicitly deferred)
- Migrating cashier PIN to a managed provider (not feasible on shared kiosk).
- Full multi-tenant tenancy model beyond token-bound `tenantId` (separate project).
- Replacing the global `tenantMiddleware` resolver for unauthenticated/public routes (kept for health checks etc.).
- Voice-agent auth changes (separate review).

---

## 9. Success Criteria (whole effort)
- [ ] Every `jwt.verify` pins `algorithms`.
- [ ] No credentials/PII in logs; `.env` not in git; Atlas password rotated.
- [ ] Anonymous callers cannot read order PII.
- [ ] 5 failed PIN/OTP attempts → lockout.
- [ ] Logout invalidates token server-side.
- [ ] Admin/Manager log in via Clerk phone-OTP; Customer via Clerk (mobile/social/email).
- [ ] Cashier still logs in via PIN.
- [ ] Token-bound `tenantId` enforced on all authenticated tenant-scoped queries.
- [ ] IDOR + JWT test suite green.

---

## 10. Next Step
After user approval of this spec → invoke `writing-plans` skill to produce the detailed implementation plan (per-phase task breakdown).
