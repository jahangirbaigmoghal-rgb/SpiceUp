# SpiceUp 🍕🍔🍟

SpiceUp is a unified, production-grade point-of-sale, online ordering, and AI voice agent ecosystem designed specifically for takeaways, fast-food restaurants, and cafes in the United Kingdom. Built as a Turborepo-orchestrated monorepo, it connects an admin management backoffice, a cashier terminal, a kitchen display system, a customer-facing web portal/PWA, and a real-time Gemini-powered phone ordering assistant into a single, cohesive loop.

---

## 🏗️ Architecture & Monorepo Structure

This repository is organized as a Turborepo monorepo to maximize code reuse, simplify dependency management, and allow independent deployment of client, server, and assistant services.

```text
├── apps/
│   ├── admin/         # Master Admin Backoffice & Menu Builder
│   ├── customer/      # Customer-Facing Online Ordering Web Portal & PWA
│   ├── pos/           # Cashier Till Terminal (POS)
│   └── kds/           # Kitchen Display System (KDS)
├── packages/
│   ├── api-client/    # Shared API Client configurations and endpoints
│   ├── ui/            # Shared Tailwind UI components and design systems
│   └── utils/         # Helper functions (currency formatting, date utilities)
├── server/            # Core Express.js Backend API (MERN Stack)
└── voice-agent/      # Standalone Python Real-Time AI Voice Agent (Gemini 2.0 Flash)
```

---

## 🌟 Key Features

### 💻 Product Ecosystem
*   **Master Admin Dashboard (`apps/admin`)**: A centralized console for restaurant owners to configure the menu (sizes, portions, toppings, sauces), manage stock adjustments, configure kitchen routing, monitor live cashier shifts, and generate daily financial reports (Z-reports).
*   **Cashier POS Terminal (`apps/pos`)**: A keyboard- and touch-optimized layout for counter checkout. Supports configurable product hotkeys (e.g., `Alt+1` to `Alt+6`), manual verified scale weight inputs, line-item adjustments, shift lock/unlock, and multiple payment methods (Cash, Card, SMS Pay Link).
*   **Kitchen Display System (`apps/kds`)**: A live bump screen that tracks incoming tickets. Automatically routes items to their respective preparation stations (e.g., Pizza Station, Grill, Fryer, Curry Station) based on menu definitions.
*   **Customer Web App/PWA (`apps/customer`)**: An intuitive, mobile-friendly online ordering portal that allows customers to browse menus, build custom bundles, customize meals, track delivery/collection statuses, and perform outward-postcode delivery validation.
*   **AI Voice Agent (`voice-agent/`)**: A standalone real-time audio service integrated with Twilio that processes telephone orders. Customers calling **`+441782288662`** are greeted by the AI agent (**Rupeyal Express**), which queries POS databases for active menu availability, verifies postcodes, places/cancels orders, and sends Stripe payment links via SMS.

### 🇬🇧 UK Compliance & Core Logic
*   **Pence-Based Arithmetic**: To avoid floating-point errors, all pricing and transactions are calculated and stored internally as integers in pence.
*   **VAT-Aware Calculations**: Configurable VAT categories (e.g., Standard 20%, Reduced 5%, and Zero-rated 0%) are applied dynamically to menu items, generating granular VAT audits and MTD (Making Tax Digital) compliant reports.
*   **Challenge 25 Enforcement**: Built-in visual prompt modals and audit trail flags are enforced for cashiers selling age-restricted products (e.g., alcoholic beverages).
*   **Postcode Validation**: Active zone checker validating UK outward postcodes against delivery boundaries, determining delivery fee policies.

---

## 🚀 Quick Start

### Prerequisites
*   Node.js (`>= 20.0.0`)
*   npm (`>= 10.8.2`)
*   Python (`>= 3.10` - for the Voice Agent)
*   MongoDB (Persistent local database or MongoDB Atlas cloud instance)

### Installation
Install all monorepo dependencies (clients, server, and packages) with a single root command:

```bash
npm run install:all
```

To install the Python voice agent dependencies:

```bash
cd voice-agent
pip install -r requirements.txt
cd ..
```

### Seeding default data
Seed the database with sample UK takeaway categories, items, modifiers, employee accounts, and settings:

```bash
npm run seed
```

### Running the Monorepo (Dev mode)
To launch the Node/Vite developer servers concurrently:

```bash
npm run dev
```
*   **POS Terminal**: `http://localhost:5173`
*   **Admin Panel**: `http://localhost:5174`
*   **Customer App**: `http://localhost:5175`
*   **KDS App**: `http://localhost:5176`
*   **Express API**: `http://localhost:5001`

---

## ⚙️ Environment Configuration

### POS Backend API Server (`server/.env`)
Create a `.env` file in the `server/` directory:

```bash
PORT=5001
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/spiceup
USE_MEMORY_DB=false
JWT_SECRET=your-jwt-auth-secret-key-goes-here
JWT_EXPIRES_IN=12h
BCRYPT_ROUNDS=12
UPLOAD_DIR=uploads
STORE_NAME="Rupeyal Express"
STORE_VAT_NUMBER="GB123456789"
```

### AI Voice Agent (`voice-agent/.env`)
Create a `.env` file in the `voice-agent/` directory:

```bash
# Google Gemini API Settings
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash-live-001
GEMINI_VOICE=Charon

# Twilio Credentials
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+441782288662

# POS Integration
BACKEND_URL=https://spiceup.onrender.com
VOICE_AGENT_API_KEY=your_voice_agent_api_key

# Database and Server Settings
MONGODB_URI=mongodb://127.0.0.1:27017/spiceup
HOST=0.0.0.0
PORT=5050
RESTAURANT_NAME="Rupeyal Express"
```

---

## 📞 Real-Time AI Voice Agent Integration

The **`voice-agent`** application connects a Twilio Media Stream to the Google Gemini Live API WebSocket endpoint, facilitating real-time duplex voice conversations.

### Call Flow & POS Integration
1.  **Incoming Call**: Twilio redirects incoming calls to the voice agent server endpoint `/incoming-call`.
2.  **Streaming Audio**: A bidirectional WebSocket is opened between the user's phone line and the voice agent server, streaming raw mu-law audio payload.
3.  **Live Session Bridge**: The server creates a dual-channel bridge, passing voice audio to Gemini's WebSocket Live API and piping Gemini's generated audio back to Twilio.
4.  **Function Calling**: The Gemini model invokes tools defined in `pos_tools.py` during conversation to:
    *   Query menu listings and verify items availability.
    *   Verify if a customer postcode falls inside the service zones.
    *   Create order payloads, append variations/modifiers, and save orders in the database.
    *   Generate and text Stripe payment URLs via Twilio SMS.
    *   Initiate call transfers to the physical cashier.

---

## 📦 Production Deployment

### Frontends & Core Backend
The backend Express API and Vite frontends are ready to be deployed. They have pre-configured build chains suitable for platforms like **Render**, **Vercel**, or standalone VPS instances.
*   **Vercel Build Target**: Vite apps build output to static paths (`dist/`) while the root `/api/*` resolves paths to the Express engine.
*   **Render Build Target**: Express server can be run as a standard Web Service, mapping the client directories to static express routes for unified hosting.

### Voice Agent Hosting
The Python voice agent should be run on a service supporting persistent WebSockets (e.g., Render, Railway, or AWS EC2) with an SSL/TLS cert, mapping the Twilio number webhook to target the `/incoming-call` endpoint.
