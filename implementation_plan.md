# Technical Implementation Plan: TakeawayPOS Pro Enterprise Menu Architecture & Combo Deals

This implementation plan details the file-by-file changes and logic additions required to implement the **TakeawayPOS Pro — Menu Architecture & Process Flow Specification** (docx).

---

## User Review Required

> [!IMPORTANT]
> **Variation Model Migration**: Adding the `Variation` schema replaces the flat `basePricePence` field on `MenuItem` with a collection of sizes/portions, each with its own price offset and SKU.
> **Meal Deals / Bundles (Fixed Price with Upcharges)**: Submitting combo selections requires nested validation on the backend to verify that chosen items belong to allowed categories, calculating appropriate upcharges (e.g. +£0.50 for large fries inside a Burger Meal Deal).

---

## Proposed Changes

### 1. Database Layer Schema Specifications (`server/src/models/`)

#### [NEW] [Variation.js](file:///c:/Users/jahan/Outskill/Projects/TakeAwayPOS/server/src/models/Variation.js)
Defines physical sizes/dimensions per MenuItem (e.g., Small, Regular, Large).
```javascript
import mongoose from 'mongoose';

const variationSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true }, // e.g. "13\" Large", "Double Patty Build"
  priceDeltaPence: { type: Number, required: true, default: 0 }, // Surcharge offset relative to item basePrice
  isDefault: { type: Boolean, default: false },
  sku: { type: String, required: true, unique: true }, // e.g. "PZ-PEP-13"
}, { timestamps: true });

export default mongoose.model('Variation', variationSchema);
```

#### [NEW] [Bundle.js](file:///c:/Users/jahan/Outskill/Projects/TakeAwayPOS/server/src/models/Bundle.js)
Models composite menu items (Meal Deals/Combos) with slots.
```javascript
import mongoose from 'mongoose';

const componentSlotSchema = new mongoose.Schema({
  label: { type: String, required: true }, // e.g. "Burger Selection", "Side Selection"
  allowedCategoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  minChoices: { type: Number, default: 1 },
  maxChoices: { type: Number, default: 1 },
  required: { type: Boolean, default: true }
}, { _id: false });

const bundleSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true }, // e.g. "Burger Meal Deal"
  description: String,
  bundlePricePence: { type: Number, required: true }, // Fixed target price (e.g. 1099 for £10.99)
  components: [componentSlotSchema],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Bundle', bundleSchema);
```

#### [MODIFY] [MenuItem.js](file:///c:/Users/jahan/Outskill/Projects/TakeAwayPOS/server/src/models/MenuItem.js)
*   Remove direct reliance on singular price; link to `variations` collection via virtuals or helper queries.
*   Add `kitchenStationId` (Enum: `['PIZZA_LINE', 'HOT_GRILL_LINE', 'CURRY_LINE']`) to enforce print station boundaries.

---

### 2. Order Processing & Validation (`server/src/controllers/orderController.js`)

We will upgrade `createOrder` to handle:
1.  **Bundle Price Calculations**:
    *   Find the base bundle target price (e.g., £10.99 for Burger Meal Deal).
    *   Iterate through selected slot items. Verify that the chosen item belongs to an allowed category.
    *   Add upcharges for selected item variations (e.g. upgrading French Fries to Large Portion +£0.50).
2.  **Pizza Free Topping Caps**:
    *   If item belongs to Pizza category, verify Toppings selection rules:
        *   Veg Toppings: Up to 5 free, surcharged at +£0.80 for each additional veg topping.
        *   Premium Toppings: Surcharged at +£1.00 each (fully exempt from the free allowance).
3.  **KDS Printer Stream Compiler**:
    *   Implement format parsing that compiles order documents into targeted station blocks (matching the plain-text output specified in Part 5 of the document).

---

### 3. POS TerminalGuided Interface (`apps/pos/src/App.tsx`)

#### Sequential Choice Tree Wizard Modal
*   Replace flat checklist with tabbed choices when customizing:
    1.  **Step 1: Size/Portion** (Variations list, single-select).
    2.  **Step 3: Sauce Base** (Required single-select).
    3.  **Step 4: Optional Toppings/Add-Ons** (Checklist displaying remaining choices).
*   Enforce minSelection bounds inline, preventing addition to cart until rules are satisfied.

#### Meal Deal Configurator
*   Add a combo builder side-panel. Cashiers can tap slots, select from allowed categories, configure sub-modifiers for those items, and add the bundle to the cart with live upcharge calculations.

---

### 4. Admin Management Controls (`apps/admin/src/App.tsx`)

*   Add a **Combos & Meal Deals** tab to create bundles, configure slots with allowed category maps, set base target pricing, and manage upcharges.

---

### 5. Sync & Cache Layer Updates (`server/src/controllers/menuController.js`)

*   Add Redis cache invalidation keys when variations or bundles are updated.
*   Trigger WebSocket events (`menu:updated`) to broadcast to open POS terminals and customer PWAs to refresh local lists in the background.

---

## Verification Plan

### Automated Verification
*   Write a test script `scratch/test_combos.js` to simulate placing a:
    1.  *Burger Meal Deal* (Cheeseburger with Double Patty + Large Chips + Pepsi) verifying total calculates to £11.49 (£10.99 deal price + £0.50 chips upgrade).
    2.  *Pizza with >5 toppings* (1 Veg Topping over cap, 2 Premium Toppings) verifying toppings calculate correct surcharges.
*   Run `npm run build` to verify strict compilation.

### Manual Verification
1.  **Wizard Modal**: Click Margherita on POS, verify Size tab appears first, and you cannot skip to toppings until size is selected.
2.  **Meal Deal Designer**: Select Burger Meal Deal, check that side upgrades add £0.50 surcharges, and order compiles in the basket cleanly.
3.  **Kitchen Ticket Output**: Verify the terminal prints distinct sections for `PIZZA LINE`, `HOT GRILL LINE`, and `CURRY LINE` matching the docx format.
