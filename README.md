# Grocery POS MERN

A full-stack point of sale application for a small independent grocery store in the United Kingdom. It uses MongoDB, Express, React, Node.js, JWT auth, role-based access control, seeded UK grocery data, VAT-aware receipts, stock controls, reporting, and a touch-friendly cashier workflow.

## Quick Start

```bash
npm run install:all
npm start
```

The client runs at `http://localhost:5173` and the API at `http://localhost:5000`.

Default seeded accounts:

| Role | Username | Password | PIN |
| --- | --- | --- | --- |
| Admin | `admin` | `Admin1234!` | `1234` |
| Manager | `manager` | `Manager1234!` | `2222` |
| Cashier | `cashier1` | `Cashier1234!` | `3333` |

If `MONGO_URI` is not set, the server starts with an in-memory MongoDB demo database so the app works immediately. Set `USE_MEMORY_DB=false` and provide `MONGO_URI` for local MongoDB or Atlas.

## Environment

Copy `.env.example` to `server/.env` or define these variables in your shell:

```bash
PORT=5000
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/grocery_pos
USE_MEMORY_DB=false
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=12h
BCRYPT_ROUNDS=12
UPLOAD_DIR=uploads
STORE_NAME=Jahan Local Grocers
STORE_VAT_NUMBER=GB123456789
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Jahan Local Grocers <no-reply@example.com>"
```

## Features

- POS: barcode/SKU/PLU/quick-code entry, product search, category tiles, favourites, configurable product hotkeys, weighed-item entry, basket editing, line discounts, hold transaction, void/refund APIs, split payments, gift card payments, simulated card/contactless flows, receipt print area, and offline transaction queue.
- Promotions: basket-level offers including BOGOF, BOGOHP, buy X get Y free, tiered quantity pricing, mix-and-match, combo bundles, meal deals, reduced-to-clear discounts, coupons, minimum spend vouchers, and loyalty/member pricing.
- Till management: cashier login, PIN login, opening float, lock screen, shift close with stored Z-report data.
- UK compliance: integer pence money handling, VAT-inclusive pricing with 0%, 5%, and 20% breakdowns, MTD-style VAT export, Challenge 25 mandatory modal and audit events, unit pricing labels, GDPR anonymisation endpoint, audit trail.
- Admin: products, stock adjustments, suppliers, employees, customers, promotions, gift cards, settings, audit logs, backup, dashboards, sales/VAT/inventory/financial reports.
- Seed data: 12 grocery categories, 30+ UK products, realistic VAT rates/prices, sample staff, suppliers, customers, promotions, gift card, and settings.

## Production Notes

Use a persistent MongoDB instance, a long random `JWT_SECRET`, HTTPS, restricted `CLIENT_URL`, SMTP credentials, and a process manager such as PM2 or your platform supervisor. Build the frontend with:

```bash
npm run build
npm run start --prefix server
```

Serve `client/dist` through a static host or reverse proxy to the API.

## Vercel Deployment

This repo includes `vercel.json` and `api/index.js` so Vercel can serve the React app from `client/dist` and run the Express API as a serverless function. Set these Vercel environment variables before production deployment:

```bash
MONGO_URI=mongodb+srv://...
USE_MEMORY_DB=false
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=https://your-vercel-domain.vercel.app
```

Do not use the in-memory demo database on Vercel; serverless functions are ephemeral.

## Card Terminals

The app currently simulates card/contactless payments. To integrate hardware, replace the approval step in the POS payment flow and `/api/transactions/sale` orchestration with a provider SDK:

- Stripe Terminal: create a PaymentIntent server-side, collect payment through the reader SDK, and only complete the sale after confirmed capture.
- Worldpay or Square Reader: follow their terminal pairing flow, store provider references in `payments.reference`, and reconcile settlement reports against POS transactions.

Keep the current `payments.status`, `reference`, and immutable transaction model so refunds and audit reports remain consistent.

## Barcode Scanners, Scales, and Fast Keys

USB barcode scanners normally work as keyboard-wedge devices, so the POS keeps the scanner field focused and treats Enter as "add item". Products can be found by barcode, SKU, PLU, or a cashier-friendly quick code such as `TOM`, `COR`, `MILK`, or `COKE`.

Loose products can be marked as sold by weight in Admin. The POS supports manual verified weight entry and embedded EAN-13 scale-label parsing for common UK grocery label formats using product `scaleBarcodePrefix` plus either weight or price payload mode. The transaction stores the weight source, gross/net weight, tare, scale id, and manual reason so sales, refunds, stock movements, and receipts remain auditable.

High-frequency products can be assigned hotkeys such as `Alt+1` for coriander, `Alt+2` for chillies, `Alt+3` for tomatoes, `Alt+4` for curd, `Alt+5` for milk, and `Alt+6` for cola cans. Admin users can change those mappings from the product editor.

## Thermal Receipt Printing

Browser printing is formatted for an 80mm receipt area through `@media print`. Install the receipt printer driver, set it as a browser print destination, choose 80mm paper, and disable browser headers/footers. The API also exposes narrow PDF receipts at:

```text
GET /api/transactions/:id/receipt.pdf
```

## CSV, PDF, Backup

Product CSV export is available from `/api/products/export.csv`. Reports accept `?format=csv`, including `/api/reports/vat?format=csv` for MTD-style fields. Full JSON backup is available to admins at `/api/admin/backup`.

## Project Structure

```text
client/src/components
client/src/context
client/src/hooks
client/src/pages
client/src/services
client/src/utils
server/src/config
server/src/controllers
server/src/jobs
server/src/middleware
server/src/models
server/src/routes
server/src/utils
```
