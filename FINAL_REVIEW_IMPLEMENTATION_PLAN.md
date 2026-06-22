# TakeawayPOS Pro — Final Review & Implementation Plan

This document serves as the canonical reference for the TakeawayPOS Pro project. It outlines the application architecture, development progress, recurring troubleshooting patterns, pending feature gaps, and a step-by-step consolidation and development roadmap. It is designed to be fully actionable for both human engineers and AI models rebuilding or extending the system.

---

## 1. Application Overview & Technical Architecture

TakeawayPOS Pro is an enterprise-grade takeaway Point of Sale (POS) and store management application. It utilizes a shared database backend to synchronize menu configurations and orders across four channels: Frontdesk POS, Admin Settings, Customer PWA, and an AI Voice Agent.

### 1.1 Technical Stack
* **Monorepo Manager**: Turborepo
* **Frontend Apps (`apps/`)**:
  * `pos`: React (Vite, TypeScript, Tailwind CSS) — Cashier operational surface.
  * `admin`: React (Vite, TypeScript, Tailwind CSS) — Store configurations & reports.
  * `customer`: React (Vite, TypeScript, Tailwind CSS) — Customer ordering PWA.
  * `kds`: React (Vite, TypeScript, Tailwind CSS) — Kitchen Display System.
* **Shared Packages (`packages/`)**:
  * `api-client`: Shared Axios client for all API routes with automatic retries and cold-start resilience.
  * `utils`: Shared calculations (GBP currency formatting, VAT breakdowns, UK postcode validation, idempotency key generation).
  * `admin-modules` *(on Codex branch)*: Reusable settings forms, touch keyboard, and menu studio panels.
* **Backend (`server/`)**: Node.js, Express, MongoDB (Mongoose), Socket.io (real-time sync on port 5001).
* **AI Voice Agent (`voice-agent/`)**: Python (FastAPI, Twilio for SIP/telephony, Gemini Live API for voice synthesis/ordering).

### 1.2 Mongoose Schema Definitions (`server/src/models/`)
To rebuild the database, the following core models are defined:
* **Tenant**: Multi-tenant partitions (`activeProfile`, business details, settings).
* **User**: Staff credentials (bcrypt password, bcrypt PIN, `pinLookup` HMAC-SHA256, roles: `admin`, `manager`, `cashier`).
* **Category / Sub-category**: Product hierarchy and display order.
* **MenuItem**: Core product records containing `variations`, `modifierGroups`, tax rates (0%, 5%, 20%), and `kitchenStationId`.
* **Variation**: MenuItem portions/sizes (e.g. Small, Large) with positive/negative price offsets (`priceDeltaPence`) and unique SKUs.
* **ModifierGroup**: Options (e.g. "Choose Crust") with selection constraints (`minSelection`, `maxSelection`).
* **Component**: Selectable modifier options (e.g. "Stuffed Crust") with `priceDeltaPence`.
* **Label**: Prep instructions (e.g. "NO", "LESS", "ON HALF") that modify component assembly.
* **Bundle**: Fixed-price composite menus (Meal Deals) with allowed category slots and surcharge logic.
* **Order**: Pence-based transactions with lines, discounts, VAT breakdown, payment references, and status flags.
* **Shift**: Cashier till sessions (opening float, closing float, cashier ID, cash variance).
* **DeliveryZone**: Postcode prefix boundaries mapping delivery charge and minimum order values.
* **AuditLog**: Immutable action logs (user, endpoint, description, change delta).

---

## 2. Development Progress Summary (Branch Audit)

The repository currently exists in two parallel development tracks that must be unified:

### 2.1 Track A: Backend Stability & AI Voice Agent (`main` branch)
* **Status**: Production-ready and deployed on Vercel/Render.
* **Key Achievements**:
  * **AI Voice Agent Integration**: Full Twilio SIP integration stream connecting to Gemini Live API. Implements real-time 16kHz audio resampling, silence padding to align speaker timelines, call transcript summarizing, and call log audio playback.
  * **Vercel Signed Cookies**: Solved Vercel function signature issues by introducing custom Express middleware setting `req.secret` before the cookie-parser middleware.
  * **Self-Healing Logins**: Implemented startup automatic PIN lookup repair for bcrypt mismatches when the backend HMAC key changes.
  * **Zod Order Synchronization**: Upgraded schema validation on `/api/orders` to support nested POS/PWA/Voice payloads without validation crashes.

### 2.2 Track B: POS UX & Menu Management Studio (`codex/menu-management-ux` branch)
* **Status**: Highly polished UI/UX, currently on development branch.
* **Key Achievements**:
  * **Modular POS Architecture**: Decomposed the ~2,000-line POS shell (`App.tsx`) into separate component files (`MenuTiles.tsx`, `ProductCustomizer.tsx`, `OrdersView.tsx`, `BasketPanel.tsx`, `DriverDispatch.tsx`).
  * **3-Screen POS Grid State Machine**: Implemented seamless navigation: Categories → Sub-categories → Products. Simple products add instantly, while complex items open an in-grid wizard customizer.
  * **Virtual Keyboard**: Touch-friendly QWERTY keyboard for text inputs (postcode, name) and numeric keypads for numbers (phone, PINs).
  * **Admin Menu Studio (Phase 4)**: Aggregator mapping panels (JustEat, Deliveroo), voice agent prompt validation settings, JSON data portability, and manager authorization step-up prompts.
  * **Responsive layouts**: Auto-adapting layouts optimized for mobile, tablet, and widescreen POS monitors.

---

## 3. Identified Issues and Resolutions

To prevent regression when rebuilding or merging, the following resolutions must be maintained:

### 3.1 POS "Validation failed" on Modifier Orders
* **Problem**: Placing items with modifiers (e.g. Curry with `Mild` and `LESS Spinach`) failed with a red validation error on checkout.
* **Cause**: Backend Zod order validations were too restrictive and rejected properties like `optionName`, `labelName`, or `groupName` sent by POS before normalisation.
* **Fix**: Expanded `server/src/schemas/orderSchema.js` to accept legacy/POS-extended shapes. POS mapping in `apps/pos/src/App.tsx` updated to send all modifier metadata.

### 3.2 Vercel "Invalid PIN" Login Error
* **Problem**: Cold starts or fresh Vercel deployments caused the POS login screen to report "Invalid PIN" for default PINs (e.g. `1111`).
* **Cause**: Express cookie-parser on Vercel threw a `cookieParser("secret") required for signed cookies` crash. Additionally, changes in the HMAC `PIN_LOOKUP_SECRET` rendered the database `pinLookup` hashes unmatchable.
* **Fix**:
  1. Set `req.secret` explicitly in `app.js` before `cookieParser` runs.
  2. Modified `env.js` to warning-log instead of crashing on empty strings.
  3. Added a self-healing PIN repair job on backend seed check that recalculates `pinLookup` from bcrypt if the secret mismatch is detected.

### 3.3 AI Voice Agent Price Calculation Failure
* **Problem**: Voice Agent repeated "unable to calculate total" during telephone orders.
* **Cause**: Python `None` values were sent to the Express API as `null`, failing Zod's `.optional()` validation checks.
* **Fix**: Created a recursive `strip_none` utility in the Python agent to filter out all `None`/`null` properties from payloads prior to API invocation.

### 3.4 Voice Calls & Audio Recordings Missing from Dashboard
* **Problem**: Completed voice orders appeared in POS, but logs showed "No summary captured" and lacked the audio player.
* **Cause**: Schema field mismatch: Python agent wrote recording IDs to `stereoAudioFileId`/`userAudioFileId` and summary to `issueSummary` while Node.js expected `stereoFileId`/`userFileId` and `transcriptSummary`.
* **Fix**: Upgraded `reportController.js` and `voice-agent/call_store.py` to write/resolve both naming conventions, and merged summaries on retrieval.

### 3.5 Overlapping Audio in Voice Agent Call Recordings
* **Problem**: Downloaded stereo WAV files contained overlapping caller and agent speech.
* **Cause**: User audio streams continuously, but Gemini agent streams audio in discrete speech bursts. Silent gaps on the agent channel were omitted, shifting the agent's voice blocks out of temporal alignment.
* **Fix**: Added a master clock syncing user and agent samples in `gemini_session.py`. The agent channel is padded dynamically with digital silence to match user timeline before mixing.

---

## 4. Pending Tasks and Future Development

The following gaps remain between the current code state and the production goals:

### 4.1 High Priority (Go-Live Blockers)
* **POS Reprint Buttons (UI)**: Add cash/kitchen/token reprint controls inside the POS order history view (currently, the backend `/reprint-` routes exist but are unlinked in the POS UI).
* **Payment Terminal Gateway**: Replace simulated card checkouts with physical Stripe Terminal SDK hooks.
* **IndexedDB Offline Queue**: Upgrade the current local storage fallback to a resilient IndexedDB queue (e.g. using `Dexie.js`) for PWA data buffering and synchronization.

### 4.2 Medium Priority (UX and Operations)
* **Product Form Templates**: Pre-configured defaults (Pizza, Curry, Burger, SFC) in the Admin Product Wizard to accelerate inventory setup.
* **Wizard Previews**: Live visual mocks in Admin displaying how an item will render on POS, Customer PWA, and kitchen tickets.
* **Manual Add-ons (Free-text)**: Support cashiers entering one-off free-text modifiers with custom prices in the POS customizer.

### 4.3 Low Priority (Compliance and Scale)
* **Challenge 25 Logs**: Capture cashier age-verification confirmations in the `AuditLog` database for compliance exports.
* **UK Tax MTD Export**: Finalize and export VAT reports formatted for HMRC's Making Tax Digital API.
* **Room-Targeted WebSockets**: Restrict socket broadcast channels to specific tenant IDs to ensure secure multi-tenant isolation.

---

## 5. Consolidation Strategy and Next Steps

To progress the application toward launch, implement the following steps in sequence:

### Step 1: Merging UX Enhancements into Main
1. Check out the `main` branch.
2. Create a backup branch (`git checkout -b main-unification`).
3. Run `git merge codex/menu-management-ux` to bring in the decomposed POS components, virtual keyboard, and admin menu studio.
4. Resolve merge conflicts in `server/src/app.js` and `apps/pos/src/App.tsx`, preserving:
   * **Main branch's** Vercel signed-cookie middleware.
   * **Main branch's** Voice Agent schemas and database self-healing seed repairs.
   * **Codex branch's** component imports and decomposed layout.

### Step 2: Implement POS Reprint UI
1. Locate the POS orders list overlay (on consolidated branch, this will be in `apps/pos/src/components/OrdersView.tsx`).
2. Add a button group for **Reprint Receipt**, **Reprint Kitchen**, and **Reprint Token**.
3. Link the buttons to trigger:
   * `POST /api/orders/:id/reprint-customer`
   * `POST /api/orders/:id/reprint-kitchen`
   * `POST /api/orders/:id/reprint-token`
4. Verify by checking if the Express server triggers the ESC/POS printer builder logs.

### Step 3: Run Full Seed Integration Tests
1. Run `npm run seed` to populate the Rupeyal Express menu database.
2. Start the local server and POS application.
3. Place a test order for a curry with custom labels and add-ons to verify checkout Zod validations pass.
4. Test placing a voice agent order to ensure price calculations and transcription logs populate without errors.
