# Grocery POS Production Implementation Plan

Prepared on: 27 May 2026  
Application: Grocery POS MERN  
Target: Medium-sized UK grocery store readiness  
Planning basis: Current codebase, internal PRD report, and multi-model production-readiness feedback  

## 1. My Overall View

The external consensus is directionally correct. The application should not be rewritten. It has a good foundation: pence-based money handling, VAT-aware transaction storage, Challenge 25 workflow, promotion engine, stock movements, roles, audit logs, seeded retail data, admin operations, and a responsive POS UI.

The next step is to move from "feature-rich MVP" to "operationally safe retail system". That means the priority order must be:

1. Protect money, auth, audit, and data.
2. Replace simulated payments with a real provider or a clearly reconciled semi-integrated workflow.
3. Complete daily till workflows: refunds, held transaction resume, customer lookup, Z-report/reconciliation.
4. Complete stock workflows: stocktake, purchase orders, delivery receiving.
5. Add automated tests, CI, monitoring, backups, and recovery.
6. Polish compliance exports and admin navigation.

Estimated readiness today: 40-50 percent for live UK retail.  
Estimated hardening timeline: 8-12 weeks for production readiness if implemented in focused phases.

## 2. Planning Principles

Every change should pass these tests:

- Does it make checkout faster or safer?
- Does it reduce cashier mistakes?
- Does it protect money, VAT, stock, or audit records?
- Does it help the owner reconcile what happened today?
- Does it avoid overbuilding features that are not needed for one medium-sized shop?

Product stance:

- Keep the POS screen as a single operational surface.
- Use modals/drawers for cashier workflows during a sale.
- Move admin from flat tabs to a role-aware hierarchical sidebar.
- Keep all financial calculations server-authoritative.
- Treat offline mode as a controlled degraded mode, not a hidden normal mode.
- Make audit and reporting boringly reliable.

## 3. Target Production Architecture

### 3.1 Recommended Architecture

Frontend:

- Keep Vercel for the React frontend.
- Continue using Vite build output from `client/dist`.
- Use Vercel CDN for static assets.

Backend:

- Move Express API from Vercel serverless to a persistent Node service.
- Recommended first choice: Railway or Render for speed and simplicity.
- Alternative: lightweight VPS if local IT support is available.
- Keep API behind HTTPS.
- Add structured logging and request IDs.

Database:

- Use MongoDB Atlas dedicated cluster for production.
- Recommended target: M10 or better once live transaction volume begins.
- Enable cloud backups and point-in-time restore where available.
- Keep local dev/demo memory DB only for development.

Uploads:

- Move uploads away from server filesystem.
- Use Cloudinary, S3, R2, or similar object storage.
- Store only image URLs/keys in MongoDB.

Jobs:

- Move cron-like tasks to persistent backend scheduler or managed jobs.
- Do not rely on serverless function lifecycle for low-stock alerts, scheduled prices, backups, or end-of-day work.

Monitoring:

- Sentry for frontend/backend errors.
- Structured logs with correlation/request IDs.
- Uptime monitor for frontend, API, and database health.

Backups:

- MongoDB Atlas automated backups.
- Scheduled offsite JSON or BSON backup to object storage.
- Restore procedure tested monthly.

### 3.2 Why Move the Backend Off Vercel Serverless

Vercel is excellent for the frontend, but the POS backend needs predictable behavior for:

- Till response time.
- Payment callbacks.
- Receipt PDF generation.
- Scheduled jobs.
- Uploads.
- Long-running stock/report operations.
- Local shop resilience.

Official Vercel function limits are much higher than older assumptions, but serverless still has lifecycle and filesystem constraints that are not ideal for a POS backend. The issue is less "can the request finish" and more "should a till-critical backend depend on stateless serverless behavior".

### 3.3 Alternative Local-First Option

For a shop with unreliable internet, a future stronger architecture is:

- In-store mini server or POS terminal app.
- Local database/cache for active product catalogue and offline sales.
- Cloud sync for backup/reporting.
- Cloud admin portal for owner visibility.

This is more complex and should come after the web-first production hardening unless the shop has frequent connectivity problems.

## 4. Target Menu and Navigation Structure

### 4.1 POS Navigation

POS should remain one page. No navigation away during a live sale.

Desktop layout:

- Top bar:
  - Store name.
  - Till ID.
  - Cashier name.
  - Shift timer.
  - Online/offline/sync status.
  - Scanner status.
  - Lock/logout.

- Left action rail:
  - POS home.
  - Resume held.
  - Refund mode.
  - Gift card.
  - Price check.
  - Scale/loose item mode.
  - Product hotkeys.
  - Manager override.
  - Settings/admin link if permitted.
  - Lock till.

- Main catalogue:
  - Barcode/PLU/SKU input.
  - Product search.
  - Category row.
  - Compact product tiles.
  - Loose produce / PLU quick tab.
  - Configurable high-seller shortcut grid.
  - Scale status indicator for weighed items.

- Right basket:
  - Basket lines.
  - Discounts/promotions.
  - Customer loyalty/account display.
  - VAT breakdown.
  - Payment controls.
  - Receipt actions.

Modal/drawer workflows:

- Resume held transaction.
- Refund lookup.
- Price check.
- Customer lookup.
- Gift card balance/top-up.
- Manager PIN.
- Challenge 25.
- Payment terminal progress.
- Receipt options.

### 4.2 Admin Navigation

Replace the current flat tab list with hierarchical sidebar sections:

1. Dashboard
   - KPIs
   - Alerts
   - Quick actions

2. Till Operations
   - Live shifts
   - Shift history
   - X-report
   - Z-report
   - Till reconciliation
   - Refunds and voids

3. Products and Pricing
   - Products
   - Categories
   - Bulk price update
   - Scheduled prices
   - VAT rates
   - Unit pricing warnings
   - Product import/export

4. Inventory and Purchasing
   - Stock levels
   - Stock adjustments
   - Stocktake
   - Wastage/shrinkage
   - Expiry/clearance
   - Suppliers
   - Purchase orders
   - Delivery receiving

5. Promotions and Loyalty
   - Promotions
   - Coupons/vouchers
   - Meal deals
   - Loyalty settings
   - Promotion performance

6. Customers
   - Customer profiles
   - Customer lookup
   - Loyalty points
   - Account credit
   - GDPR consent
   - Data export/anonymise

7. Reports and Compliance
   - Sales reports
   - VAT / MTD export
   - Inventory reports
   - Financial reports
   - Challenge 25 log
   - Gift-card liability
   - Audit log

8. Settings
   - Store details
   - Receipt setup
   - POS settings
   - VAT settings
   - Payment terminals
   - Hardware
   - Email/SMTP
   - Users and roles

9. System
   - Health
   - Backups
   - Restore
   - Integrations
   - Data retention

### 4.3 Role-Based Menu Visibility

Cashier:

- POS only.
- Modals: refund only if allowed by manager PIN, price check, gift card balance if permitted.

Manager:

- POS.
- Till Operations.
- Inventory and Purchasing, excluding destructive settings.
- Reports and Compliance.
- Promotions if owner allows.
- Cannot grant admin role.
- Cannot edit VAT settings unless explicitly permitted.

Admin/Owner:

- All sections.
- Role management.
- VAT settings.
- Backup/restore.
- Payment terminal setup.
- System health.

Implementation detail:

- Create permission constants shared between frontend and backend.
- Add route-level permission middleware, not only broad role checks.
- Store permissions as role presets first; avoid overcomplicated per-user custom permissions until needed.

## 5. Critical Process Flows to Implement

### 5.1 Sale Flow

Current status: mostly implemented.

Final target flow:

1. Cashier logs in.
2. Opens shift with cash float.
3. Scanner input remains focused.
4. Product scanned/searched/tapped.
5. If age restricted, Challenge 25 modal blocks progress until outcome.
6. Basket recalculates server quote for promotions and VAT.
7. Optional customer lookup.
8. Optional loyalty redemption/account credit.
9. Payment selected.
10. Payment terminal authorized or cash tendered.
11. Sale submitted with idempotency key.
12. Backend validates:
    - Auth.
    - Open shift.
    - Product active.
    - Stock.
    - Challenge 25.
    - Promotion quote.
    - Payment approval.
    - Idempotency.
13. Transaction saved.
14. Stock movements saved.
15. Shift expected cash updated.
16. Loyalty updated.
17. Receipt generated.
18. Audit event written.

Required improvements:

- Add idempotency key to sale.
- Add server-side open-shift validation.
- Add terminal approval reference before completion.
- Add customer lookup and loyalty redemption UI.
- Add email receipt option.

### 5.2 Refund Flow

Current status: backend exists; POS UI missing.

Target flow:

1. Cashier selects Refund from POS rail.
2. Modal asks for receipt number, transaction reference, or lookup by date/cashier.
3. Original transaction appears with line items.
4. Cashier selects full or partial quantities.
5. Cashier selects reason:
   - Damaged.
   - Wrong item.
   - Customer changed mind.
   - Other.
6. System defaults refund method to original payment method.
7. Manager PIN required for:
   - Cash refund above threshold.
   - Refund method override.
   - No-receipt/manual refund.
8. Backend validates not over-refunding.
9. Refund transaction created.
10. Stock restored where appropriate.
11. Refund receipt generated.
12. Audit event records cashier, reason, original reference, manager if applicable.

Implementation tasks:

- Build `RefundModal`.
- Add transaction lookup UI.
- Add selected refund line state.
- Add manager PIN modal.
- Add refund API payload support for manager authorisation.
- Add refund receipt display/print.
- Add report filters for refunds.

Acceptance criteria:

- Cannot refund more quantity than sold minus already refunded.
- Refund shows negative total in reports.
- Stock is restored exactly once.
- Manager PIN is logged when required.

### 5.3 Held Transaction Resume Flow

Current status: hold endpoint exists; resume UI missing.

Target flow:

1. Cashier clicks Hold.
2. System asks optional label or uses time/customer label.
3. Basket is stored as held transaction.
4. Cashier starts new basket.
5. Cashier clicks Resume Held.
6. Drawer lists held transactions for current cashier/till.
7. Cashier selects one.
8. Basket restores.
9. Held transaction is marked resumed or deleted/closed.

Implementation tasks:

- Add resume held drawer.
- Add endpoint to mark held transaction resumed/cancelled.
- Include age-restricted events handling on resumed items.
- Include held transaction owner/till and timestamp.

Acceptance criteria:

- Held basket can be recovered after page refresh.
- Held basket cannot be accidentally duplicated into multiple completed sales.

### 5.4 Shift Close and Z-Report Flow

Current status: basic open/close and stored Z-report.

Target flow:

1. Cashier clicks Close shift.
2. System shows X-report preview:
   - Sales count.
   - Gross revenue.
   - VAT collected.
   - Payments by method.
   - Cash sales.
   - Cash refunds.
   - Voids.
   - Discounts.
   - Expected drawer cash.
3. Cashier enters closing float.
4. System calculates variance.
5. Manager PIN required if variance above threshold.
6. Cashier confirms close.
7. Z-report generated and stored permanently.
8. Z-report printable in 80mm and A4/PDF.

Implementation tasks:

- Add shift summary endpoint.
- Add X/Z report UI.
- Add narrow and A4 PDF templates.
- Add variance threshold setting.
- Add manager approval workflow.

Acceptance criteria:

- Shift close cannot complete without closing cash count.
- Z-report is immutable after close.
- Report includes complete payment split and VAT totals.

### 5.5 Stocktake Flow

Current status: missing.

Target flow:

1. Manager creates stocktake.
2. Scope selected:
   - Entire store.
   - Category.
   - Supplier.
   - Low-stock subset.
3. System captures expected stock snapshot.
4. Printable count sheet generated.
5. Staff enter counted quantities.
6. System calculates variance:
   - Expected.
   - Counted.
   - Difference.
   - Cost impact.
7. Manager reviews and approves.
8. Approved stocktake posts stock movements.
9. Inventory quantities update.
10. Variance report stored.

Implementation tasks:

- Add `Stocktake` model.
- Add stocktake routes/controller.
- Add admin Stocktake screens.
- Add count sheet PDF.
- Add variance report.
- Add approval/posted status.

Acceptance criteria:

- Expected stock snapshot does not change after stocktake begins.
- No stock adjustment posts until approval.
- Posted stocktake cannot be edited, only reversed with audit.

### 5.6 Purchase Order and Receiving Flow

Current status: PO model exists; full workflow missing.

Target flow:

1. Manager creates purchase order by supplier.
2. Products selected with ordered quantities.
3. Cost price auto-filled from product.
4. PO saved as draft.
5. PO marked sent.
6. PDF/email export available.
7. Delivery received against PO.
8. Received quantities entered.
9. Discrepancies flagged:
   - Short delivery.
   - Over delivery.
   - Cost price mismatch.
   - Damaged goods.
10. Confirm receiving.
11. Stock increments.
12. Stock movements created.
13. PO status updates:
   - Partially received.
   - Fully received.
   - Cancelled.

Implementation tasks:

- Expand PO controller beyond generic CRUD.
- Add PO screens.
- Add delivery receiving screens.
- Add PO PDF generation.
- Add stock movement type `delivery`.
- Add supplier performance notes/report.

Acceptance criteria:

- Receiving stock is impossible without audit.
- Partial delivery remains open.
- Stock movements link to PO and user.

### 5.7 Weighed Item Flow

Current status: product model supports kg/litre style products and PLU entry, but direct weighing scale integration is not implemented.

Target flow for loose produce:

1. Cashier presses product hotkey, scans PLU, or taps loose product tile.
2. POS identifies the item as sold by weight.
3. POS reads stable weight from approved scale or asks for manual fallback with manager permission.
4. POS applies tare if configured.
5. POS calculates line total from unit price x weight.
6. Basket line shows:
   - Product.
   - Weight in kg.
   - Unit price per kg.
   - Total.
   - Scale/source indicator.
7. Transaction stores:
   - Gross weight.
   - Tare.
   - Net weight.
   - Unit price.
   - Scale ID or source.
   - Manual override reason if used.

Important UK compliance point:

- For goods sold by weight, the weighing equipment used to determine the final customer quantity must be suitable for trade use and properly approved/verified. The software should not turn an uncertified kitchen/check scale into a trade scale.

Implementation options:

1. Price-embedded barcode from scale label printer:
   - Scale weighs and price-computes.
   - Scale prints barcode label.
   - POS scans label and parses product/price/weight.
   - This is the simplest and most reliable production path for many grocery stores.

2. Direct scale read through Web Serial:
   - Browser connects to USB/RS-232 serial scale.
   - POS reads stable weight.
   - Requires Chrome/Edge compatible device access and scale protocol adapters.

3. Local hardware bridge:
   - Small local Node/Electron service reads scale through serial/OPOS/vendor driver.
   - Browser talks to bridge through localhost WebSocket/HTTP.
   - Most reliable option for production hardware, especially when combining scale, printer, and cash drawer.

4. Manual weight entry:
   - Fallback only.
   - Manager PIN required.
   - Reason logged.

Recommended production approach:

- Short term: support price-embedded scale labels and PLU/quick codes.
- Medium term: add local hardware bridge for live scale reads.
- Avoid relying only on browser hardware APIs for the final production path if the store depends heavily on loose produce.

Acceptance criteria:

- Weighed item cannot be added without weight source.
- Manual weight override is audited.
- Receipt shows weight and unit price.
- Transaction stores weight details permanently.
- Scale connection status is visible before cashier starts selling loose items.

### 5.8 Product Hotkey Flow

Current status: POS supports product tiles, category filter, scanner field, barcode, SKU, and PLU entry. Product-specific keyboard shortcuts are not yet implemented.

Target flow:

1. Admin assigns quick keys or quick codes to high-sale products.
2. Cashier can add products by:
   - Pressing keyboard shortcut.
   - Typing quick code into scanner field.
   - Using numeric keypad code.
   - Clicking quick-pick button.
3. If product is sold by weight, shortcut opens scale/weight flow.
4. If product is age restricted, shortcut still triggers Challenge 25.
5. Shortcut usage is included in cashier activity metadata where useful.

Examples:

- Coriander: quick code `COR`, hotkey `Alt+1`.
- Chillies: quick code `CHI`, hotkey `Alt+2`.
- Tomatoes: quick code `TOM`, hotkey `Alt+3`.
- Curd: quick code `CURD`, hotkey `Alt+4`.
- Milk: quick code `MILK`, hotkey `Alt+5`.
- Coke cans: quick code `COKE`, hotkey `Alt+6`.

Implementation design:

- Add `quickCode` and `hotkey` fields to product or a separate `ProductShortcut` model.
- Prefer a separate shortcut model if shortcuts are till-specific, cashier-specific, or seasonal.
- Add Admin screen: Products and Pricing -> Quick Keys.
- Add POS shortcut overlay opened by `?` or a visible keyboard button.
- Add conflict detection:
  - No duplicate hotkey in same till/profile.
  - No duplicate quick code.
  - Do not allow browser-critical shortcuts such as Ctrl+R, Ctrl+W, Alt+F4.
- Add shortcut scope:
  - Global.
  - Category.
  - Till profile.
  - Cashier profile.

Recommended shortcut strategy:

- Use quick codes as the most reliable method because scanner field already behaves like command input.
- Use numeric keypad shortcuts for the fastest items.
- Use physical key combinations only for the top 10-20 products, not hundreds.
- Keep a visible quick-pick grid for touch screens.

Acceptance criteria:

- Cashier can add top products without mouse.
- Hotkeys do not fire while typing in search/payment/customer fields.
- Shortcut conflicts are blocked in admin.
- Shortcuts respect Challenge 25, stock, and scale rules.

## 6. Security Hardening Plan

### 6.1 Auth Migration

Current:

- JWT stored in localStorage.

Target:

- Access token in secure httpOnly cookie.
- SameSite=Lax or Strict where possible.
- Secure=true in production.
- CSRF token for state-changing requests.
- Short access session with refresh strategy if needed.

Implementation:

- Backend sets cookie on login.
- Frontend Axios uses `withCredentials`.
- Remove token localStorage dependency.
- Add `/auth/logout` clearing cookie.
- Add CSRF middleware and token endpoint.
- Update Vercel/backend CORS credentials behavior.

Acceptance criteria:

- XSS cannot directly read auth token.
- All POST/PUT/PATCH/DELETE requests require valid CSRF token.
- Logout invalidates browser session.

### 6.2 Zod Validation

Current:

- Sanitizer strips dangerous keys.
- Mongoose validates some model constraints.

Target:

- Zod schema per write endpoint.
- Strict payload shape.
- Type conversion at boundary.
- User-friendly validation errors.

Priority schemas:

- Login.
- Open/close shift.
- Sale quote.
- Complete sale.
- Refund.
- Void.
- Product create/update.
- Stock adjustment.
- Promotion create/update.
- User create/update.
- Customer create/update.
- Settings update.

Acceptance criteria:

- Invalid payloads return 400 with clear field errors.
- No write endpoint accepts unknown dangerous fields.

### 6.3 Permission Model

Current:

- Broad role checks.

Target:

- Permission constants:
  - `pos.sale`
  - `pos.refund`
  - `pos.discount`
  - `pos.priceOverride`
  - `shift.close`
  - `product.write`
  - `stock.adjust`
  - `vat.write`
  - `user.adminGrant`
  - `settings.write`
  - `report.view`
  - `audit.view`
  - `backup.export`
  - `backup.restore`

Implementation:

- Map role presets to permissions.
- Backend middleware checks permission.
- Frontend menu filters by permission.
- Manager PIN records which permission/action was approved.

Acceptance criteria:

- Manager cannot edit VAT settings unless permission exists.
- Cashier cannot call manager endpoints directly.
- Admin role grant remains admin-only.

### 6.4 Immutable Audit Logs

Current:

- Audit logs exist.
- No delete route exposed.

Target:

- Application-level append-only service.
- Remove generic update/delete access to audit model.
- Database collection validation where feasible.
- Optional hash chain for tamper evidence.

Implementation:

- Central `AuditService.append`.
- Add previous hash/current hash fields.
- Create index on createdAt/action/actor/entity.
- No controller exposes audit mutation.
- Optional scheduled audit integrity check.

Acceptance criteria:

- Application cannot update/delete audit logs.
- Report can detect broken audit hash chain.

## 7. Real Payment Plan

### 7.1 Recommended First Provider

Recommended default: Stripe Terminal.

Reasons:

- Strong developer documentation.
- UK support.
- PaymentIntent workflow fits current transaction model.
- Supports simulated/test readers for development.
- Can keep card data outside our app.

Alternatives:

- Worldpay if the shop already has a merchant account.
- Square/SumUp if operational simplicity matters more than deep integration.
- Semi-integrated card terminal as an interim: cashier enters amount on card machine, then records approved reference in POS. This is operationally acceptable as a stepping stone if reconciled carefully, but not as polished as integrated terminal flow.

### 7.2 Target Payment Flow

1. Cashier selects Card/Contactless.
2. Frontend requests `/payments/terminal/intent`.
3. Backend creates PaymentIntent/provider payment session.
4. Frontend or backend connects to terminal.
5. Terminal collects payment.
6. Provider returns approved/declined.
7. Backend confirms provider reference.
8. Sale completion API requires approved payment reference.
9. Transaction stores:
   - Provider.
   - Payment intent ID.
   - Terminal ID.
   - Status.
   - Last four/card brand if provider permits and PCI scope remains safe.
10. Refund uses provider refund API where applicable.

### 7.3 Payment Guardrails

- Add idempotency key to payment and sale.
- Add payment status state machine:
  - initiated
  - terminal_presented
  - processing
  - approved
  - declined
  - cancelled
  - failed
  - refunded
- Never mark sale complete until payment approved.
- Prevent reusing same payment reference for multiple sales.
- Store reconciliation fields.

Acceptance criteria:

- Refreshing the browser after approval does not duplicate charge or sale.
- Declined card does not create completed sale.
- Refund can trace original provider payment reference.

## 8. Offline Resilience Plan

### 8.1 Current Offline State

Current:

- Product cache in localStorage.
- Offline transaction queue in localStorage.
- Sync on browser online event.

Target:

- IndexedDB with Dexie.js or equivalent.
- Service-worker-assisted caching later if needed.
- Idempotent sync.
- User-visible sync dashboard.

### 8.2 IndexedDB Data Stores

Stores:

- `products`
- `categories`
- `promotions`
- `customers_limited`
- `offline_transactions`
- `sync_log`
- `terminal_events`

Offline transaction fields:

- Local ID.
- Server idempotency key.
- Cashier ID.
- Shift ID.
- Till ID.
- Basket snapshot.
- Payment snapshot.
- Created at.
- Sync status:
  - queued
  - syncing
  - synced
  - failed
  - conflict
- Last error.

### 8.3 Offline Rules

Allowed offline:

- Cash sale if cashier/manager policy allows.
- Product lookup from cache.
- Hold local basket.

Restricted offline:

- Card/contactless unless payment provider supports approved offline mode.
- Gift-card redemption unless locally cached balance is explicitly allowed.
- Account credit payment.
- Refunds.
- Admin stock changes.

Acceptance criteria:

- Duplicate sync does not create duplicate transaction.
- Cashier can see unsynced count and failed sync reason.
- Manager can review offline transactions.

## 9. Testing and CI/CD Plan

### 9.1 Test Stack

Backend:

- Vitest or Jest.
- Supertest for API integration.
- mongodb-memory-server for integration tests.

Frontend:

- Vitest.
- React Testing Library.
- Playwright for critical end-to-end flows.

CI:

- GitHub Actions.
- Steps:
  - install
  - lint
  - test
  - build
  - dependency audit
  - secret scan

### 9.2 P0 Tests

Money/VAT:

- VAT extraction from gross at 0, 5, 20 percent.
- Rounding edge cases.
- Line discounts.
- Basket discounts.
- Refund negative totals.

Promotions:

- BOGOF.
- BOGOHP.
- Buy X get Y.
- Tiered pricing.
- Mix and match.
- Meal deal.
- Coupon minimum spend.
- Non-stackable conflict.
- Stackable promotion.

Transactions:

- Sale completion.
- Payment under-total rejected.
- Out-of-stock rejected.
- Stock decremented once.
- Shift expected cash updated.
- Gift-card deduction.
- Idempotency prevents duplicate sale.

Challenge 25:

- Age-restricted product requires event.
- Refused event rejects sale.
- Event stored with transaction.

Refunds:

- Partial refund.
- Over-refund rejected.
- Stock restored.
- Original refunded quantity updated.

Auth/Permissions:

- Cashier cannot access admin routes.
- Manager cannot grant admin role.
- Admin-only backup.
- CSRF required on write endpoints after cookie migration.

Offline:

- Queue transaction.
- Sync success.
- Sync failure retained.
- Duplicate sync blocked.

### 9.3 Acceptance Criteria for Launch

- 80 percent plus coverage on money, promotion, transaction, auth, and stock modules.
- All critical API flows covered by integration tests.
- At least five E2E flows:
  - Login/open shift/sale.
  - Challenge 25 sale/refusal.
  - Refund.
  - Held/resume.
  - Stock adjustment/report.
- CI must pass before deploy.

## 10. Compliance Plan

### 10.1 VAT and MTD

Current:

- VAT breakdown and Box 1/Box 6 style report exist.

Target:

- Accountant-ready VAT export.
- Optional future HMRC VAT MTD API integration.
- Keep digital records for at least six years.

Implementation:

- Add VAT period selector.
- Add VAT report lock/finalise status.
- Add export formats:
  - CSV.
  - Xero-style CSV.
  - QuickBooks/Sage-friendly CSV.
- Add VAT audit drilldown by transaction.
- Add retention policy setting.

Acceptance criteria:

- VAT report can be regenerated for any period.
- Every transaction contributing to VAT report is traceable.
- Export totals reconcile to sales report.

### 10.2 Challenge 25

Target:

- Dedicated report for Trading Standards review.

Fields:

- Timestamp.
- Cashier.
- Product.
- Category.
- Age threshold.
- Outcome.
- Transaction/receipt reference.
- Manager override if any.

Acceptance criteria:

- Report exportable as CSV/PDF.
- Filter by date, cashier, product/category, outcome.

### 10.3 GDPR

Current:

- Customer consent and anonymisation.

Target:

- Customer data export.
- Consent audit.
- Email receipt consent handling.
- Data retention policy.

Implementation:

- `/admin/customers/:id/export`
- Include profile, consent, loyalty points, account credit, purchase history references.
- Email receipt option must not enable marketing consent automatically.
- Add clear distinction between operational receipt email and marketing opt-in.

Acceptance criteria:

- Customer can be exported as JSON/PDF.
- Customer can be anonymised without deleting financial transaction records.

## 11. Hardware Plan

### 11.1 Required Hardware

Minimum production setup:

- Barcode scanner supporting keyboard wedge mode.
- Receipt printer supporting browser print or ESC/POS.
- Cash drawer connected to receipt printer or POS hardware.
- Card terminal.
- Trade-suitable weighing scale or price-computing label scale for loose goods.
- Stable network and backup internet option.

### 11.2 Barcode Scanner Plan

Current support:

- The POS already has an always-ready scanner input.
- Most USB barcode scanners can operate in keyboard wedge mode, which means scanned barcode digits are typed into the focused input and submitted with Enter.
- This works well for standard EAN/UPC grocery products.

Production requirements:

- Add scanner setup screen:
  - Test scan.
  - Expected suffix: Enter.
  - Optional prefix/suffix trimming.
  - Minimum and maximum barcode length.
  - Supported barcode formats.
  - Till-specific scanner profile.
- Add duplicate scan debounce:
  - Prevent accidental double-add if scanner sends two enters or cashier double-scans.
- Add scan log for troubleshooting:
  - Raw code.
  - Matched product.
  - Unmatched code.
  - Timestamp.
  - Cashier/till.
- Add price-embedded barcode parser:
  - Useful for scale labels.
  - Supports prefixes such as 20/21/22/23 where configured.
  - Extracts product code, price and/or weight depending on label format.

Implementation tasks:

- Add `scanner` settings key.
- Add `barcodeParsers` utility.
- Extend product with optional `embeddedBarcodePrefix` or add parser settings by category.
- Add scanner diagnostics modal in POS.

Recommended first implementation:

- Keep keyboard wedge as default.
- Add scanner test/setup UI.
- Add embedded barcode parser for scale-printed labels.

### 11.3 Weighing Scale Integration Plan

Legal/compliance guardrail:

- For UK retail sales by weight, the weighing equipment used to determine the final quantity sold to the customer must be suitable for trade use and properly approved/verified. The app should store the weight result, but the scale itself must be legally suitable for trade.

Hardware approaches:

1. Price-computing scale with printed label:
   - Best short-term route.
   - Scale performs legal weighing/price computation.
   - Label barcode is scanned by POS.
   - POS parses product and price/weight.

2. Serial scale connected to POS:
   - Scale sends stable weight via RS-232/USB serial.
   - Browser can use Web Serial in supported desktop browsers.
   - Requires per-scale protocol adapters.

3. Local hardware bridge:
   - Recommended production-grade route.
   - A local service reads serial/OPOS/vendor device APIs.
   - React app communicates with bridge via localhost WebSocket.
   - Better for multi-device setups: scale, printer, cash drawer, customer display.

Scale software requirements:

- Device pairing screen.
- Scale status indicator:
  - connected
  - disconnected
  - unstable
  - stable
  - error
- Read stable weight only.
- Tare support.
- Zero function if supported.
- Unit conversion restricted to metric sale units.
- Manual fallback with manager PIN.
- Scale event log.

Data to store on transaction lines:

- `soldByWeight`
- `grossWeight`
- `tareWeight`
- `netWeight`
- `weightUnit`
- `unitPricePence`
- `scaleId`
- `weightSource`: scale, embedded_barcode, manual
- `manualWeightReason`

Recommended scale rollout:

- Phase A: scale-label barcode parsing.
- Phase B: Web Serial prototype for one chosen scale model.
- Phase C: local hardware bridge for production reliability.

### 11.4 Product Hotkeys and Quick Codes

Purpose:

- Speed up high-volume product entry for loose produce and fast sellers.

Recommended model:

- Quick code:
  - Typed into barcode/scanner field and submitted with Enter.
  - Examples: `COR`, `CHI`, `TOM`, `CURD`, `MILK`, `COKE`.
- Keyboard hotkey:
  - Physical shortcut such as `Alt+1`.
  - Only for top products.
- Quick-pick button:
  - Touch-friendly tile in POS grid.

Admin configuration:

- Product.
- Label.
- Quick code.
- Hotkey.
- Sort order.
- Colour/accent.
- Till profile.
- Active dates if seasonal.
- Requires weight.
- Default quantity.

POS behavior:

- Hotkey adds product if safe.
- If sold by weight, opens scale flow.
- If age restricted, opens Challenge 25.
- If out of stock, blocks or warns based on setting.
- If input field is search/payment/customer form, hotkeys are paused to avoid accidental additions.

Suggested first hotkey set:

- `Alt+1` Coriander / quick code `COR`.
- `Alt+2` Chillies / quick code `CHI`.
- `Alt+3` Tomatoes / quick code `TOM`.
- `Alt+4` Curd / quick code `CURD`.
- `Alt+5` Milk / quick code `MILK`.
- `Alt+6` Coke cans / quick code `COKE`.
- `Alt+7` Bananas / quick code `BAN`.
- `Alt+8` Onions / quick code `ONI`.
- `Alt+9` Potatoes / quick code `POT`.

### 11.5 Browser Print vs Native Bridge

Phase 1:

- Keep browser print for 80mm receipts.
- Add printer setup guide and print test screen.

Phase 2:

- Add optional local print bridge:
  - Electron helper, local service, or WebSocket bridge.
  - ESC/POS support.
  - Cash drawer kick command.

Acceptance criteria:

- Staff can print test receipt.
- Receipt width matches 80mm.
- Cash drawer opens only after cash sale or permitted no-sale action.

## 12. Detailed Phased Implementation Roadmap

### Phase 0: Planning and Baseline

Duration: 2-3 days.

Goals:

- Freeze scope for production hardening.
- Confirm payment provider.
- Confirm infrastructure target.
- Confirm hardware list.
- Confirm role/permission matrix.

Deliverables:

- Finalised rollout checklist.
- Provider decision.
- Infrastructure decision.
- Updated `.env.example`.
- Baseline smoke test script.

Exit criteria:

- Owner agrees on payment provider and launch priorities.

### Phase 1: Security and Data Integrity

Duration: 1-2 weeks.

Tasks:

- Move JWT from localStorage to httpOnly secure cookie.
- Add CSRF protection.
- Add logout endpoint.
- Add Zod validation for core write endpoints.
- Add permission constants and middleware.
- Add field-level protection for VAT settings, role grants, refunds, overrides.
- Harden audit logging with append-only service and hash chain.
- Add idempotency model and middleware.
- Add request ID middleware.

Files likely touched:

- `server/src/controllers/authController.js`
- `server/src/middleware/auth.js`
- `server/src/middleware/security.js`
- `server/src/middleware/validation.js`
- `server/src/middleware/idempotency.js`
- `server/src/utils/audit.js`
- `server/src/models/AuditLog.js`
- `server/src/models/IdempotencyKey.js`
- `client/src/context/AuthContext.jsx`
- `client/src/services/api.js`

Exit criteria:

- Login works with cookie auth.
- Write endpoints reject missing CSRF token.
- Sale API uses idempotency key.
- Audit logs cannot be modified by app routes.

### Phase 2: Real Payments

Duration: 1-2 weeks.

Tasks:

- Add payment provider abstraction.
- Implement Stripe Terminal first unless provider changes.
- Add terminal config settings.
- Add PaymentIntent/session create endpoint.
- Add terminal status endpoint/webhook handler if required.
- Add POS payment modal.
- Add approved/declined/cancelled states.
- Store provider reference in transaction payments.
- Add provider refund hook.
- Keep cash payment unchanged.

Files likely added:

- `server/src/services/payments/PaymentProvider.js`
- `server/src/services/payments/StripeTerminalProvider.js`
- `server/src/routes/paymentRoutes.js`
- `server/src/controllers/paymentController.js`
- `client/src/components/PaymentTerminalModal.jsx`

Exit criteria:

- Test reader can approve and decline card payments.
- Sale cannot complete with unapproved card payment.
- Payment reference appears on receipt/report.

### Phase 3: POS Completeness

Duration: 2 weeks.

Tasks:

- Refund mode UI.
- Held transaction resume drawer.
- Customer search/lookup modal.
- Loyalty points display.
- Loyalty redemption UI.
- Gift-card balance/code UI.
- Price check modal.
- Manager override modal replacing browser `prompt`.
- Receipt options screen: print, email, skip.
- Better void workflow with reason.

Files likely touched:

- `client/src/pages/POS.jsx`
- `client/src/components/pos/*`
- `server/src/controllers/transactionController.js`
- `server/src/controllers/adminController.js`
- `server/src/routes/transactionRoutes.js`

Exit criteria:

- Cashier can refund from POS without admin panel.
- Held transaction can be resumed after refresh.
- Customer lookup connects sale to loyalty.
- Gift card payment can be entered and validated.

### Phase 4: Shift and Till Reconciliation

Duration: 1 week.

Tasks:

- Shift summary endpoint.
- X-report UI.
- Z-report UI.
- Printable Z-report 80mm and A4/PDF.
- Variance threshold setting.
- Manager approval for variance.
- Shift history admin page.

Exit criteria:

- Closing shift produces stored Z-report.
- Cash variance is visible and auditable.
- Z-report can be printed.

### Phase 5: Inventory and Purchasing

Duration: 2-3 weeks.

Tasks:

- Stocktake model/controller/UI.
- Printable stock count sheet.
- Variance report.
- Approval/posting workflow.
- Purchase order creation UI.
- PO PDF/export.
- Delivery receiving workflow.
- Discrepancy handling.
- Bulk price update UI.
- Expiry/clearance suggestions.

Files likely added:

- `server/src/models/Stocktake.js`
- `server/src/controllers/stocktakeController.js`
- `server/src/controllers/purchaseOrderController.js`
- `client/src/pages/admin/Stocktake.jsx`
- `client/src/pages/admin/PurchaseOrders.jsx`

Exit criteria:

- Manager can complete stocktake from count to approved adjustments.
- Manager can create PO and receive delivery into stock.

### Phase 6: Tests, CI, Monitoring

Duration: 1-2 weeks, but tests should begin earlier.

Tasks:

- Add backend test runner.
- Add integration tests with memory MongoDB.
- Add frontend tests.
- Add Playwright E2E smoke flows.
- Add GitHub Actions.
- Add dependency audit.
- Add secret scanning.
- Add Sentry.
- Add structured logging.

Exit criteria:

- CI blocks broken build/tests.
- Critical money and transaction tests pass.
- Errors appear in Sentry.

### Phase 7: Compliance and Reporting Polish

Duration: 1-2 weeks.

Tasks:

- Challenge 25 report.
- VAT period finalisation and exports.
- GDPR customer data export.
- Promotion performance report.
- Gift-card liability report improvements.
- Customer purchase history.
- Email receipts with consent-safe behavior.

Exit criteria:

- Compliance reports are filterable and exportable.
- Customer export/anonymise flows are complete.
- Email receipts work through configured SMTP.

### Phase 8: Infrastructure Migration and Launch Rehearsal

Duration: 1 week.

Tasks:

- Deploy backend to Railway/Render/VPS.
- Configure production env vars.
- Configure MongoDB Atlas production cluster/backups.
- Configure object storage.
- Set DNS/CORS.
- Run smoke tests.
- Run hardware test.
- Run end-to-end day simulation:
  - Open shift.
  - Sales.
  - Refund.
  - Held transaction.
  - Stock adjustment.
  - Close shift.
  - Reports.

Exit criteria:

- Production rehearsal completed without critical failures.
- Rollback plan documented.
- Backup restore tested.

## 13. Priority Backlog

### P0: Go-Live Blockers

- Cookie auth and CSRF.
- Zod validation.
- Real or semi-integrated payment workflow.
- Idempotency keys.
- Legal-for-trade weighed-item workflow if selling loose goods by weight at checkout.
- Scanner test/setup and embedded barcode parser if using scale labels.
- Refund UI.
- Held transaction resume.
- Manager PIN modal and audit.
- Immutable audit hardening.
- IndexedDB offline queue.
- Core test suite.
- CI pipeline.
- Persistent backend deployment plan.

### P1: First Operational Release

- Customer lookup.
- Loyalty redemption.
- Gift-card UI.
- Product hotkeys and quick codes.
- Scale connection prototype for chosen weighing machine.
- Z-report screen and print.
- Shift reconciliation.
- Email receipts.
- Bulk price update.
- Stocktake.
- Purchase order receiving.
- Sentry/logging.

### P2: Month-One Maturity

- Challenge 25 compliance report.
- GDPR customer export.
- VAT export refinements.
- Promotion performance report.
- Product image upload UI.
- Expiry/clearance workflow.
- Hardware print bridge/cash drawer.
- Supplier performance notes.

### P3: Growth Features

- Click & Collect.
- Home delivery.
- Customer portal.
- Multi-language UI.
- Time-based promotions.
- Advanced accounting integrations.
- Multi-store support.

## 14. What I Would Implement First

If starting implementation now, I would do this sequence:

1. Add Zod validation and idempotency infrastructure.
2. Replace browser `prompt` manager PIN with a reusable manager authorization modal and backend audit record.
3. Add scanner setup, quick codes, product hotkeys, and embedded scale-label barcode parsing.
4. Build refund UI and held transaction resume UI.
5. Move auth to httpOnly cookies with CSRF.
6. Add Stripe Terminal abstraction and test reader flow.
7. Add weighed-item flow for the chosen scale strategy.
8. Add core tests around sale, VAT, promotions, Challenge 25, refund, stock, scanner parsing, weighed items, and auth.
9. Upgrade offline queue to IndexedDB.
10. Build Z-report/reconciliation.
11. Implement stocktake and PO receiving.
12. Migrate backend to persistent hosting.

Reason for this order:

- Zod/idempotency and manager authorization improve safety for almost every next workflow.
- Scanner, quick-code, and embedded-barcode parsing are low-risk speed improvements that fit the current POS input model.
- Refund and held resume are daily cashier needs.
- Cookie auth is important, but it touches frontend/backend auth and should be done once route validation is ready.
- Real payments should land before pilot testing, but it is easier after idempotency exists.
- Live scale integration depends on the exact hardware protocol, so the first step is supporting scale labels and then integrating the selected scale model.
- Tests should start early and expand as each workflow is added.

## 15. Launch Readiness Checklist

The system should not be used for live customer transactions until these are true:

- Real/semi-integrated card payment workflow is operational.
- Cash sales and card sales reconcile to shift report.
- Refund UI works and is tested.
- Held transaction resume works.
- Challenge 25 report is available.
- Cookie auth and CSRF are live.
- Zod validation covers all write endpoints.
- Idempotency prevents duplicate sales.
- Audit logs are append-only at app level.
- Offline queue uses IndexedDB with sync status.
- Core tests and CI are passing.
- Production backend is persistent.
- MongoDB production backup is enabled.
- Receipt printing is tested on actual printer.
- Staff have a short operating guide.
- Owner has a daily reconciliation guide.

## 16. Non-Goals Until After Launch

These should wait:

- Full ecommerce/customer portal.
- Delivery routing.
- Multi-language UI.
- Multi-store architecture.
- Payroll/time-clock compliance.
- Advanced SaaS billing.
- Heavy brand customization.
- Advanced BI dashboards.

They are useful future features, but they do not make the till safer on day one.

## 17. Summary

The combined model consensus is strong: harden before expanding. My implementation plan is to keep the current architecture and codebase direction, but strengthen it in layers:

- Security and validation.
- Payment correctness.
- POS operational completeness.
- Stock and purchasing workflows.
- Tests, monitoring, and persistent infrastructure.
- Compliance reports and polish.

This plan turns the current MVP into a practical, auditable, production-ready UK grocery POS without throwing away the work already done.
