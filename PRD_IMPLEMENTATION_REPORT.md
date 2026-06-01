# Grocery POS Application PRD and Implementation Report

Prepared on: 26 May 2026  
Application: Grocery POS MERN  
Repository: https://github.com/JahangirBaigMoghal/GroceryPOS  
Production deployment: https://grocerypos-nu.vercel.app  

## 1. Executive Summary

Grocery POS is a full-stack point of sale and store operations application for a small independent grocery store in the United Kingdom. It is built as a MERN monorepo with a React cashier/admin interface, an Express API, MongoDB persistence through Mongoose, JWT authentication, role-based access control, VAT-aware transaction storage, inventory movement logs, promotion pricing, receipt generation, reporting, and Vercel deployment support.

The product currently covers the main end-to-end retail loop:

- Staff sign in with username/password or PIN.
- Cashier opens a till shift with an opening float.
- Cashier scans, searches, or taps compact product buttons.
- Basket totals are calculated in integer pence, with VAT breakdowns and offer pricing.
- Challenge 25 prompts are enforced for age-restricted items.
- Payments are captured through simulated cash/card/contactless flows, with backend support for gift-card and account-style payment records.
- Completed sales create persistent transaction records, stock movements, VAT records, promotion usage, loyalty accrual, and audit entries.
- Admin users manage products, stock, staff, customers, suppliers, promotions, gift cards, settings, reports, audit logs, and backup exports.
- Production deploys from GitHub to Vercel with the React build and Express API served through a serverless function.

This report describes what is implemented in the codebase today. It is an implementation report and product requirements document, not legal, tax, employment, or payments compliance advice.

## 2. Product Vision

The application is designed for independent UK grocery shops that need a fast and practical till experience without the complexity and cost of enterprise EPOS platforms.

Primary goals:

- Fast cashier operation at a physical checkout.
- Accurate VAT-inclusive grocery pricing.
- Simple stock control and low-stock visibility.
- Promotion handling for common UK grocery offers.
- Role-based operational control for owner, manager, and cashier.
- Useful reporting for daily sales, VAT records, stock, margins, gift-card liability, and audit review.
- Deployment that works locally for development and on Vercel for production.

Design principles:

- Touch and mouse friendly.
- Compact product grid for till speed.
- Product buttons are small but readable.
- Basket and payment panel remain visually dominant.
- Money is calculated internally in pence.
- Sensitive operations are auditable.
- Compliance-related workflows should be explicit rather than hidden.

## 3. Target Users and Roles

### Admin

Typical user: store owner or senior operator.

Capabilities implemented:

- Full admin route access.
- Product, supplier, customer, promotion, gift card, setting, and user management.
- Product CSV export/import endpoints.
- Stock adjustment.
- Reports and audit visibility.
- JSON backup export.
- Can grant admin role.

### Manager

Typical user: shop manager or shift supervisor.

Capabilities implemented:

- POS access.
- Admin panel access for operational areas.
- Inventory and reporting access.
- Manager PIN verification endpoint for protected POS actions.
- Cannot grant admin role unless already admin.

### Cashier

Typical user: till operator.

Capabilities implemented:

- POS access.
- Login via password or PIN.
- Open/close own shift.
- Scan/search/tap products.
- Apply small line discounts.
- Complete sales.
- Use hold transaction.
- Cannot access `/admin` because frontend route and backend role middleware restrict it.

## 4. Technology Stack

### Monorepo

Root scripts:

- `npm start`: runs server and client together with `concurrently`.
- `npm run dev`: alias of `npm start`.
- `npm run install:all`: installs root, server, and client dependencies.
- `npm run seed`: seeds the backend database.
- `npm run build`: builds the React client.
- `npm run vercel-build`: installs server/client dependencies and builds the client for Vercel.

### Backend

Runtime and framework:

- Node.js, minimum version 20.
- Express.js.
- MongoDB through Mongoose ODM.

Backend libraries:

- `jsonwebtoken` for JWT auth.
- `bcrypt` for password and PIN hashing.
- `helmet` for HTTP security headers.
- `cors` with configured allowed origin.
- `express-rate-limit` for login throttling.
- `multer` for product image upload and CSV upload handling.
- `pdfkit` for narrow receipt PDF generation.
- `node-cron` for scheduled low-stock and scheduled-price jobs.
- `nodemailer` dependency is present for email capability, but transactional email sending is not yet wired into receipt or alert controllers.
- `csv-parse` and `csv-stringify` for product import/export and report CSV export.
- `mongodb-memory-server` for immediate local demo mode.
- `zod` dependency is present but not currently used for route validation.

### Frontend

Framework and libraries:

- React 18.
- Vite.
- React Router v6.
- Context API for authentication state.
- Axios for API calls.
- Tailwind CSS for styling.
- React Hot Toast for notifications.
- Recharts for dashboard/report charts.
- Lucide React for icons.
- TanStack Table dependency is installed, but current admin tables use a local lightweight `DataTable` component.
- React-to-Print dependency is installed, while current receipt printing uses browser `window.print()` and print CSS.

### Database

Implemented database modes:

- MongoDB Atlas or local MongoDB via `MONGO_URI`.
- In-memory demo MongoDB when `USE_MEMORY_DB=true`.
- If no `MONGO_URI` is configured, server defaults to `mongodb://127.0.0.1:27017/grocery_pos`.

Production expectation:

- Use persistent MongoDB Atlas or another persistent MongoDB instance.
- Do not use memory DB in Vercel production because serverless functions are ephemeral.

## 5. High-Level Architecture

### Frontend Routing

Routes implemented:

- `/login`: staff login page.
- `/`: protected POS route.
- `/admin/*`: protected admin route for admin/manager roles.

Route protection:

- Frontend checks current user from auth context.
- Unauthenticated users are redirected to `/login`.
- Admin route requires `isAdmin`, defined as role `admin` or `manager`.

### Backend API Structure

API route groups:

- `/api/health`: health check.
- `/api/auth`: login, current user, PIN verification, shift open/current/close.
- `/api/products`: product list, metadata, product CRUD, CSV import/export, stock adjustment.
- `/api/transactions`: sale quote, complete sale, hold, held list, lookup, receipt PDF, refund, void.
- `/api/admin`: admin CRUD resources, users, customer anonymisation, backup.
- `/api/reports`: dashboard, sales, VAT, inventory, financial, audit.

### Deployment Architecture

Vercel deployment is configured through `vercel.json`:

- React app builds into `client/dist`.
- `/api/*` rewrites to `api/index.js`, which hosts Express as a serverless function.
- `/uploads/*` rewrites to the API.
- All non-API routes rewrite to `/index.html` for React Router.
- Function max duration is 30 seconds.

Required Vercel environment variables:

- `MONGO_URI`
- `USE_MEMORY_DB=false`
- `JWT_SECRET`
- `CLIENT_URL`

## 6. Data Model Summary

### User

Purpose:

- Employee accounts and role-based access.

Fields implemented:

- Full name, username, email, phone.
- Password hash.
- PIN hash.
- Role: `admin`, `manager`, `cashier`.
- Active flag.
- Employment start date.
- Hourly rate in pence.
- Failed login attempts.
- Locked-until timestamp.
- Last login timestamp.

Security:

- Passwords and PINs are hashed with bcrypt.
- User list excludes password and PIN hashes.
- Auth middleware excludes password and PIN hash from `req.user`.

### Product

Purpose:

- Sellable grocery catalogue item.

Fields implemented:

- Name, description, SKU, barcode, PLU.
- Category and subcategory.
- Selling price in pence.
- Cost price in pence.
- RRP in pence.
- VAT rate: 0, 5, or 20.
- Unit of measure: each, kg, litre, pack.
- Weight/volume fields for unit price labels.
- Reorder level and reorder quantity.
- Stock quantity.
- Supplier.
- Image URL.
- Age restriction flag and restricted age.
- Favourite flag.
- Active flag.
- Expiry date.
- Scheduled price changes.
- Price history.

Indexes:

- Text index over name, SKU, barcode.
- Barcode and PLU indexes.

### Category

Fields implemented:

- Name.
- Parent category.
- Colour.
- Icon name.
- Order.
- Active flag.

### Transaction

Purpose:

- Permanent sale, refund, void, or held transaction record.

Fields implemented:

- Reference and receipt number.
- Type: sale, refund, void.
- Cashier, shift, customer.
- Lines with product data snapshot.
- Net subtotal, VAT total, total pence.
- Discount pence.
- Promotion applications.
- VAT breakdown.
- Payments.
- Change due.
- Status: completed, held, voided, refunded, offline_pending.
- Hold name.
- Challenge 25 events.
- Original transaction reference for refunds.
- Refund reason.
- Void reason.
- Manager authorisation.
- Receipt email timestamp field.

Important design:

- Transaction lines snapshot product name, SKU, barcode, unit price, VAT, unit price label, and totals. This preserves sales history even if product data changes later.

### Promotion

Types implemented in schema and pricing engine:

- `simple_discount`
- `multibuy_price`
- `tiered_price`
- `buy_x_get_y`
- `bogof`
- `bogohp`
- `combo_bundle`
- `meal_deal`
- `mix_match`
- `cheapest_free`
- `cheapest_half_price`
- `min_spend`
- `coupon`
- `member_price`
- `clearance`

Fields implemented:

- Name, type, active flag.
- Products, categories, excluded products.
- Discount percent or fixed pence.
- Buy/get quantities.
- Bundle price in pence.
- Tier list.
- Bundle groups.
- Maximum applications.
- Minimum spend pence.
- Coupon code.
- Member-only flag.
- Receipt label and POS badge.
- Start/end dates.
- Priority.
- Stackable flag.
- Usage count and total discount given.

### Stock Movement

Purpose:

- Permanent stock change history.

Types implemented:

- sale
- refund
- adjustment
- delivery
- wastage
- stocktake

Fields implemented:

- Product.
- Quantity.
- Type.
- Reason.
- Before and after quantity.
- Cost impact in pence.
- Created by.
- Transaction link.

### Shift

Fields implemented:

- Cashier.
- Till ID.
- Opened/closed timestamps.
- Opening float in pence.
- Closing float in pence.
- Expected cash in pence.
- Cash variance.
- Status open/closed.
- Z-report mixed payload.
- X-report snapshot array.

### Customer

Fields implemented:

- Name, email, phone, address, date of birth.
- Loyalty card number.
- Account credit balance in pence.
- Loyalty points.
- GDPR consent object with granted/date/method/marketing consent.
- Anonymised timestamp.
- Credit history.
- Points history.

### Gift Card

Fields implemented:

- Code.
- Initial balance in pence.
- Current balance in pence.
- Issued-to customer.
- Status: active, deactivated, redeemed.
- Last used timestamp.
- History.

### Supplier

Fields implemented:

- Name, contact name, phone, email, address.
- Payment terms.
- VAT number.
- Lead time days.
- Notes.
- Active flag.

### Purchase Order

Fields implemented:

- Reference.
- Supplier.
- Status: draft, sent, partially_received, fully_received, cancelled.
- Lines with product, product name, ordered/received quantity, cost price.
- Notes.
- Created by.

### Setting

Purpose:

- JSON-like application settings by key.

Seeded keys:

- `store`
- `pos`
- `loyalty`
- `vat`

### Audit Log

Fields implemented:

- Actor and actor name.
- Action.
- Entity type and ID.
- Before, after, metadata.
- IP address.
- Timestamps.

Audit entries are created for sensitive operations such as product changes, stock adjustments, sale completion, refunds, voids, holds, user changes, resource changes, customer anonymisation, and scheduled low-stock alerts.

## 7. POS Feature Requirements and Implementation State

### 7.1 Login and Session

Implemented:

- Login by username/password.
- Login by username/PIN.
- JWT token returned on login.
- Token stored in localStorage.
- Current user restored on refresh through `/auth/me`.
- Logout clears token and user.
- Invalid or expired token clears local auth state.

Guardrails:

- Login endpoint rate limited to 5 attempts per 15 minutes.
- User model tracks failed login attempts and account lockout after repeated failures.
- Inactive users cannot log in.

### 7.2 Shift and Till Management

Implemented:

- Open shift with opening float.
- Current open shift fetched on POS load.
- Close shift stores closing float and Z-report payload.
- Expected cash is incremented from cash sales.
- Cash variance is calculated on shift close.
- POS can lock screen and unlock locally.

Current limitation:

- Lock screen unlock currently only requires pressing unlock, not re-entering PIN.
- Z-report payload is basic and stored, but not yet rendered as a full receipt-style report screen.

### 7.3 Product Entry

Implemented:

- Barcode/SKU/PLU input.
- Barcode input auto-focuses after unlock and basket changes.
- Search by product name, SKU, barcode, or PLU.
- Category filter row.
- Compact product grid with small product buttons.
- Product buttons show name, unit price label/SKU, price, offer badge, and Challenge 25 badge.
- Product grid supports product favourites concept by using the all-products default filter labelled Favourites.

Current limitation:

- Favourites label currently represents the unfiltered/all-products state rather than filtering strictly to `favourite=true`.
- Autocomplete dropdown is not separately implemented; search filters the product grid directly.

### 7.4 Basket Panel

Implemented:

- Basket line display with product name, quantity, unit price, VAT rate, promotion name, saving, and line total.
- Quantity decrease/increase buttons.
- Direct quantity input.
- Remove line item button.
- Line-level discount button.
- Basket total, subtotal ex VAT, VAT breakdown, promotion applications, total savings.
- Void button clears current local basket.
- Hold transaction button persists held transaction via API.

Guardrails:

- Quantity cannot go below 0.001.
- Large line discount over 500 pence requires manager PIN verification endpoint.
- Backend also validates stock and Challenge 25 on completed sale.

Current limitations:

- Remove line item does not show a confirmation prompt.
- Void current basket clears local basket and does not currently create a void audit record unless voiding an existing transaction through API.
- Transaction-level manual discount exists in backend payload handling but is not exposed as a full POS UI control.
- Held transactions can be created and listed by API, but resume UI is not yet built.

### 7.5 Challenge 25

Implemented:

- Product model supports `ageRestricted` and `restrictedAge`.
- POS detects age-restricted product before adding to basket.
- Mandatory modal offers exactly:
  - ID Checked - Customer is 25 or Over
  - ID Checked - Valid ID Produced
  - Sale Refused - Customer Appears Under 25
- Refused item is not added.
- Challenge 25 events are included in transaction payload.
- Backend requires a Challenge 25 event for completed sales involving age-restricted products.
- Backend rejects refused age-restricted items.
- Challenge 25 event is stored in transaction.

Guardrail:

- Client-side prompt improves cashier workflow.
- Server-side validation prevents bypass by direct API call.

Current limitation:

- Dedicated Challenge 25 admin report is not a separate page, but events are stored on transactions and visible through transaction/audit data paths.

### 7.6 Payment Processing

Implemented:

- Cash, card, contactless, gift card, account payment method selection.
- Split payment rows.
- Common cash buttons: 5, 10, 20, 50.
- Exact cash button.
- Backend enforces paid amount must cover total.
- Backend calculates change due.
- Card/contactless are marked simulated in POS payload.
- Gift card balance validation and deduction by code/reference in backend.
- Transaction stores payment method, amount, tendered amount, change, reference, and status.

Current limitations:

- Card/contactless mock flow is not a multi-step animated gateway state. It is currently simulated through payment status.
- Gift-card UI does not yet expose a clearly labelled gift-card code field; backend expects `payments.reference`.
- Store credit/account payment is represented in schema/payment methods, but customer identification and account debit UI are not fully implemented.

### 7.7 Receipts

Implemented:

- Browser print area for 80mm receipt via print CSS.
- Receipt PDF endpoint: `/api/transactions/:id/receipt.pdf`.
- PDF receipt includes store name, address, VAT number, receipt number, date, cashier, line items, unit price labels, VAT rates, subtotal ex VAT, VAT breakdown, total, footer.
- Last receipt is stored in POS state after sale for reprint.

Current limitations:

- Email receipt is not wired to Nodemailer yet.
- Receipt print area in frontend is basic compared with the PDF receipt.

### 7.8 Refunds and Voids

Implemented:

- Transaction lookup by reference or receipt number.
- Refund endpoint supports partial line selection by original line ID and quantity.
- Refund transaction references original transaction.
- Refund amount is negative.
- Original line refunded quantity is updated.
- Stock is restored on refund.
- Refund audit entry is created.
- Void endpoint marks an existing transaction voided, stores reason, requires manager/admin role, and creates audit entry.

Current limitations:

- Refund UI is not yet built into the POS page.
- Manager threshold for cash refunds is not currently enforced in refund controller.
- Refund payment method match/override is partially supported through method selection, but no explicit manager override workflow is implemented.

### 7.9 Promotions at POS

Implemented:

- Basket quote endpoint recalculates promotions after basket/coupon changes.
- POS displays promotion badges on product tiles.
- POS displays promotion names and savings on basket lines.
- POS displays total promotion savings.
- Backend records promotion application usage and total discount.

Offer types implemented:

- Buy one get one free.
- Buy one get one half price.
- Buy X get Y free.
- Tiered quantity pricing such as 1 item for one price, 2 for a lower bundle price, 3 for another bundle price.
- Multi-buy fixed group price.
- Mix-and-match fixed price.
- Combo bundles across products/categories.
- Meal deals.
- Cheapest item free.
- Cheapest item half price.
- Minimum spend discount.
- Coupon/voucher.
- Member-only pricing.
- Clearance/reduced-to-clear.

Promotion conflict behavior:

- Promotions are sorted by priority.
- Non-stackable promotions only apply when no existing discount is present on a line, except if the same promotion is already associated.
- Stackable promotions can apply on top.

### 7.10 Customer and Loyalty

Implemented:

- Customer model with loyalty card number, points, account credit, GDPR consent.
- Loyalty points accrue on completed sales with a customer linked.
- Points earned default to 1 point per GBP 1 spent.
- Loyalty setting can disable accrual.
- Customer points history is updated.

Current limitations:

- POS customer search/scan UI is not yet fully implemented.
- Points redemption UI and account credit debit UI are not yet fully implemented.

### 7.11 Offline Mode

Implemented:

- Browser online/offline detection.
- Offline status indicator in POS header.
- Recent product data cached in localStorage.
- Offline sale payloads queued in localStorage.
- Queue syncs automatically when browser returns online.

Guardrails:

- If API load fails, POS falls back to cached product data and shows toast warning.
- Offline queued transactions preserve payload and queued timestamp.

Current limitations:

- Offline mode is localStorage-based, not IndexedDB.
- Offline transaction conflicts, stock drift, and duplicate-submission protection need hardening before real-world production use.

### 7.12 Keyboard Shortcuts

Implemented:

- F1 focuses barcode input.
- F2 focuses product search.
- F4 holds transaction.
- F8 scrolls to payment panel.
- F12 prints receipt.

## 8. Admin Panel Requirements and Implementation State

### 8.1 Dashboard

Implemented:

- Today revenue.
- Transactions count.
- Items sold.
- Low stock count.
- Gift-card liability.
- Hourly revenue chart.
- Payment split chart.
- Top products today table.

### 8.2 Product Management

Implemented:

- Add/edit product form.
- Product table.
- Product fields: name, SKU, barcode, PLU, category, selling price, cost price, VAT rate, stock, reorder level, age restricted.
- Backend supports wider product schema including description, subcategory, RRP, unit measure, weight/volume, supplier, image, active flag, scheduled prices, price history, expiry date.
- Product image upload endpoint through Multer.
- Product duplication endpoint.
- Product soft delete/deactivation.
- Product CSV import endpoint.
- Product CSV export endpoint.
- Product audit trail through audit logs.
- Unit price label calculation.

Current limitations:

- Admin UI exposes the most important product fields, not every schema field.
- Image upload, scheduled price change, RRP, expiry, supplier link, and weight/volume are supported in schema/API but not fully polished in admin UI.
- CSV import has endpoint support but UI currently labels it as endpoint-ready rather than providing full mapping UI.

### 8.3 Category Management

Implemented:

- Category model with name, parent, colour, icon, order, active.
- Admin generic CRUD endpoint for categories.
- Category list is used in POS filtering.

Current limitation:

- Drag-and-drop reordering is not implemented.

### 8.4 Pricing and VAT

Implemented:

- Product VAT rates constrained to 0, 5, 20.
- VAT calculated from VAT-inclusive shelf price.
- VAT breakdown stored per transaction.
- Price history entry when product price changes.
- Scheduled price changes processed every 10 minutes by cron.
- RRP field exists in product schema.

Current limitations:

- Bulk price update UI is not implemented.
- VAT settings are stored, but manager/admin restrictions around editing VAT settings are basic role-based rather than fine-grained.

### 8.5 Inventory and Stock

Implemented:

- Current stock table.
- Manual stock adjustment via admin UI.
- Mandatory-ish reason prompt in UI, with backend default if missing.
- Stock movement log model.
- Sale decrement and refund restore stock automatically.
- Low stock report.
- Out-of-stock report.
- Stock valuation at cost and selling price.
- Cron low-stock alert writes audit entry and logs to console.
- Expiry date field exists on products.

Current limitations:

- Stocktake workflow, blank count sheet PDF, variance approval UI, and delivery receiving UI are not fully implemented.
- Email low-stock alert is not wired to SMTP yet.
- Expiry report exists only partially through schema support, not a dedicated report endpoint.

### 8.6 Suppliers and Purchase Orders

Implemented:

- Supplier CRUD through admin.
- Supplier model includes contact, payment terms, VAT number, lead time, notes.
- Product model links to supplier.
- Purchase order model and generic admin CRUD endpoint exist.

Current limitations:

- Purchase order creation UI, PDF PO generation, delivery matching, and discrepancy workflow are not fully implemented.

### 8.7 Employees

Implemented:

- User create/list/update endpoints.
- Admin UI can create employee accounts with role, PIN, password, and basic details.
- Roles: admin, manager, cashier.
- Password/PIN hashing.
- Active flag in schema.
- Login attempts and lockout fields.
- Audit entries for user creation/update.

Current limitation:

- Admin UI does not yet provide a rich deactivate/edit screen for all employee fields.

### 8.8 Customers

Implemented:

- Customer model with contact details, loyalty, account credit, GDPR consent, credit/points history.
- Admin UI can create/list customers.
- Customer anonymisation endpoint supports right-to-erasure style workflow while retaining transaction records.

Current limitation:

- Customer export and detailed purchase history screens are not fully implemented.

### 8.9 Promotions

Implemented:

- Promotion admin UI for creating common offer types.
- Product/category multi-select assignment.
- Tier text parser for tiered offers.
- Fields for bundle price, discount percent, discount amount, minimum spend, coupon code, POS badge, receipt label, priority, stackable.
- Active/scheduled offer table.
- Backend promotion usage tracking.

### 8.10 Gift Cards

Implemented:

- Gift card model.
- Admin UI can create/list gift cards.
- Backend sale flow validates and deducts gift card balances when reference/code is supplied.
- Gift-card liability report/dashboard metric.

Current limitation:

- Gift card print/email issuance workflow is not implemented.

### 8.11 Settings and Backup

Implemented:

- Generic settings model.
- Admin UI can update JSON settings by key.
- Seeded settings for store, POS, loyalty, VAT.
- Admin-only backup endpoint exports core operational collections as JSON.

Current limitation:

- Restore/import backup endpoint is not implemented.
- Settings UI accepts raw JSON and does not yet provide structured forms.

### 8.12 Audit

Implemented:

- Audit log model.
- Audit report endpoint.
- Admin audit tab.
- Logs include actor, action, entity, metadata, timestamps, and IP where available.

Current limitation:

- Audit log is append-only by convention and no delete route is exposed, but database-level immutability is not enforced.

## 9. Reporting and Analytics

### Dashboard Report

Endpoint:

- `GET /api/reports/dashboard`

Implemented metrics:

- Revenue today.
- Transaction count.
- Items sold.
- Low stock count.
- Gift-card liability.
- Hourly revenue.
- Payment split.
- Top 5 products.

### Sales Report

Endpoint:

- `GET /api/reports/sales`

Implemented:

- Date range filtering with `from` and `to`.
- Total transactions.
- Total revenue.
- Total VAT.
- Average transaction value.
- Items sold.
- Refund count.
- Net revenue.
- Hourly sales.
- Sales by product.
- Payment method split.
- Cashier grouping.
- CSV export with `?format=csv`.

### VAT Report

Endpoint:

- `GET /api/reports/vat`

Implemented:

- Date range filtering.
- VAT due on sales equivalent to VAT return Box 1.
- Total sales ex VAT equivalent to VAT return Box 6.
- Breakdown by VAT rate.
- Per-transaction VAT audit trail.
- CSV export with `?format=csv`.

### Inventory Report

Endpoint:

- `GET /api/reports/inventory`

Implemented:

- Current stock.
- Low stock.
- Out of stock.
- Stock movements.
- Stock valuation at cost.
- Stock valuation at selling price.
- CSV export with `?format=csv`.

### Financial Report

Endpoint:

- `GET /api/reports/financial`

Implemented:

- Product margin report.
- Shift list with cashier.
- Gift-card liability.

Current limitation:

- Full COGS by period and full till reconciliation display need further development.

### Audit Report

Endpoint:

- `GET /api/reports/audit`

Implemented:

- Date range filtering.
- Latest 500 audit logs.
- Actor population.

## 10. UK Compliance-Oriented Features

### VAT

Implemented:

- Product VAT rates are constrained to UK-relevant rates used by the app: 0, 5, 20.
- Prices are treated as VAT-inclusive shelf prices.
- VAT is extracted from gross price using integer pence arithmetic.
- Transaction stores net, VAT, gross, and VAT breakdown.
- Receipts and PDFs show VAT registration number and VAT breakdown.
- VAT report exposes Box 1 and Box 6 style values.
- VAT CSV export is available.

Important limitation:

- The app supports VAT record keeping, but it is not certified MTD bridging software. Export is designed to support manual import/reconciliation with accounting software.

### Challenge 25

Implemented:

- Age-restricted product flag.
- Mandatory POS modal before adding age-restricted items.
- Refusal path removes item.
- Backend requires challenge event before completing sale.
- Events are stored on transaction.

### Price Marking and Unit Pricing

Implemented:

- Products support weight/volume fields.
- Unit price label calculation:
  - Price per kg.
  - Price per litre.
  - Price per 100g.
  - Price per 100ml.
- Unit price label displayed on POS product buttons.
- Unit price label stored on transaction line and printed on PDF receipt.

Current limitation:

- Admin warning for missing unit pricing information is not yet implemented.

### GDPR

Implemented:

- Customer consent fields.
- Marketing consent flag.
- Customer anonymisation endpoint.
- Transaction records are retained while customer personal data can be removed.
- No third-party customer data transmission implemented.

Current limitations:

- Customer data export endpoint is not yet implemented.
- Consent capture is available in schema/admin creation, but POS customer onboarding UI is not fully implemented.

### Audit Trail

Implemented:

- Sensitive operations create audit logs.
- Audit logs can be viewed in admin.
- No admin delete route is exposed for audit logs.

Current limitation:

- Database-level write-once immutability is not enforced.

## 11. Security Features and Guardrails

### Authentication

Implemented:

- JWT tokens.
- Auth middleware on protected API routes.
- Password and PIN hashing with bcrypt.
- Configurable bcrypt rounds, default 12.
- Token expiration, default 12 hours.
- `/auth/me` validates active user sessions.

### Authorization

Implemented:

- `requireAuth` middleware.
- `requireRole` middleware.
- `requireManagerOrAdmin` middleware.
- Admin routes require manager/admin.
- Product mutation and stock adjustment require manager/admin.
- Reports require manager/admin.
- Transaction void requires manager/admin.
- Frontend route protection mirrors backend rules.

### Login Protection

Implemented:

- Express rate limiter on login: max 5 requests per 15 minutes.
- Failed login attempts stored on user.
- Lockout after 5 failures for 15 minutes.

### API Hardening

Implemented:

- Helmet security headers.
- CORS restricted to configured `CLIENT_URL`.
- JSON body size limit of 10 MB.
- Sanitizer strips request body keys beginning with `$` or containing `.` to reduce NoSQL injection risk.
- Central not-found and error-handler middleware.

### Money Safety

Implemented:

- Internal money values are stored in pence.
- VAT calculation uses integer rounding.
- Product price, cost price, VAT totals, discounts, payments, refunds, stock valuation, and gift-card balances use pence.

### Operational Guardrails

Implemented:

- Backend rejects completed sales if product is inactive/unavailable.
- Backend rejects completed sale for out-of-stock products.
- Backend rejects completed sale if payment total is less than transaction total.
- Backend validates gift-card balance before deduction.
- Backend requires Challenge 25 event for age-restricted products.
- Backend blocks refused age-restricted sales.
- Stock movements are recorded for sale, refund, and manual adjustment.
- Promotion discounts are capped so they do not exceed line value.
- Gift card usage history records deductions.

### Known Security Improvements Recommended

Recommended before processing live sensitive data:

- Store JWT in httpOnly secure cookies rather than localStorage.
- Add CSRF protection if moving to cookie auth.
- Add stronger schema validation with Zod on all write endpoints.
- Add audit log immutability controls or database rules.
- Add per-resource field-level permissions, especially VAT settings and admin role changes.
- Add brute-force tracking by username and IP with stronger lockout policy.
- Add production-grade logs and monitoring.
- Add dependency vulnerability scanning in CI.
- Add secrets scanning in CI.

## 12. Seed Data Implemented

Seeded users:

- Admin: `admin`, password `Admin1234!`, PIN `1234`.
- Manager: `manager`, password `Manager1234!`, PIN `2222`.
- Cashier 1: `cashier1`, password `Cashier1234!`, PIN `3333`.
- Cashier 2: `cashier2`, PIN `4444`.

Seeded categories:

- Bakery.
- Dairy & Eggs.
- Fruit & Vegetables.
- Meat & Fish.
- Frozen.
- Drinks.
- Snacks & Confectionery.
- Groceries & Cooking.
- Household.
- Toiletries & Health.
- Tobacco & Vaping.
- Alcohol.
- Baby & Kids.

Seeded sample data:

- 30+ grocery products with UK-style prices, VAT rates, barcodes, PLUs, unit pricing, stock, and suppliers.
- Two suppliers.
- Two customers.
- One gift card.
- Store, POS, loyalty, and VAT settings.

Seeded promotions:

- Fruit Bowl 3 for 2.
- 10 percent off Household.
- Crisps BOGOF.
- Ghee Tin Tier Deal.
- Rice and Ghee Combo.
- Any 2 Soft Drinks for GBP 3.
- Lunch Meal Deal GBP 3.99.
- Bakery Reduced to Clear 20 percent.
- LOCAL5 GBP 5 off GBP 30.

## 13. Current UI and UX Implementation

### POS UI

Implemented design:

- Compact modern till interface.
- Navy/teal/gold/lime/rose palette.
- Slim icon action rail on desktop.
- Responsive top header.
- Online/offline indicator.
- Scanner-ready badge.
- Dense product tiles.
- Horizontally scrollable category row.
- Fixed basket/payment panel on desktop.
- Stacked responsive layout on tablet/mobile.
- 80mm print stylesheet.
- Mobile viewport meta tag implemented.

Verified:

- Client production build passes.
- Desktop, tablet, and mobile screenshot checks were performed during implementation.

### Admin UI

Implemented design:

- Simple admin console with left tab navigation.
- Dashboard cards and charts.
- CRUD-style panels for resources.
- Tables for products, inventory, reports, audit, and generic resources.

Current limitation:

- Admin UI is functional but not yet redesigned to the same visual polish as the latest POS screen.

## 14. Deployment and Operations

### Local Development

Install:

```bash
npm run install:all
```

Run:

```bash
npm start
```

Local URLs:

- Client: `http://localhost:5173`
- API: `http://localhost:5000`

### Production

Production deployment currently targets Vercel:

- Build command: `npm run vercel-build`
- Output directory: `client/dist`
- Express API served by `api/index.js`

Production environment variables required:

- `MONGO_URI`
- `USE_MEMORY_DB=false`
- `JWT_SECRET`
- `CLIENT_URL`

### GitHub/Vercel Flow

Implemented workflow:

- Code is pushed to GitHub `main`.
- Vercel project is connected to GitHub.
- Commits to `main` trigger Vercel deployment.

Recent production-impacting commits:

- `973b4fe Add basket-level grocery promotions`
- `0b08bcb Refresh responsive POS interface`

## 15. Implemented Guardrails by Domain

### Cashier Guardrails

- Must be authenticated.
- Must open shift before payment completion.
- Out-of-stock products show warning and backend blocks completed sale.
- Challenge 25 modal blocks direct age-restricted add.
- Refused Challenge 25 outcome does not add item.
- Large line discount requires manager PIN check.
- Payment cannot complete if paid amount is below total.
- Offline status is visible.

### Manager/Admin Guardrails

- Product mutation requires manager/admin.
- Stock mutation requires manager/admin.
- Reports require manager/admin.
- Admin route protected in frontend and backend.
- Admin-only backup endpoint.
- Only admin can grant admin role.

### Data Guardrails

- Monetary values stored as integer pence.
- Product price changes are pushed into price history.
- Stock changes create stock movements.
- Transactions snapshot product data.
- Refunds link to original transaction.
- Gift card balances are checked before deduction.
- Audit logs capture sensitive operations.

## 16. Current Gaps and Honest Implementation Boundaries

The application is functional and broad, but some original enterprise-grade requirements are represented as schema/API foundations rather than fully polished UI workflows. The major gaps are:

- Real payment terminal integration is not implemented. Card/contactless are simulated.
- Email receipt sending is not implemented despite SMTP config and Nodemailer dependency.
- Product image UI is not complete.
- Full refund mode UI is not built.
- Held transaction resume UI is not built.
- Dedicated Challenge 25 compliance report is not built.
- Full stocktake workflow is not built.
- Purchase order PDF generation and delivery matching are not built.
- Backup export exists, restore import does not.
- Customer data export endpoint is not built.
- Points redemption UI is not built.
- Account credit payment debit UI is not complete.
- Admin panel is functional but less polished than POS.
- Test suite and CI pipeline are not implemented.
- MTD output is helpful, but not certified MTD software.
- Offline sync is basic localStorage queueing and needs production hardening.
- Audit log is append-only by route design, not by database-level enforcement.

## 17. Recommended Roadmap

### Phase 1: Production Hardening

- Add comprehensive backend validation with Zod.
- Add integration tests for sale, refund, promotions, VAT, stock, and auth.
- Add frontend tests for POS workflows.
- Add CI for build, lint, tests, dependency audit.
- Move auth tokens from localStorage to secure httpOnly cookies.
- Add structured logging and error monitoring.
- Add production email alerts for low stock.

### Phase 2: Complete Store Workflows

- Build refund mode UI.
- Build held transaction resume UI.
- Build product image upload UI.
- Build structured settings screens.
- Build purchase order create/receive workflow.
- Build stocktake workflow with variance report.
- Build customer lookup and loyalty redemption at POS.
- Build account credit debit/payment at POS.

### Phase 3: Compliance and Reporting Depth

- Dedicated Challenge 25 report.
- Dedicated VAT audit export formats for Xero/QuickBooks/Sage/FreeAgent.
- Customer data export.
- Receipt email workflow with consent handling.
- Audit immutability strategy.
- Long-term record retention policy automation.

### Phase 4: Hardware and Payments

- Stripe Terminal, Worldpay, or Square Reader integration.
- Receipt printer calibration UI.
- Cash drawer integration notes or middleware.
- Barcode scanner configuration guide.

## 18. Acceptance Criteria Covered Today

The following can be demonstrated today:

- Staff login with seeded admin/manager/cashier accounts.
- Open shift with float.
- Scan/search/tap products.
- Add normal and age-restricted items.
- Challenge 25 enforcement and transaction storage.
- Basket quantity adjustment and line discounts.
- Automatic promotion quote and savings display.
- Cash/card/contactless simulated payment completion.
- Gift card balance deduction via API payment reference.
- Stock decrement on sale.
- Stock restore on refund via API.
- VAT breakdown on transaction and receipt PDF.
- Product CRUD and stock adjustment.
- Promotion creation and pricing.
- Dashboard and reports.
- Audit log visibility.
- JSON backup export.
- Vercel production deployment.

## 19. File and Module Map

Important frontend files:

- `client/src/pages/POS.jsx`: cashier POS interface.
- `client/src/pages/Admin.jsx`: admin console.
- `client/src/pages/Login.jsx`: staff login.
- `client/src/context/AuthContext.jsx`: auth state.
- `client/src/hooks/useOfflineQueue.js`: offline sale queue.
- `client/src/services/api.js`: Axios client and JWT interceptor.
- `client/src/utils/format.js`: GBP and VAT formatting helpers.
- `client/tailwind.config.js`: Tailwind theme and POS palette.
- `client/src/index.css`: global CSS and receipt print CSS.

Important backend files:

- `server/src/app.js`: Express app, middleware, route mounting.
- `server/src/index.js`: DB connect, seeding, jobs, server start.
- `server/src/config/env.js`: environment config.
- `server/src/config/db.js`: MongoDB and memory DB connection.
- `server/src/middleware/auth.js`: JWT and role middleware.
- `server/src/middleware/security.js`: login rate limit and body sanitizer.
- `server/src/controllers/authController.js`: login, PIN, shifts.
- `server/src/controllers/productController.js`: products, stock, import/export.
- `server/src/controllers/transactionController.js`: sale, quote, refund, void, receipt PDF.
- `server/src/controllers/adminController.js`: generic admin CRUD, users, backup, anonymisation.
- `server/src/controllers/reportController.js`: dashboard, sales, VAT, inventory, financial, audit.
- `server/src/utils/money.js`: pence, GBP, VAT, unit price helpers.
- `server/src/utils/promotionEngine.js`: promotion pricing.
- `server/src/jobs/scheduledJobs.js`: cron jobs.
- `server/src/seed.js`: seeded demo data.
- `api/index.js`: Vercel API entrypoint.

## 20. Final Product State

The application is a working MERN POS platform with a strong foundation for UK grocery retail. The strongest implemented areas are:

- POS sales flow.
- VAT-aware pence-based transaction math.
- Promotion engine.
- Stock movements.
- Role-based access.
- Audit logging.
- Admin product/inventory/promotion/report operations.
- Vercel deployment.
- Responsive compact cashier UI.

The most important next step before relying on it as a live production POS is to harden the remaining operational workflows, add automated tests, add real payment/email integrations, and finish the more detailed admin/reporting screens.
