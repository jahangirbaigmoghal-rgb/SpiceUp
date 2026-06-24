/**
 * Idempotent migration: add the 19 Bulk Deal / Bundle records defined in
 * TakeaayPOS_Menu Items.md into an EXISTING database, without a destructive
 * re-seed.
 *
 * Safe to run repeatedly: bundles already present (matched by tenant + name)
 * are skipped — existing bundles are NEVER overwritten or deleted.
 *
 * Usage:
 *   npm run migrate:bundles            (if wired in package.json)
 *   node server/src/migrate_add_bundles.js
 *
 * Env:
 *   MONGODB_URI      — MongoDB Atlas / local connection string (required)
 *   MONGODB_DB_NAME  — target database (default 'Takeawaypos')
 */
import { connectDb, disconnectDb } from './config/db.js';
import Tenant from './models/Tenant.js';
import Category from './models/Category.js';
import Bundle from './models/Bundle.js';

// Tenant whose bundles we update. Matches the seeder's stable id, with a
// fallback to any active tenant so it also works on freshly-seeded clouds.
const TARGET_TENANT_ID = '6a216d61d4823e48c82a46ee';

/**
 * The 19 deal specs from TakeaayPOS_Menu Items.md.
 * `slots[].categories` are runtime-resolved by category NAME so the
 * migration stays correct even if category slugs/ids change.
 */
const DEALS = [
  {
    name: 'Buy Any 2x 7" Pizza Get 1 Free', price: 560, bg: '#ea580c',
    desc: 'Buy any two 7" pizzas and get a third 7" pizza free.',
    slots: [
      { label: 'Pizza 1', categories: ['PIZZAS'], min: 1, max: 1, req: true },
      { label: 'Pizza 2', categories: ['PIZZAS'], min: 1, max: 1, req: true },
      { label: 'Free Pizza', categories: ['PIZZAS'], min: 1, max: 1, req: true },
    ],
  },
  {
    name: 'Buy Any 2x 9" Pizza Get 1 Free', price: 740, bg: '#ea580c',
    desc: 'Buy any two 9" pizzas and get a third 9" pizza free.',
    slots: [
      { label: 'Pizza 1', categories: ['PIZZAS'], min: 1, max: 1, req: true },
      { label: 'Pizza 2', categories: ['PIZZAS'], min: 1, max: 1, req: true },
      { label: 'Free Pizza', categories: ['PIZZAS'], min: 1, max: 1, req: true },
    ],
  },
  {
    name: 'Buy Any 2x 12" Pizza Get 1 Free', price: 1190, bg: '#ea580c',
    desc: 'Buy any two 12" pizzas and get a third 12" pizza free.',
    slots: [
      { label: 'Pizza 1', categories: ['PIZZAS'], min: 1, max: 1, req: true },
      { label: 'Pizza 2', categories: ['PIZZAS'], min: 1, max: 1, req: true },
      { label: 'Free Pizza', categories: ['PIZZAS'], min: 1, max: 1, req: true },
    ],
  },
  {
    name: 'Buy Any 2x 16" Pizza Get 1 Free', price: 1380, bg: '#ea580c',
    desc: 'Buy any two 16" pizzas and get a third 16" pizza free.',
    slots: [
      { label: 'Pizza 1', categories: ['PIZZAS'], min: 1, max: 1, req: true },
      { label: 'Pizza 2', categories: ['PIZZAS'], min: 1, max: 1, req: true },
      { label: 'Free Pizza', categories: ['PIZZAS'], min: 1, max: 1, req: true },
    ],
  },
  {
    name: 'Any 2x 9" Pizzas', price: 1400, bg: '#f59e0b',
    desc: 'Choose any two 9-inch pizzas.',
    slots: [
      { label: 'Pizza 1', categories: ['PIZZAS'], min: 1, max: 1, req: true },
      { label: 'Pizza 2', categories: ['PIZZAS'], min: 1, max: 1, req: true },
    ],
  },
  {
    name: 'Any 2x 12" Pizzas', price: 2400, bg: '#f59e0b',
    desc: 'Choose any two 12-inch pizzas.',
    slots: [
      { label: 'Pizza 1', categories: ['PIZZAS'], min: 1, max: 1, req: true },
      { label: 'Pizza 2', categories: ['PIZZAS'], min: 1, max: 1, req: true },
    ],
  },
  {
    name: 'Any 2x 16" Pizzas', price: 2800, bg: '#f59e0b',
    desc: 'Choose any two 16-inch pizzas.',
    slots: [
      { label: 'Pizza 1', categories: ['PIZZAS'], min: 1, max: 1, req: true },
      { label: 'Pizza 2', categories: ['PIZZAS'], min: 1, max: 1, req: true },
    ],
  },
  {
    name: 'Weekday Deal: 7" Pizza With Pepsi Can', price: 499, bg: '#22c55e',
    desc: 'Any 7-inch pizza with a Pepsi can — weekday only.',
    slots: [
      { label: 'Pizza', categories: ['PIZZAS'], min: 1, max: 1, req: true },
      { label: 'Drink', categories: [], min: 1, max: 1, req: true },
    ],
  },
  {
    name: 'Pizza Meal Deal 1', price: 1050, bg: '#3b82f6',
    desc: 'Any 7" pizza + onion rings + doner meat + chips.',
    slots: [
      { label: 'Pizza', categories: ['PIZZAS'], min: 1, max: 1, req: true },
      { label: 'Side 1', categories: ['SIDES'], min: 1, max: 1, req: true },
      { label: 'Side 2', categories: ['SIDES'], min: 1, max: 1, req: true },
    ],
  },
  {
    name: 'Pizza Meal Deal 2', price: 2200, bg: '#3b82f6',
    desc: 'Any 12" pizza + garlic baguette + doner meat + chips + onion rings.',
    slots: [
      { label: 'Pizza', categories: ['PIZZAS'], min: 1, max: 1, req: true },
      { label: 'Garlic Bread', categories: ['GARLIC BAGUETTE'], min: 1, max: 1, req: true },
      { label: 'Side', categories: ['SIDES'], min: 1, max: 1, req: true },
    ],
  },
  {
    name: 'Pizza Meal Deal 3', price: 2390, bg: '#3b82f6',
    desc: 'Any 16" pizza + doner meat + chips + onion rings.',
    slots: [
      { label: 'Pizza', categories: ['PIZZAS'], min: 1, max: 1, req: true },
      { label: 'Side', categories: ['SIDES'], min: 1, max: 2, req: true },
    ],
  },
  {
    name: 'Rup Express Nan 1', price: 1090, bg: '#a855f7',
    desc: '7" box: 1pc chicken, doner meat, chicken doner, shish in naan + chips.',
    slots: [
      { label: 'Kebab', categories: ['KEBABS'], min: 1, max: 1, req: true },
      { label: 'Side', categories: ['SIDES'], min: 1, max: 1, req: true },
    ],
  },
  {
    name: 'Rup Express Nan 2', price: 2200, bg: '#a855f7',
    desc: '9" box: 2pc chicken, doner meat, chicken doner, 3pc shish in naan + chips.',
    slots: [
      { label: 'Kebab', categories: ['KEBABS'], min: 1, max: 1, req: true },
      { label: 'Side', categories: ['SIDES'], min: 1, max: 1, req: true },
    ],
  },
  {
    name: 'Chicken Tikka Doner Box', price: 1250, bg: '#ec4899',
    desc: 'Chicken tikka doner served in a loaded box.',
    slots: [
      { label: 'Kebab', categories: ['KEBAB BOX DEALS'], min: 1, max: 1, req: true },
    ],
  },
  {
    name: 'Mixed Grill Box', price: 1400, bg: '#ec4899',
    desc: 'Mixed grill selection served in a loaded box.',
    slots: [
      { label: 'Kebab', categories: ['KEBAB BOX DEALS'], min: 1, max: 1, req: true },
    ],
  },
  {
    name: 'Burger Special', price: 950, bg: '#10b981',
    desc: 'Burger meal special with sides.',
    slots: [
      { label: 'Burger', categories: ['BURGERS'], min: 1, max: 1, req: true },
      { label: 'Side', categories: ['SIDES'], min: 0, max: 1, req: false },
    ],
  },
  {
    name: 'Kids Meal Deal', price: 490, bg: '#10b981',
    desc: 'Small meal deal perfect for kids.',
    slots: [
      { label: 'Main', categories: ['BURGERS', 'S.F.C AND VALUE BOXES'], min: 1, max: 1, req: true },
    ],
  },
  {
    name: 'Mixed Box', price: 850, bg: '#10b981',
    desc: 'Mixed selection box.',
    slots: [
      { label: 'Main', categories: ['S.F.C AND VALUE BOXES', 'KEBABS'], min: 1, max: 1, req: true },
    ],
  },
  {
    name: 'Chicken Tikka Meal Deal', price: 900, bg: '#10b981',
    desc: 'Chicken tikka meal with sides.',
    slots: [
      { label: 'Main', categories: ['KEBABS'], min: 1, max: 1, req: true },
      { label: 'Side', categories: ['SIDES'], min: 0, max: 1, req: false },
    ],
  },
  {
    name: 'Curry Deal', price: 1890, bg: '#ef4444',
    desc: 'Curry offers deal — curry with sides and drink.',
    slots: [
      { label: 'Curry', categories: [], min: 1, max: 1, req: true },
      { label: 'Side', categories: ['SIDES'], min: 0, max: 1, req: false },
    ],
  },
];

async function migrate() {
  // Assumes a DB connection is already open (the caller manages
  // connect/disconnect). This keeps migrate() safe to import from tests
  // or server startup without double-connecting.
  console.log('🚚 Bundle migration starting...');

  // Resolve tenant — prefer the seeder's stable id, else any active tenant.
  let tenant = await Tenant.findById(TARGET_TENANT_ID).select('_id').lean();
  if (!tenant) {
    tenant = await Tenant.findOne({ isActive: true }).select('_id').lean();
  }
  if (!tenant) {
    throw new Error('No tenant found. Run the seeder first or set a valid tenant.');
  }
  const tenantId = tenant._id;
  console.log(`🏢 Target tenant: ${tenantId}`);

  // Load this tenant's categories once; build a name → _id map (case-insensitive).
  const categories = await Category.find({ tenant: tenantId }).select('_id name').lean();
  const catByName = new Map();
  for (const c of categories) catByName.set(String(c.name).toUpperCase(), c._id);
  console.log(`📁 Resolved ${catByName.size} categories for slot anchoring.`);

  // Which deals already exist? (idempotency check by tenant + name)
  const existingNames = new Set(
    (await Bundle.find({ tenant: tenantId }).distinct('name')).map(n => String(n))
  );

  const toInsert = [];
  let skipped = 0;
  let unresolved = [];

  for (const deal of DEALS) {
    if (existingNames.has(deal.name)) {
      skipped++;
      continue;
    }
    // Resolve each slot's allowed categories to ObjectIds.
    const components = deal.slots.map(slot => {
      const allowedCategoryIds = (slot.categories || [])
        .map(name => {
          const id = catByName.get(String(name).toUpperCase());
          if (!id) unresolved.push(`${deal.name} → "${name}"`);
          return id;
        })
        .filter(Boolean);
      return {
        label: slot.label,
        allowedCategoryIds,
        minChoices: slot.min,
        maxChoices: slot.max,
        required: slot.req,
      };
    });

    toInsert.push({
      tenant: tenantId,
      name: deal.name,
      description: deal.desc,
      bundlePricePence: deal.price,
      components,
      isActive: true,
      backgroundColor: deal.bg,
      textColor: '#ffffff',
    });
  }

  if (unresolved.length) {
    console.warn('⚠️  Some slot categories were not found (slots created with empty allowedCategoryIds):');
    console.warn('   ' + [...new Set(unresolved)].join('\n   '));
    console.warn('   You can attach the correct categories from the Admin > Bulk Deals tab afterwards.');
  }

  if (toInsert.length === 0) {
    console.log(`✅ All ${DEALS.length} deals already present. Nothing to do. (${skipped} skipped)`);
    return { inserted: 0, skipped };
  }

  // ordered:false continues past any validation error on a single doc.
  const inserted = await Bundle.insertMany(toInsert, { ordered: false });
  console.log(`🎉 Inserted ${inserted.length} new bundle(s). ${skipped} already existed and were skipped.`);
  return { inserted: inserted.length, skipped };
}

// Allow both `import` from server startup and direct `node` CLI execution.
const invokedDirectly = (() => {
  try {
    return import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('migrate_add_bundles.js');
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  (async () => {
    try {
      await migrate();
      process.exit(0);
    } catch (err) {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    } finally {
      await disconnectDb();
    }
  })();
}

export { migrate };
