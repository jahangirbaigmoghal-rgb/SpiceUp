import { connectDb, disconnectDb } from './config/db.js';
import Tenant from './models/Tenant.js';
import User from './models/User.js';
import Category from './models/Category.js';
import ModifierGroup from './models/ModifierGroup.js';
import MenuItem from './models/MenuItem.js';
import DeliveryZone from './models/DeliveryZone.js';
import Setting from './models/Setting.js';
import Department from './models/Department.js';
import Label from './models/Label.js';
import Component from './models/Component.js';
import ShortHand from './models/ShortHand.js';
import ProductTime from './models/ProductTime.js';
import ManualProduct from './models/ManualProduct.js';
import Variation from './models/Variation.js';
import Bundle from './models/Bundle.js';

const TARGET_TENANT_ID = '6a216d61d4823e48c82a46ee';

export async function seed() {
  console.log('🧹 Clearing old collections...');
  await Promise.all([
    Tenant.deleteMany({}),
    User.deleteMany({}),
    Category.deleteMany({}),
    ModifierGroup.deleteMany({}),
    MenuItem.deleteMany({}),
    DeliveryZone.deleteMany({}),
    Setting.deleteMany({}),
    Department.deleteMany({}),
    Label.deleteMany({}),
    Component.deleteMany({}),
    ShortHand.deleteMany({}),
    ProductTime.deleteMany({}),
    ManualProduct.deleteMany({}),
    Variation.deleteMany({}),
    Bundle.deleteMany({}),
  ]);

  console.log('🏢 Creating demo tenant...');
  const tenant = await Tenant.create({
    _id: TARGET_TENANT_ID,
    isActive: true,
    slug: 'rupeyal-express',
    businessName: "Rupeyal Express",
    address: {
      line1: '385 High Street, Tunstall',
      city: 'Stoke-on-Trent',
      county: 'Staffordshire',
      postcode: 'ST6 5EP',
      country: 'UK',
    },
    coords: { lat: 53.06469, lng: -2.21445 },
    phone: '01782 790 600',
    email: 'contact@rupeyalexpress.co.uk',
    vatNumber: 'GB123456789',
    vatRegistered: true,
    settings: {
      deliveryEnabled: true,
      collectionEnabled: true,
      dineInEnabled: true,
      tableOrderEnabled: false,
      openingHours: [
        { day: 0, open: '12:00', close: '23:00' },
        { day: 1, open: '16:00', close: '23:00' },
        { day: 2, open: '16:00', close: '23:00' },
        { day: 3, open: '16:00', close: '23:00' },
        { day: 4, open: '16:00', close: '23:00' },
        { day: 5, open: '12:00', close: '00:00' },
        { day: 6, open: '12:00', close: '00:00' },
      ],
      deliveryLeadMinutes: 45,
      collectionLeadMinutes: 20,
      minimumOrderPence: 1000,
      isOpen: true,
      currency: 'GBP',
      timezone: 'Europe/London',
    },
    voiceAgentEnabled: true,
    plan: 'pro',
  });

  const tenantId = tenant._id;

  console.log('👥 Creating staff users...');
  const [adminPass, managerPass, cashierPass, kitchenPass, driverPass] = await Promise.all([
    User.hashPassword('Admin123!'),
    User.hashPassword('Manager123!'),
    User.hashPassword('Cashier123!'),
    User.hashPassword('Kitchen123!'),
    User.hashPassword('Driver123!'),
  ]);

  const [pin1111, pin2222, pin3333, pin4444, pin5555] = await Promise.all([
    User.hashPin('1111'),
    User.hashPin('2222'),
    User.hashPin('3333'),
    User.hashPin('4444'),
    User.hashPin('5555'),
  ]);

  await User.create([
    { tenant: tenantId, name: 'Owner Admin', username: 'admin', role: 'admin', passwordHash: adminPass, pin: pin1111, isActive: true },
    { tenant: tenantId, name: 'Shift Manager', username: 'manager', role: 'manager', passwordHash: managerPass, pin: pin2222, isActive: true },
    { tenant: tenantId, name: 'Cashier Staff', username: 'cashier', role: 'cashier', passwordHash: cashierPass, pin: pin3333, isActive: true },
    { tenant: tenantId, name: 'Kitchen Chef', username: 'kitchen', role: 'kitchen', passwordHash: kitchenPass, pin: pin4444, isActive: true },
    { tenant: tenantId, name: 'Delivery Driver', username: 'driver', role: 'driver', passwordHash: driverPass, pin: pin5555, isActive: true },
  ]);

  console.log('🏛️ Creating departments...');
  const departments = await Department.create([
    { tenant: tenantId, name: 'PIZZA' },
    { tenant: tenantId, name: 'STARTER' },
    { tenant: tenantId, name: 'CURRYS' },
    { tenant: tenantId, name: 'NANS' },
    { tenant: tenantId, name: 'RICE' },
    { tenant: tenantId, name: 'BURGERS' },
    { tenant: tenantId, name: 'KEBAB' },
    { tenant: tenantId, name: 'SIDE ORDER' },
    { tenant: tenantId, name: 'DRINK N DESSETS' },
    { tenant: tenantId, name: 'SHOP N TOBACCO' },
  ]);
  const dept = Object.fromEntries(departments.map(d => [d.name, d._id]));

  console.log('🏷️ Creating modifier labels...');
  const labelsList = await Label.create([
    { tenant: tenantId, name: 'NO', backgroundColor: '#ef4444', textColor: '#ffffff' },
    { tenant: tenantId, name: 'LESS', backgroundColor: '#f59e0b', textColor: '#ffffff' },
    { tenant: tenantId, name: 'ON CHIPS', backgroundColor: '#3b82f6', textColor: '#ffffff' },
    { tenant: tenantId, name: 'ON BURGER', backgroundColor: '#10b981', textColor: '#ffffff' },
    { tenant: tenantId, name: 'ALL OVER', backgroundColor: '#8b5cf6', textColor: '#ffffff' },
    { tenant: tenantId, name: 'ON HALF', backgroundColor: '#ec4899', textColor: '#ffffff' },
  ]);
  const labelByName = Object.fromEntries(labelsList.map(label => [label.name, label._id]));

  console.log('🥬 Creating global components...');
  const rawComponents = [
    { name: 'POTATOES', defaultPriceDeltaPence: 100 },
    { name: 'SPINACH', defaultPriceDeltaPence: 120 },
    { name: 'MUSHROOMS', defaultPriceDeltaPence: 80 },
    { name: 'ONIONS', defaultPriceDeltaPence: 50 },
    { name: 'FRESH TOMATOES', defaultPriceDeltaPence: 70 },
    { name: 'SWEETCORN', defaultPriceDeltaPence: 60 },
    { name: 'CHICK TIKKA', defaultPriceDeltaPence: 180 },
    { name: 'PEPPERONI', defaultPriceDeltaPence: 150 },
    { name: 'TUNA', defaultPriceDeltaPence: 160 },
    { name: 'CHEESE CRUST', defaultPriceDeltaPence: 250 },
    { name: 'BALTI SAUCE', defaultPriceDeltaPence: 150 },
    { name: 'SALT', defaultPriceDeltaPence: 0 },
    { name: 'EXTRA GARLIC', defaultPriceDeltaPence: 50 },
    { name: 'NORMAL', defaultPriceDeltaPence: 0 },
    { name: 'HOT', defaultPriceDeltaPence: 0 },
    { name: 'MILD', defaultPriceDeltaPence: 0 },
    { name: 'WELL DONE', defaultPriceDeltaPence: 0 },
    { name: 'Tomato Base', defaultPriceDeltaPence: 0 },
    { name: 'BBQ Base', defaultPriceDeltaPence: 50 },
    { name: 'Garlic Butter on Base', defaultPriceDeltaPence: 50 },
    { name: 'Extra Sauce', defaultPriceDeltaPence: 50 },
    { name: 'Extra Cheese', defaultPriceDeltaPence: 150 },
    { name: 'Mixed Peppers', defaultPriceDeltaPence: 100 },
    { name: 'Green Chilli', defaultPriceDeltaPence: 80 },
    { name: 'Beef Pepperoni', defaultPriceDeltaPence: 150 },
    { name: 'Turkey Ham', defaultPriceDeltaPence: 150 },
    { name: 'Chicken Tikka', defaultPriceDeltaPence: 180 },
    { name: 'Sticky BBQ Drizzle on Pizza', defaultPriceDeltaPence: 30 },
    { name: 'Yogurt and Mint Drizzle on Pizza', defaultPriceDeltaPence: 30 },
    { name: 'Garlic & Herb Dip', defaultPriceDeltaPence: 50 },
    { name: 'No Garlic & Herb Dip', defaultPriceDeltaPence: 0 },
    { name: 'Standard Crust', defaultPriceDeltaPence: 0 },
    { name: 'Thin Crust', defaultPriceDeltaPence: 0 },
    { name: 'Stuffed Crust', defaultPriceDeltaPence: 250 },
  ];
  const componentsList = await Component.create(rawComponents.map(c => ({
    tenant: tenantId,
    name: c.name,
    defaultPriceDeltaPence: c.defaultPriceDeltaPence,
    color: '#1e293b',
    textColor: '#f8fafc'
  })));
  const comp = Object.fromEntries(componentsList.map(c => [c.name, c]));

  console.log('⏰ Creating product times...');
  await ProductTime.create([
    { tenant: tenantId, name: 'Breakfast', startTime: '08:00', endTime: '11:30' },
    { tenant: tenantId, name: 'Lunch', startTime: '11:30', endTime: '15:30' },
    { tenant: tenantId, name: 'Dinner', startTime: '15:30', endTime: '23:30' }
  ]);

  console.log('⏰ Creating modifier groups...');
  const crustGroup = await ModifierGroup.create({
    tenant: tenantId,
    name: 'Choose your Crust',
    displayName: 'Crust',
    dashboardHeading: 'CHOOSE PIZZA CRUST',
    type: 'required',
    selectionType: 'single',
    minSelections: 1,
    maxSelections: 1,
    options: [
      { name: 'Standard Crust', priceDeltaPence: 0, isDefault: true, component: comp['Standard Crust']?._id },
      { name: 'Thin Crust', priceDeltaPence: 0, component: comp['Thin Crust']?._id },
      { name: 'Stuffed Crust', priceDeltaPence: 250, component: comp['Stuffed Crust']?._id },
    ],
  });

  const pizzaToppingsGroup = await ModifierGroup.create({
    tenant: tenantId,
    name: 'Extra toppings',
    displayName: 'Toppings',
    dashboardHeading: 'EXTRA TOPPINGS FOR PIZZA',
    staticLabelsEnabled: true,
    allowedLabelIds: [labelByName.NO, labelByName.LESS, labelByName['ON HALF'], labelByName['ALL OVER']],
    type: 'optional',
    selectionType: 'multiple',
    minSelections: 0,
    maxSelections: 10,
    options: [
      { name: 'BBQ Base', priceDeltaPence: 50, component: comp['BBQ Base']?._id },
      { name: 'Garlic Butter on Base', priceDeltaPence: 50, component: comp['Garlic Butter on Base']?._id },
      { name: 'Extra Sauce', priceDeltaPence: 50, component: comp['Extra Sauce']?._id },
      { name: 'Extra Cheese', priceDeltaPence: 150, component: comp['Extra Cheese']?._id },
      { name: 'Mixed Peppers', priceDeltaPence: 100, component: comp['Mixed Peppers']?._id },
      { name: 'Green Chilli', priceDeltaPence: 80, component: comp['Green Chilli']?._id },
      { name: 'Beef Pepperoni', priceDeltaPence: 150, component: comp['Beef Pepperoni']?._id },
      { name: 'Turkey Ham', priceDeltaPence: 150, component: comp['Turkey Ham']?._id },
      { name: 'Chicken Tikka', priceDeltaPence: 180, component: comp['Chicken Tikka']?._id },
    ],
  });

  const drizzleGroup = await ModifierGroup.create({
    tenant: tenantId,
    name: 'Choose your Drizzle',
    displayName: 'Drizzle',
    dashboardHeading: 'CHOOSE DRIZZLE',
    type: 'optional',
    selectionType: 'multiple',
    minSelections: 0,
    maxSelections: 2,
    options: [
      { name: 'Sticky BBQ Drizzle on Pizza', priceDeltaPence: 30, component: comp['Sticky BBQ Drizzle on Pizza']?._id },
      { name: 'Yogurt and Mint Drizzle on Pizza', priceDeltaPence: 30, component: comp['Yogurt and Mint Drizzle on Pizza']?._id },
    ],
  });

  const dipGroup = await ModifierGroup.create({
    tenant: tenantId,
    name: 'Choose your Dip',
    displayName: 'Dip',
    dashboardHeading: 'CHOOSE DIP',
    type: 'required',
    selectionType: 'single',
    minSelections: 1,
    maxSelections: 1,
    options: [
      { name: 'Garlic & Herb Dip', priceDeltaPence: 50, isDefault: true, component: comp['Garlic & Herb Dip']?._id },
      { name: 'No Garlic & Herb Dip', priceDeltaPence: 0, component: comp['No Garlic & Herb Dip']?._id },
    ],
  });

  const curryAddonsGroup = await ModifierGroup.create({
    tenant: tenantId,
    name: 'Extra Add Ons for Curries',
    displayName: 'Extra Add Ons',
    dashboardHeading: 'EXTRA ADDONS FOR CURRIES',
    staticLabelsEnabled: true,
    allowedLabelIds: [labelByName.NO, labelByName.LESS, labelByName['ALL OVER']],
    type: 'optional',
    selectionType: 'multiple',
    minSelections: 0,
    maxSelections: 10,
    options: [
      { name: 'Potatoes', priceDeltaPence: 100, component: comp.POTATOES?._id },
      { name: 'Spinach', priceDeltaPence: 120, component: comp.SPINACH?._id },
      { name: 'Mushrooms', priceDeltaPence: 80, component: comp.MUSHROOMS?._id },
      { name: 'Onions', priceDeltaPence: 50, component: comp.ONIONS?._id },
    ]
  });

  const burgerCheeseGroup = await ModifierGroup.create({
    tenant: tenantId,
    name: 'Choose Cheese',
    displayName: 'Cheese',
    dashboardHeading: 'CHOOSE CHEESE FOR BURGER',
    type: 'optional',
    selectionType: 'single',
    minSelections: 0,
    maxSelections: 1,
    options: [
      { name: 'Cheddar Slice', priceDeltaPence: 50 },
      { name: 'Blue Cheese', priceDeltaPence: 75 }
    ]
  });

  const burgerToppingsGroup = await ModifierGroup.create({
    tenant: tenantId,
    name: 'Burger Salad / Toppings',
    displayName: 'Toppings',
    dashboardHeading: 'CHOOSE BURGER TOPPINGS',
    type: 'optional',
    selectionType: 'multiple',
    minSelections: 0,
    maxSelections: 10,
    options: [
      { name: 'Lettuce', priceDeltaPence: 0 },
      { name: 'Onions', priceDeltaPence: 0 },
      { name: 'Tomatoes', priceDeltaPence: 0 },
      { name: 'Gherkins', priceDeltaPence: 0 }
    ]
  });

  const burgerSauceGroup = await ModifierGroup.create({
    tenant: tenantId,
    name: 'Burger Sauce',
    displayName: 'Sauce',
    dashboardHeading: 'CHOOSE BURGER SAUCE',
    type: 'optional',
    selectionType: 'multiple',
    minSelections: 0,
    maxSelections: 2,
    options: [
      { name: 'BBQ Sauce', priceDeltaPence: 0 },
      { name: 'Ketchup', priceDeltaPence: 0 },
      { name: 'Mayonnaise', priceDeltaPence: 0 },
      { name: 'Burger Sauce', priceDeltaPence: 0 }
    ]
  });

  const kebabBreadGroup = await ModifierGroup.create({
    tenant: tenantId,
    name: 'Choose Bread / Base',
    displayName: 'Bread / Base',
    dashboardHeading: 'CHOOSE KEBAB BASE',
    type: 'required',
    selectionType: 'single',
    minSelections: 1,
    maxSelections: 1,
    options: [
      { name: 'In Naan', priceDeltaPence: 0, isDefault: true },
      { name: 'In Pitta', priceDeltaPence: 0 },
      { name: 'On Chips', priceDeltaPence: 100 }
    ]
  });

  console.log('🍕 Seeding categories and items...');

  const assignGroups = (groupIds) => groupIds.map((group, index) => ({
    group,
    isEnabled: true,
    requiredOverride: null,
    posOrder: index,
    websiteOrder: index,
    showOnPos: true,
    showOnWebsite: true,
  }));

  // --- CATEGORIES ---
  const cat_biryani = await Category.create({
    tenant: tenantId,
    name: "BIRYANI",
    slug: "biryani",
    displayOrder: 1,
    isActive: true,
    department: dept["RICE"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_biscuits_cookies = await Category.create({
    tenant: tenantId,
    name: "BISCUITS & COOKIES",
    slug: "biscuits-cookies",
    displayOrder: 2,
    isActive: true,
    department: dept["SIDE ORDER"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_burgers = await Category.create({
    tenant: tenantId,
    name: "BURGERS",
    slug: "burgers",
    displayOrder: 3,
    isActive: true,
    department: dept["BURGERS"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_buy_any_2x_pizza_get_1_free = await Category.create({
    tenant: tenantId,
    name: "BUY ANY 2X PIZZA GET 1 FREE",
    slug: "buy-any-2x-pizza-get-1-free",
    displayOrder: 4,
    isActive: true,
    department: dept["SIDE ORDER"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_cat_food = await Category.create({
    tenant: tenantId,
    name: "CAT FOOD",
    slug: "cat-food",
    displayOrder: 5,
    isActive: true,
    department: dept["SIDE ORDER"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_chats = await Category.create({
    tenant: tenantId,
    name: "CHATS",
    slug: "chats",
    displayOrder: 6,
    isActive: true,
    department: dept["STARTER"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_chewing_gum_mints = await Category.create({
    tenant: tenantId,
    name: "CHEWING GUM & MINTS",
    slug: "chewing-gum-mints",
    displayOrder: 7,
    isActive: true,
    department: dept["SIDE ORDER"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_cigarettes = await Category.create({
    tenant: tenantId,
    name: "CIGARETTES",
    slug: "cigarettes",
    displayOrder: 8,
    isActive: true,
    department: dept["SHOP N TOBACCO"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_curry_loaded_fries = await Category.create({
    tenant: tenantId,
    name: "CURRY LOADED FRIES",
    slug: "curry-loaded-fries",
    displayOrder: 9,
    isActive: true,
    department: dept["SIDE ORDER"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_curry_offers = await Category.create({
    tenant: tenantId,
    name: "CURRY OFFERS",
    slug: "curry-offers",
    displayOrder: 10,
    isActive: true,
    department: dept["SIDE ORDER"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_desserts_cakes = await Category.create({
    tenant: tenantId,
    name: "DESSERTS & CAKES",
    slug: "desserts-cakes",
    displayOrder: 11,
    isActive: true,
    department: dept["DRINK N DESSETS"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_dog_food = await Category.create({
    tenant: tenantId,
    name: "DOG FOOD",
    slug: "dog-food",
    displayOrder: 12,
    isActive: true,
    department: dept["SIDE ORDER"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_drinks = await Category.create({
    tenant: tenantId,
    name: "DRINKS",
    slug: "drinks",
    displayOrder: 13,
    isActive: true,
    department: dept["DRINK N DESSETS"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_extras = await Category.create({
    tenant: tenantId,
    name: "EXTRAS",
    slug: "extras",
    displayOrder: 14,
    isActive: true,
    department: dept["SIDE ORDER"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_fresh_nan_breads = await Category.create({
    tenant: tenantId,
    name: "FRESH NAN BREADS",
    slug: "fresh-nan-breads",
    displayOrder: 15,
    isActive: true,
    department: dept["NANS"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_garlic_baguette = await Category.create({
    tenant: tenantId,
    name: "GARLIC BAGUETTE",
    slug: "garlic-baguette",
    displayOrder: 16,
    isActive: true,
    department: dept["PIZZA"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_household_miscellaneous = await Category.create({
    tenant: tenantId,
    name: "HOUSEHOLD & MISCELLANEOUS",
    slug: "household-miscellaneous",
    displayOrder: 17,
    isActive: true,
    department: dept["SIDE ORDER"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_ice_creams = await Category.create({
    tenant: tenantId,
    name: "ICE CREAMS",
    slug: "ice-creams",
    displayOrder: 18,
    isActive: true,
    department: dept["DRINK N DESSETS"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_kebab_box_deals = await Category.create({
    tenant: tenantId,
    name: "KEBAB BOX DEALS",
    slug: "kebab-box-deals",
    displayOrder: 19,
    isActive: true,
    department: dept["KEBAB"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_kebabs = await Category.create({
    tenant: tenantId,
    name: "KEBABS",
    slug: "kebabs",
    displayOrder: 20,
    isActive: true,
    department: dept["KEBAB"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_masala_dishes = await Category.create({
    tenant: tenantId,
    name: "MASALA DISHES",
    slug: "masala-dishes",
    displayOrder: 21,
    isActive: true,
    department: dept["CURRYS"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_meal_deals = await Category.create({
    tenant: tenantId,
    name: "MEAL DEALS",
    slug: "meal-deals",
    displayOrder: 22,
    isActive: true,
    department: dept["SIDE ORDER"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_milkshakes = await Category.create({
    tenant: tenantId,
    name: "MILKSHAKES",
    slug: "milkshakes",
    displayOrder: 23,
    isActive: true,
    department: dept["DRINK N DESSETS"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_miscellaneous_items = await Category.create({
    tenant: tenantId,
    name: "MISCELLANEOUS ITEMS",
    slug: "miscellaneous-items",
    displayOrder: 24,
    isActive: true,
    department: dept["SIDE ORDER"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_pizza_deals = await Category.create({
    tenant: tenantId,
    name: "PIZZA DEALS",
    slug: "pizza-deals",
    displayOrder: 25,
    isActive: true,
    department: dept["SIDE ORDER"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_pizzas = await Category.create({
    tenant: tenantId,
    name: "PIZZAS",
    slug: "pizzas",
    displayOrder: 26,
    isActive: true,
    department: dept["PIZZA"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_rice_box = await Category.create({
    tenant: tenantId,
    name: "RICE BOX",
    slug: "rice-box",
    displayOrder: 27,
    isActive: true,
    department: dept["RICE"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_rice_dishes = await Category.create({
    tenant: tenantId,
    name: "RICE DISHES",
    slug: "rice-dishes",
    displayOrder: 28,
    isActive: true,
    department: dept["RICE"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_sfc_and_value_boxes = await Category.create({
    tenant: tenantId,
    name: "S.F.C AND VALUE BOXES",
    slug: "sfc-and-value-boxes",
    displayOrder: 29,
    isActive: true,
    department: dept["SIDE ORDER"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_shop_items = await Category.create({
    tenant: tenantId,
    name: "SHOP ITEMS",
    slug: "shop-items",
    displayOrder: 30,
    isActive: true,
    department: dept["SHOP N TOBACCO"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_side_orders = await Category.create({
    tenant: tenantId,
    name: "SIDE ORDERS",
    slug: "side-orders",
    displayOrder: 31,
    isActive: true,
    department: dept["SIDE ORDER"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_sides = await Category.create({
    tenant: tenantId,
    name: "SIDES",
    slug: "sides",
    displayOrder: 32,
    isActive: true,
    department: dept["SIDE ORDER"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_square_pizzas = await Category.create({
    tenant: tenantId,
    name: "SQUARE PIZZAS",
    slug: "square-pizzas",
    displayOrder: 33,
    isActive: true,
    department: dept["PIZZA"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_starters = await Category.create({
    tenant: tenantId,
    name: "STARTERS",
    slug: "starters",
    displayOrder: 34,
    isActive: true,
    department: dept["STARTER"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_the_curry_box = await Category.create({
    tenant: tenantId,
    name: "THE CURRY BOX",
    slug: "the-curry-box",
    displayOrder: 35,
    isActive: true,
    department: dept["SIDE ORDER"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_tobacco_rizla = await Category.create({
    tenant: tenantId,
    name: "TOBACCO & RIZLA",
    slug: "tobacco-rizla",
    displayOrder: 36,
    isActive: true,
    department: dept["SHOP N TOBACCO"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_tobacco_liquid = await Category.create({
    tenant: tenantId,
    name: "TOBACCO LIQUID",
    slug: "tobacco-liquid",
    displayOrder: 37,
    isActive: true,
    department: dept["SHOP N TOBACCO"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_traditional_curries = await Category.create({
    tenant: tenantId,
    name: "TRADITIONAL CURRIES",
    slug: "traditional-curries",
    displayOrder: 38,
    isActive: true,
    department: dept["CURRYS"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_vapes_ecigs = await Category.create({
    tenant: tenantId,
    name: "VAPES / ECIGS",
    slug: "vapes-ecigs",
    displayOrder: 39,
    isActive: true,
    department: dept["SHOP N TOBACCO"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_viral_crunch_cake = await Category.create({
    tenant: tenantId,
    name: "VIRAL CRUNCH CAKE",
    slug: "viral-crunch-cake",
    displayOrder: 40,
    isActive: true,
    department: dept["DRINK N DESSETS"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  const cat_wraps = await Category.create({
    tenant: tenantId,
    name: "WRAPS",
    slug: "wraps",
    displayOrder: 41,
    isActive: true,
    department: dept["KEBAB"],
    color: "#475569",
    backgroundColor: "#475569"
  });

  // --- MENU ITEMS ---
  const item_chicken_biryani = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Biryani",
    menuCode: "BIR-001",
    description: "Aromatic chicken biryani served with flavorful biryani sauce and tender mushrooms — a perfect blend of ...",
    category: cat_biryani._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_vegetable_biryani = await MenuItem.create({
    tenant: tenantId,
    name: "Vegetable Biryani",
    menuCode: "BIR-002",
    description: "Aromatic basmati rice layered with fresh mixed vegetables and fragrant spices, served with rich ...",
    category: cat_biryani._id,
    basePricePence: 1010,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_tikka_biryani = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Tikka Biryani",
    menuCode: "BIR-003",
    description: "Tender chicken tikka cooked with fragrant basmati rice and aromatic spices, served with rich biryani ...",
    category: cat_biryani._id,
    basePricePence: 1040,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_rupeyal_special_biryani = await MenuItem.create({
    tenant: tenantId,
    name: "Rupeyal Special Biryani",
    menuCode: "BIR-004",
    description: "A royal feast of tender meats, fragrant basmati rice, and a blend of secret spices, served with rich biryani sauce — a special treat you don't want to miss. Order ...",
    category: cat_biryani._id,
    basePricePence: 1050,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mince_meat_biryani = await MenuItem.create({
    tenant: tenantId,
    name: "Mince Meat Biryani",
    menuCode: "BIR-005",
    description: "Fragrant basmati rice cooked with spiced minced meat and aromatic herbs, served with rich biryani sauce for an extra burst of flavor. Order now!",
    category: cat_biryani._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_prawn_biryani = await MenuItem.create({
    tenant: tenantId,
    name: "Prawn Biryani",
    menuCode: "BIR-006",
    description: "Aromatic basmati rice layered with fresh mixed vegetables and fragrant spices, served with rich ...",
    category: cat_biryani._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_meat_biryani = await MenuItem.create({
    tenant: tenantId,
    name: "Meat Biryani",
    menuCode: "BIR-007",
    description: "Succulent spiced meat cooked with fragrant basmati rice and traditional spices, served with rich biryani ...",
    category: cat_biryani._id,
    basePricePence: 1000,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_maryland_double_choc = await MenuItem.create({
    tenant: tenantId,
    name: "Maryland Double Choc",
    menuCode: "BIS-001",
    description: "Freshly prepared Maryland Double Choc from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 180,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hobnobs_biscuits = await MenuItem.create({
    tenant: tenantId,
    name: "Hobnobs Biscuits",
    menuCode: "BIS-002",
    description: "Freshly prepared Hobnobs Biscuits from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 250,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mc_vitties_digestives_milk_choc = await MenuItem.create({
    tenant: tenantId,
    name: "Mc Vitties Digestives Milk Choc",
    menuCode: "BIS-003",
    description: "Freshly prepared Mc Vitties Digestives Milk Choc from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 250,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_bourbon_creams = await MenuItem.create({
    tenant: tenantId,
    name: "Bourbon Creams",
    menuCode: "BIS-004",
    description: "Freshly prepared Bourbon Creams from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 160,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_jammie_dodgers = await MenuItem.create({
    tenant: tenantId,
    name: "Jammie Dodgers",
    menuCode: "BIS-005",
    description: "Freshly prepared Jammie Dodgers from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 180,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_oreo_choc_brownie = await MenuItem.create({
    tenant: tenantId,
    name: "Oreo Choc Brownie",
    menuCode: "BIS-006",
    description: "Freshly prepared Oreo Choc Brownie from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 180,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mc_vities_digestives = await MenuItem.create({
    tenant: tenantId,
    name: "Mc Vities Digestives",
    menuCode: "BIS-007",
    description: "Freshly prepared Mc Vities Digestives from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 250,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mc_vities_fruit_shortcake = await MenuItem.create({
    tenant: tenantId,
    name: "Mc Vities Fruit Shortcake",
    menuCode: "BIS-008",
    description: "Freshly prepared Mc Vities Fruit Shortcake from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 229,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mcvities_milk_choc_digestives = await MenuItem.create({
    tenant: tenantId,
    name: "Mcvities Milk Choc Digestives",
    menuCode: "BIS-009",
    description: "Freshly prepared Mcvities Milk Choc Digestives from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 250,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_tunnocks_tea_cakes = await MenuItem.create({
    tenant: tenantId,
    name: "Tunnocks Tea Cakes",
    menuCode: "BIS-010",
    description: "Freshly prepared Tunnocks Tea Cakes from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 220,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_maryland_choc_chip = await MenuItem.create({
    tenant: tenantId,
    name: "Maryland Choc Chip",
    menuCode: "BIS-011",
    description: "Freshly prepared Maryland Choc Chip from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 180,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hobnobs_milk_choc = await MenuItem.create({
    tenant: tenantId,
    name: "Hobnobs Milk Choc",
    menuCode: "BIS-012",
    description: "Freshly prepared Hobnobs Milk Choc from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 250,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_elkes_malted_choc = await MenuItem.create({
    tenant: tenantId,
    name: "Elkes Malted Choc",
    menuCode: "BIS-013",
    description: "Freshly prepared Elkes Malted Choc from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 180,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 13,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_custard_cream_biscuits = await MenuItem.create({
    tenant: tenantId,
    name: "Custard Cream biscuits",
    menuCode: "BIS-014",
    description: "Freshly prepared Custard Cream biscuits from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 160,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 14,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_oreo_original = await MenuItem.create({
    tenant: tenantId,
    name: "Oreo Original",
    menuCode: "BIS-015",
    description: "Freshly prepared Oreo Original from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 180,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 15,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mc_vities_ginger_nuts = await MenuItem.create({
    tenant: tenantId,
    name: "Mc Vities Ginger Nuts",
    menuCode: "BIS-016",
    description: "Freshly prepared Mc Vities Ginger Nuts from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 180,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 16,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mc_vities_dark_chocolate = await MenuItem.create({
    tenant: tenantId,
    name: "Mc Vities Dark Chocolate",
    menuCode: "BIS-017",
    description: "Freshly prepared Mc Vities Dark Chocolate from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 250,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 17,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mcvities_digestives_white_choc = await MenuItem.create({
    tenant: tenantId,
    name: "Mcvities Digestives White Choc",
    menuCode: "BIS-018",
    description: "Freshly prepared Mcvities Digestives White Choc from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 250,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 18,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_foxs_viennese_milk_chocolate = await MenuItem.create({
    tenant: tenantId,
    name: "Fox's Viennese Milk Chocolate",
    menuCode: "BIS-019",
    description: "Freshly prepared Fox's Viennese Milk Chocolate from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 220,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 19,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mc_vities_classic_rich_tea = await MenuItem.create({
    tenant: tenantId,
    name: "Mc Vities Classic Rich Tea",
    menuCode: "BIS-020",
    description: "Freshly prepared Mc Vities Classic Rich Tea from our menu.",
    category: cat_biscuits_cookies._id,
    basePricePence: 200,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 20,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_pizza_burger = await MenuItem.create({
    tenant: tenantId,
    name: "Pizza Burger",
    menuCode: "BUR-001",
    description: "Juicy beef patty wrapped in soft pizza dough, topped with rich pizza sauce and melted bubbly cheese for the ultimate cheesy finish.",
    category: cat_burgers._id,
    basePricePence: 570,
    vatRate: 20,
    modifierGroups: [burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id],
    groupAssignments: assignGroups([burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_beef_burger = await MenuItem.create({
    tenant: tenantId,
    name: "Beef Burger",
    menuCode: "BUR-002",
    description: "Flame-grilled beef burger in a lightly toasted seeded bun, loaded with flavor.",
    category: cat_burgers._id,
    basePricePence: 490,
    vatRate: 20,
    modifierGroups: [burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id],
    groupAssignments: assignGroups([burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cheese_burger = await MenuItem.create({
    tenant: tenantId,
    name: "Cheese Burger",
    menuCode: "BUR-003",
    description: "Try our delicious Cheese Burger, available in various sizes. Perfect for any burger lover! Enjoy it from our ...",
    category: cat_burgers._id,
    basePricePence: 500,
    vatRate: 20,
    modifierGroups: [burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id],
    groupAssignments: assignGroups([burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_fillet_burger = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Fillet Burger",
    menuCode: "BUR-004",
    description: "Try our Chicken Fillet Burger, a juicy delight. Perfect for any meal!",
    category: cat_burgers._id,
    basePricePence: 530,
    vatRate: 20,
    modifierGroups: [burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id],
    groupAssignments: assignGroups([burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cheese_burger_and_egg = await MenuItem.create({
    tenant: tenantId,
    name: "Cheese Burger And Egg",
    menuCode: "BUR-005",
    description: "Grilled beef patty with melted cheese and fried egg, served in a soft seeded bun.",
    category: cat_burgers._id,
    basePricePence: 540,
    vatRate: 20,
    modifierGroups: [burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id],
    groupAssignments: assignGroups([burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_zinger_burger = await MenuItem.create({
    tenant: tenantId,
    name: "Zinger Burger",
    menuCode: "BUR-006",
    description: "Spicy zinger burger served in a soft, freshly toasted seeded bun.",
    category: cat_burgers._id,
    basePricePence: 540,
    vatRate: 20,
    modifierGroups: [burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id],
    groupAssignments: assignGroups([burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_tower_burger = await MenuItem.create({
    tenant: tenantId,
    name: "Tower Burger",
    menuCode: "BUR-007",
    description: "Crispy chicken fillet and golden hashbrown stacked inside a soft seeded bun.",
    category: cat_burgers._id,
    basePricePence: 560,
    vatRate: 20,
    modifierGroups: [burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id],
    groupAssignments: assignGroups([burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_combo_burger = await MenuItem.create({
    tenant: tenantId,
    name: "Combo Burger",
    menuCode: "BUR-008",
    description: "Juicy beef patty and crispy chicken fillet served in a soft seeded bun.",
    category: cat_burgers._id,
    basePricePence: 680,
    vatRate: 20,
    modifierGroups: [burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id],
    groupAssignments: assignGroups([burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_deluxe_burger = await MenuItem.create({
    tenant: tenantId,
    name: "Deluxe Burger",
    menuCode: "BUR-009",
    description: "Flamed grilled beef patty topped with juicy doner meat and two crispy onion rings.",
    category: cat_burgers._id,
    basePricePence: 600,
    vatRate: 20,
    modifierGroups: [burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id],
    groupAssignments: assignGroups([burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_loaded_burger = await MenuItem.create({
    tenant: tenantId,
    name: "Loaded Burger",
    menuCode: "BUR-010",
    description: "Beef patty layered with melted cheese, savory doner meat, and crispy fried onions, all inside a soft seeded bun.",
    category: cat_burgers._id,
    basePricePence: 630,
    vatRate: 20,
    modifierGroups: [burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id],
    groupAssignments: assignGroups([burgerCheeseGroup._id, burgerToppingsGroup._id, burgerSauceGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_buy_any_2x_7inch_pizza_get_1_free = await MenuItem.create({
    tenant: tenantId,
    name: "Buy Any 2x 7inch Pizza Get 1 Free",
    menuCode: "BUY-001",
    description: "Enjoy our special offer: Buy Any 2x 7inch Pizza Get 1 Free! Choose from delicious options Perfect for sharing! This deal is part of our Buy Any 2x Pizza Get 1 Free...",
    category: cat_buy_any_2x_pizza_get_1_free._id,
    basePricePence: 560,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_buy_any_2x_9inch_pizza_get_1_free = await MenuItem.create({
    tenant: tenantId,
    name: "Buy Any 2x 9inch Pizza Get 1 Free",
    menuCode: "BUY-002",
    description: "Enjoy your special offer: Buy Any 2x 9inch Pizza Get 1 Free! Choose from your favorites pizzas, and don't forget the dips! Perfect for sharing!",
    category: cat_buy_any_2x_pizza_get_1_free._id,
    basePricePence: 740,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cat_whiskas_salmon_can = await MenuItem.create({
    tenant: tenantId,
    name: "Cat Whiskas Salmon Can",
    menuCode: "CAT-001",
    description: "Freshly prepared Cat Whiskas Salmon Can from our menu.",
    category: cat_cat_food._id,
    basePricePence: 180,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_gocat_tuna_box = await MenuItem.create({
    tenant: tenantId,
    name: "Gocat Tuna Box",
    menuCode: "CAT-002",
    description: "Freshly prepared Gocat Tuna Box from our menu.",
    category: cat_cat_food._id,
    basePricePence: 190,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cat_whiskas_chicken_can = await MenuItem.create({
    tenant: tenantId,
    name: "Cat Whiskas Chicken Can",
    menuCode: "CAT-003",
    description: "Freshly prepared Cat Whiskas Chicken Can from our menu.",
    category: cat_cat_food._id,
    basePricePence: 180,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_gocat_chicken_box = await MenuItem.create({
    tenant: tenantId,
    name: "Gocat Chicken Box",
    menuCode: "CAT-004",
    description: "Freshly prepared Gocat Chicken Box from our menu.",
    category: cat_cat_food._id,
    basePricePence: 190,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_keema_chat = await MenuItem.create({
    tenant: tenantId,
    name: "Keema Chat",
    menuCode: "CHA-001",
    description: "A delicious curry-style minced meat dish cooked with fresh green peppers and tomatoes, bursting with bold flavors. Order now!",
    category: cat_chats._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_tikka_chat = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Tikka Chat",
    menuCode: "CHA-002",
    description: "A flavorful curry-style chicken tikka cooked with fresh green peppers and tomatoes, packed with bold, savory spices. Order now!",
    category: cat_chats._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_meat_chat = await MenuItem.create({
    tenant: tenantId,
    name: "Meat Chat",
    menuCode: "CHA-003",
    description: "A rich curry-style meat cooked with fresh green peppers and tomatoes, delivering bold, hearty flavors. Order now!",
    category: cat_chats._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_rogan_josh_chat = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Rogan Josh Chat",
    menuCode: "CHA-004",
    description: "Tender chicken cooked in a rich Rogan Josh curry with fresh green peppers and tomatoes, bursting with authentic, bold spices. Order now!",
    category: cat_chats._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_madras_chat = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Madras Chat",
    menuCode: "CHA-005",
    description: "Spicy chicken cooked in a classic Madras curry — full of bold, vibrant flavors. Order now!",
    category: cat_chats._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_korma_chat = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Korma Chat",
    menuCode: "CHA-006",
    description: "Tender chicken simmered in a creamy, mild korma sauce — rich, flavorful, and comforting. Order now!",
    category: cat_chats._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_bhuna_chat = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Bhuna Chat",
    menuCode: "CHA-007",
    description: "Succulent chicken cooked in a thick, spiced Bhuna sauce with tomatoes — rich, hearty, and full of flavor. Order now!",
    category: cat_chats._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_tikka_masala_chat = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Tikka Masala Chat",
    menuCode: "CHA-008",
    description: "Tender chicken Tikka simmered in a creamy, spiced masala sauce with fresh green peppers and tomatoes — a rich and flavorful classic. Order now!",
    category: cat_chats._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_dupliaza_chat = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Dupliaza Chat",
    menuCode: "CHA-009",
    description: "Juicy chicken cooked with plenty of onions, fresh green peppers, and tomatoes in a flavorful Dupliaza sauce — rich, tangy, and satisfying. Order now!",
    category: cat_chats._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_balti_chat = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Balti Chat",
    menuCode: "CHA-010",
    description: "Tender chicken simmered in a rich, spiced Balti sauce — full of bold flavors and perfect for any curry lover. Order now!",
    category: cat_chats._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_extras_pepper_mint = await MenuItem.create({
    tenant: tenantId,
    name: "Extras Pepper Mint",
    menuCode: "CHE-001",
    description: "Freshly prepared Extras Pepper Mint from our menu.",
    category: cat_chewing_gum_mints._id,
    basePricePence: 100,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_extras_cool_breeze = await MenuItem.create({
    tenant: tenantId,
    name: "Extras Cool Breeze",
    menuCode: "CHE-002",
    description: "Freshly prepared Extras Cool Breeze from our menu.",
    category: cat_chewing_gum_mints._id,
    basePricePence: 100,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hubba_bubba_original = await MenuItem.create({
    tenant: tenantId,
    name: "Hubba Bubba Original",
    menuCode: "CHE-003",
    description: "Freshly prepared Hubba Bubba Original from our menu.",
    category: cat_chewing_gum_mints._id,
    basePricePence: 120,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hubba_bubba_apple = await MenuItem.create({
    tenant: tenantId,
    name: "Hubba Bubba Apple",
    menuCode: "CHE-004",
    description: "Freshly prepared Hubba Bubba Apple from our menu.",
    category: cat_chewing_gum_mints._id,
    basePricePence: 120,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_extra_bubblegum_46_pcs = await MenuItem.create({
    tenant: tenantId,
    name: "Extra Bubblegum 46 Pcs",
    menuCode: "CHE-005",
    description: "Freshly prepared Extra Bubblegum 46 Pcs from our menu.",
    category: cat_chewing_gum_mints._id,
    basePricePence: 320,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_extra_peppermint_46_pcs = await MenuItem.create({
    tenant: tenantId,
    name: "Extra Peppermint 46 Pcs",
    menuCode: "CHE-006",
    description: "Freshly prepared Extra Peppermint 46 Pcs from our menu.",
    category: cat_chewing_gum_mints._id,
    basePricePence: 320,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_extra_watermelon = await MenuItem.create({
    tenant: tenantId,
    name: "Extra Watermelon",
    menuCode: "CHE-007",
    description: "Freshly prepared Extra Watermelon from our menu.",
    category: cat_chewing_gum_mints._id,
    basePricePence: 100,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_extras_strawberry = await MenuItem.create({
    tenant: tenantId,
    name: "Extras Strawberry",
    menuCode: "CHE-008",
    description: "Freshly prepared Extras Strawberry from our menu.",
    category: cat_chewing_gum_mints._id,
    basePricePence: 100,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hubba_bubba_strawberry = await MenuItem.create({
    tenant: tenantId,
    name: "Hubba Bubba Strawberry",
    menuCode: "CHE-009",
    description: "Freshly prepared Hubba Bubba Strawberry from our menu.",
    category: cat_chewing_gum_mints._id,
    basePricePence: 120,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_airwaves_menthol_eucalyptus_46_pcs = await MenuItem.create({
    tenant: tenantId,
    name: "Airwaves Menthol & Eucalyptus 46 Pcs",
    menuCode: "CHE-010",
    description: "Freshly prepared Airwaves Menthol & Eucalyptus 46 Pcs from our menu.",
    category: cat_chewing_gum_mints._id,
    basePricePence: 320,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_extra_spearmint_46_pcs = await MenuItem.create({
    tenant: tenantId,
    name: "Extra Spearmint 46 Pcs",
    menuCode: "CHE-011",
    description: "Freshly prepared Extra Spearmint 46 Pcs from our menu.",
    category: cat_chewing_gum_mints._id,
    basePricePence: 320,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_extra_strawberry_46_pcs = await MenuItem.create({
    tenant: tenantId,
    name: "Extra Strawberry 46 pcs",
    menuCode: "CHE-012",
    description: "Freshly prepared Extra Strawberry 46 pcs from our menu.",
    category: cat_chewing_gum_mints._id,
    basePricePence: 320,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_paramount_ks_20s = await MenuItem.create({
    tenant: tenantId,
    name: "Paramount KS 20's",
    menuCode: "CIG-001",
    description: "Freshly prepared Paramount KS 20's from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1650,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_players_red_kingsize = await MenuItem.create({
    tenant: tenantId,
    name: "20 Players Red Kingsize",
    menuCode: "CIG-002",
    description: "Freshly prepared 20 Players Red Kingsize from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1889,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_benson_gold = await MenuItem.create({
    tenant: tenantId,
    name: "20 Benson Gold",
    menuCode: "CIG-003",
    description: "Freshly prepared 20 Benson Gold from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 2190,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_benson_dual = await MenuItem.create({
    tenant: tenantId,
    name: "20 Benson Dual",
    menuCode: "CIG-004",
    description: "Freshly prepared 20 Benson Dual from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 2090,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_benson_blue_sk = await MenuItem.create({
    tenant: tenantId,
    name: "20 Benson Blue Sk",
    menuCode: "CIG-005",
    description: "Freshly prepared 20 Benson Blue Sk from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1889,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_benson_blue_dual = await MenuItem.create({
    tenant: tenantId,
    name: "20 Benson Blue Dual",
    menuCode: "CIG-006",
    description: "Freshly prepared 20 Benson Blue Dual from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1889,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_sovereign_blue_sk = await MenuItem.create({
    tenant: tenantId,
    name: "Sovereign Blue Sk",
    menuCode: "CIG-007",
    description: "Freshly prepared Sovereign Blue Sk from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1839,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_lamburt_and_butler_silver = await MenuItem.create({
    tenant: tenantId,
    name: "20 Lamburt And Butler Silver",
    menuCode: "CIG-008",
    description: "Freshly prepared 20 Lamburt And Butler Silver from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1970,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_lambert_blue = await MenuItem.create({
    tenant: tenantId,
    name: "20 Lambert Blue",
    menuCode: "CIG-009",
    description: "Freshly prepared 20 Lambert Blue from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1889,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_pallmall_red_flow_sk = await MenuItem.create({
    tenant: tenantId,
    name: "20 Pallmall Red Flow Sk",
    menuCode: "CIG-010",
    description: "Freshly prepared 20 Pallmall Red Flow Sk from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1889,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_pall_mail_flow_blue = await MenuItem.create({
    tenant: tenantId,
    name: "20 Pall Mail Flow Blue",
    menuCode: "CIG-011",
    description: "Freshly prepared 20 Pall Mail Flow Blue from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1889,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_marlboro_red = await MenuItem.create({
    tenant: tenantId,
    name: "20 Marlboro Red",
    menuCode: "CIG-012",
    description: "Freshly prepared 20 Marlboro Red from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 2090,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_jps_real_blue = await MenuItem.create({
    tenant: tenantId,
    name: "20 Jps Real Blue",
    menuCode: "CIG-013",
    description: "Freshly prepared 20 Jps Real Blue from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1989,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 13,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_windsor_blue = await MenuItem.create({
    tenant: tenantId,
    name: "20 Windsor Blue",
    menuCode: "CIG-014",
    description: "Freshly prepared 20 Windsor Blue from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1989,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 14,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_silk_cut_purple = await MenuItem.create({
    tenant: tenantId,
    name: "20 Silk Cut Purple",
    menuCode: "CIG-015",
    description: "Freshly prepared 20 Silk Cut Purple from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 2190,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 15,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_richmond = await MenuItem.create({
    tenant: tenantId,
    name: "20 Richmond",
    menuCode: "CIG-016",
    description: "Freshly prepared 20 Richmond from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1889,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 16,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_richmond_green_superkings = await MenuItem.create({
    tenant: tenantId,
    name: "20 Richmond Green Superkings",
    menuCode: "CIG-017",
    description: "Freshly prepared 20 Richmond Green Superkings from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1889,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 17,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_carlton_red_ks = await MenuItem.create({
    tenant: tenantId,
    name: "Carlton Red Ks",
    menuCode: "CIG-018",
    description: "Freshly prepared Carlton Red Ks from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1850,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 18,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_sterling_red_ks = await MenuItem.create({
    tenant: tenantId,
    name: "20 Sterling Red Ks",
    menuCode: "CIG-019",
    description: "Freshly prepared 20 Sterling Red Ks from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1989,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 19,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_sterling_green_superkings = await MenuItem.create({
    tenant: tenantId,
    name: "20 Sterling Green Superkings",
    menuCode: "CIG-020",
    description: "Freshly prepared 20 Sterling Green Superkings from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1989,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 20,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_players_green_sk = await MenuItem.create({
    tenant: tenantId,
    name: "20 Players Green Sk",
    menuCode: "CIG-021",
    description: "Recommeded closest menthol ciggarette",
    category: cat_cigarettes._id,
    basePricePence: 1889,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 21,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_players_red_superkings = await MenuItem.create({
    tenant: tenantId,
    name: "20 Players Red Superkings",
    menuCode: "CIG-022",
    description: "Freshly prepared 20 Players Red Superkings from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1889,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 22,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_benson_silver = await MenuItem.create({
    tenant: tenantId,
    name: "20 Benson Silver",
    menuCode: "CIG-023",
    description: "Freshly prepared 20 Benson Silver from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 2090,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 23,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_benson_blue_ks = await MenuItem.create({
    tenant: tenantId,
    name: "20 Benson Blue Ks",
    menuCode: "CIG-024",
    description: "Freshly prepared 20 Benson Blue Ks from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1889,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 24,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_benson_sky_blue = await MenuItem.create({
    tenant: tenantId,
    name: "20 Benson Sky Blue",
    menuCode: "CIG-025",
    description: "Freshly prepared 20 Benson Sky Blue from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1889,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 25,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_sovereign_blue = await MenuItem.create({
    tenant: tenantId,
    name: "20 Sovereign Blue",
    menuCode: "CIG-026",
    description: "Freshly prepared 20 Sovereign Blue from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1839,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 26,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_sovereign_blue_dual = await MenuItem.create({
    tenant: tenantId,
    name: "Sovereign Blue Dual",
    menuCode: "CIG-027",
    description: "Freshly prepared Sovereign Blue Dual from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1839,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 27,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_lamburt_and_butler_green = await MenuItem.create({
    tenant: tenantId,
    name: "20 Lamburt And Butler Green",
    menuCode: "CIG-028",
    description: "Freshly prepared 20 Lamburt And Butler Green from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1970,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 28,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_embassy_number_1 = await MenuItem.create({
    tenant: tenantId,
    name: "20 Embassy Number 1",
    menuCode: "CIG-029",
    description: "Freshly prepared 20 Embassy Number 1 from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1860,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 29,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_pall_mall_red_flow = await MenuItem.create({
    tenant: tenantId,
    name: "20 Pall Mall Red Flow",
    menuCode: "CIG-030",
    description: "Freshly prepared 20 Pall Mall Red Flow from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1889,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 30,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_marlboro_touch = await MenuItem.create({
    tenant: tenantId,
    name: "20 Marlboro Touch",
    menuCode: "CIG-031",
    description: "Freshly prepared 20 Marlboro Touch from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1960,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 31,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_marlboro_gold = await MenuItem.create({
    tenant: tenantId,
    name: "20 Marlboro Gold",
    menuCode: "CIG-032",
    description: "Freshly prepared 20 Marlboro Gold from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 2090,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 32,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_jps_superkings_blue = await MenuItem.create({
    tenant: tenantId,
    name: "20 Jps Superkings Blue",
    menuCode: "CIG-033",
    description: "Freshly prepared 20 Jps Superkings Blue from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1989,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 33,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_windsor_blue_green_sk = await MenuItem.create({
    tenant: tenantId,
    name: "Windsor Blue Green Sk",
    menuCode: "CIG-034",
    description: "Freshly prepared Windsor Blue Green Sk from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1989,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 34,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_silk_cut_silver = await MenuItem.create({
    tenant: tenantId,
    name: "20 Silk Cut Silver",
    menuCode: "CIG-035",
    description: "Freshly prepared 20 Silk Cut Silver from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 2190,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 35,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_richmond_superkings = await MenuItem.create({
    tenant: tenantId,
    name: "20 Richmond Superkings",
    menuCode: "CIG-036",
    description: "Freshly prepared 20 Richmond Superkings from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1889,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 36,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_richmond_compact = await MenuItem.create({
    tenant: tenantId,
    name: "20 Richmond Compact",
    menuCode: "CIG-037",
    description: "Freshly prepared 20 Richmond Compact from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1789,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 37,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_carlton_red_sk = await MenuItem.create({
    tenant: tenantId,
    name: "Carlton Red Sk",
    menuCode: "CIG-038",
    description: "Freshly prepared Carlton Red Sk from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1850,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 38,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_sterling_superkings = await MenuItem.create({
    tenant: tenantId,
    name: "20 Sterling Superkings",
    menuCode: "CIG-039",
    description: "Freshly prepared 20 Sterling Superkings from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1989,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 39,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_sterling_dual = await MenuItem.create({
    tenant: tenantId,
    name: "20 Sterling Dual",
    menuCode: "CIG-040",
    description: "Freshly prepared 20 Sterling Dual from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1989,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 40,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_royals = await MenuItem.create({
    tenant: tenantId,
    name: "20 Royals",
    menuCode: "CIG-041",
    description: "Freshly prepared 20 Royals from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1989,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 41,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_mayfair_sky_blue_ks = await MenuItem.create({
    tenant: tenantId,
    name: "20 Mayfair Sky Blue Ks",
    menuCode: "CIG-042",
    description: "Freshly prepared 20 Mayfair Sky Blue Ks from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 2039,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 42,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chesterfield_red_sk = await MenuItem.create({
    tenant: tenantId,
    name: "Chesterfield Red Sk",
    menuCode: "CIG-043",
    description: "Freshly prepared Chesterfield Red Sk from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1689,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 43,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_rothmans_blue_sk_20 = await MenuItem.create({
    tenant: tenantId,
    name: "Rothmans Blue Sk 20",
    menuCode: "CIG-044",
    description: "Freshly prepared Rothmans Blue Sk 20 from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1889,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 44,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_20_mayfair_blue_ks = await MenuItem.create({
    tenant: tenantId,
    name: "20 Mayfair Blue Ks",
    menuCode: "CIG-045",
    description: "Freshly prepared 20 Mayfair Blue Ks from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 2039,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 45,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chesterfield_red_ks = await MenuItem.create({
    tenant: tenantId,
    name: "Chesterfield Red Ks",
    menuCode: "CIG-046",
    description: "Freshly prepared Chesterfield Red Ks from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1689,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 46,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_rothmans_blue_ks_20 = await MenuItem.create({
    tenant: tenantId,
    name: "Rothmans Blue Ks 20",
    menuCode: "CIG-047",
    description: "Freshly prepared Rothmans Blue Ks 20 from our menu.",
    category: cat_cigarettes._id,
    basePricePence: 1889,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 47,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_tikka_masala_loaded_fries = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Tikka Masala Loaded Fries",
    menuCode: "CUR-001",
    description: "Any Choice of Chicken Curry",
    category: cat_curry_loaded_fries._id,
    basePricePence: 699,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_rogan_josh_loaded_fries = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Rogan Josh Loaded Fries",
    menuCode: "CUR-002",
    description: "Any Choice of Chicken Curry",
    category: cat_curry_loaded_fries._id,
    basePricePence: 699,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_madras_loaded_fries = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Madras Loaded Fries",
    menuCode: "CUR-003",
    description: "Any Choice of Chicken Curry",
    category: cat_curry_loaded_fries._id,
    basePricePence: 699,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_jalfrezi_loaded_fries = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Jalfrezi Loaded Fries",
    menuCode: "CUR-004",
    description: "Any Choice of Chicken Curry",
    category: cat_curry_loaded_fries._id,
    basePricePence: 699,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_korma_loaded_fries = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Korma Loaded Fries",
    menuCode: "CUR-005",
    description: "Any Choice of Chicken Curry",
    category: cat_curry_loaded_fries._id,
    basePricePence: 699,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_balti_loaded_fries = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Balti Loaded Fries",
    menuCode: "CUR-006",
    description: "Any Choice of Chicken Curry",
    category: cat_curry_loaded_fries._id,
    basePricePence: 699,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_bhuna_loaded_fries = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Bhuna Loaded Fries",
    menuCode: "CUR-007",
    description: "Any Choice of Chicken Curry",
    category: cat_curry_loaded_fries._id,
    basePricePence: 699,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_vindaloo_loaded_fries = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Vindaloo Loaded Fries",
    menuCode: "CUR-008",
    description: "Any Choice of Chicken Curry",
    category: cat_curry_loaded_fries._id,
    basePricePence: 699,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_curry_deal = await MenuItem.create({
    tenant: tenantId,
    name: "Curry Deal",
    menuCode: "CUR-009",
    description: "🍛 Curry Deal ...",
    category: cat_curry_offers._id,
    basePricePence: 1889,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_peanut_butter_stack = await MenuItem.create({
    tenant: tenantId,
    name: "Peanut Butter Stack",
    menuCode: "DES-001",
    description: "Peanut Butter Stack",
    category: cat_desserts_cakes._id,
    basePricePence: 420,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_matilda_cake = await MenuItem.create({
    tenant: tenantId,
    name: "Matilda Cake",
    menuCode: "DES-002",
    description: "Matilda Cake",
    category: cat_desserts_cakes._id,
    basePricePence: 590,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_concrete_cake = await MenuItem.create({
    tenant: tenantId,
    name: "Concrete Cake",
    menuCode: "DES-003",
    description: "Concrete Cake",
    category: cat_desserts_cakes._id,
    basePricePence: 420,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_white_sprinkle_cake = await MenuItem.create({
    tenant: tenantId,
    name: "White Sprinkle Cake",
    menuCode: "DES-004",
    description: "White Sprinkle Cake",
    category: cat_desserts_cakes._id,
    basePricePence: 420,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_dog_bakers_beef_adult = await MenuItem.create({
    tenant: tenantId,
    name: "Dog Bakers Beef Adult",
    menuCode: "DOG-001",
    description: "Freshly prepared Dog Bakers Beef Adult from our menu.",
    category: cat_dog_food._id,
    basePricePence: 450,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_dog_pedigree_beef_can = await MenuItem.create({
    tenant: tenantId,
    name: "Dog Pedigree Beef Can",
    menuCode: "DOG-002",
    description: "Freshly prepared Dog Pedigree Beef Can from our menu.",
    category: cat_dog_food._id,
    basePricePence: 180,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_dog_butchers_tripe_mix = await MenuItem.create({
    tenant: tenantId,
    name: "Dog Butchers Tripe Mix",
    menuCode: "DOG-003",
    description: "Freshly prepared Dog Butchers Tripe Mix from our menu.",
    category: cat_dog_food._id,
    basePricePence: 160,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_dog_bakers_chicken = await MenuItem.create({
    tenant: tenantId,
    name: "Dog Bakers Chicken",
    menuCode: "DOG-004",
    description: "Freshly prepared Dog Bakers Chicken from our menu.",
    category: cat_dog_food._id,
    basePricePence: 450,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_dog_pedigree_chicken_can = await MenuItem.create({
    tenant: tenantId,
    name: "Dog Pedigree Chicken Can",
    menuCode: "DOG-005",
    description: "Freshly prepared Dog Pedigree Chicken Can from our menu.",
    category: cat_dog_food._id,
    basePricePence: 180,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_dog_binio_orignal = await MenuItem.create({
    tenant: tenantId,
    name: "Dog Binio Orignal",
    menuCode: "DOG-006",
    description: "Freshly prepared Dog Binio Orignal from our menu.",
    category: cat_dog_food._id,
    basePricePence: 320,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_warheads_blue_raspberry_sour_soda = await MenuItem.create({
    tenant: tenantId,
    name: "Warheads Blue Raspberry Sour Soda",
    menuCode: "DRI-001",
    description: "Freshly prepared Warheads Blue Raspberry Sour Soda from our menu.",
    category: cat_drinks._id,
    basePricePence: 229,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_fanta_pineapple_355_mi = await MenuItem.create({
    tenant: tenantId,
    name: "Fanta Pineapple 355 MI",
    menuCode: "DRI-002",
    description: "Freshly prepared Fanta Pineapple 355 MI from our menu.",
    category: cat_drinks._id,
    basePricePence: 229,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_fanta_berry_355ml = await MenuItem.create({
    tenant: tenantId,
    name: "Fanta Berry 355ml",
    menuCode: "DRI-003",
    description: "Freshly prepared Fanta Berry 355ml from our menu.",
    category: cat_drinks._id,
    basePricePence: 229,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_fanta_grape_355_mi = await MenuItem.create({
    tenant: tenantId,
    name: "Fanta Grape 355 MI",
    menuCode: "DRI-004",
    description: "Freshly prepared Fanta Grape 355 MI from our menu.",
    category: cat_drinks._id,
    basePricePence: 229,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_fanta_strawberry_355ml = await MenuItem.create({
    tenant: tenantId,
    name: "Fanta Strawberry 355ml",
    menuCode: "DRI-005",
    description: "Freshly prepared Fanta Strawberry 355ml from our menu.",
    category: cat_drinks._id,
    basePricePence: 229,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_dr_pepper_blackberry = await MenuItem.create({
    tenant: tenantId,
    name: "Dr Pepper Blackberry",
    menuCode: "DRI-006",
    description: "Freshly prepared Dr Pepper Blackberry from our menu.",
    category: cat_drinks._id,
    basePricePence: 229,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_calypso_ocean_blue_lemonade = await MenuItem.create({
    tenant: tenantId,
    name: "Calypso Ocean Blue Lemonade",
    menuCode: "DRI-007",
    description: "Freshly prepared Calypso Ocean Blue Lemonade from our menu.",
    category: cat_drinks._id,
    basePricePence: 320,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_calypso_strawberry_lemonade = await MenuItem.create({
    tenant: tenantId,
    name: "Calypso Strawberry Lemonade",
    menuCode: "DRI-008",
    description: "Freshly prepared Calypso Strawberry Lemonade from our menu.",
    category: cat_drinks._id,
    basePricePence: 320,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_coke_cherry_float = await MenuItem.create({
    tenant: tenantId,
    name: "Coke Cherry Float",
    menuCode: "DRI-009",
    description: "Freshly prepared Coke Cherry Float from our menu.",
    category: cat_drinks._id,
    basePricePence: 160,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_fruit_shoot_orange = await MenuItem.create({
    tenant: tenantId,
    name: "Fruit Shoot Orange",
    menuCode: "DRI-010",
    description: "Freshly prepared Fruit Shoot Orange from our menu.",
    category: cat_drinks._id,
    basePricePence: 130,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_fruit_shoot_summer_fruits = await MenuItem.create({
    tenant: tenantId,
    name: "Fruit Shoot Summer Fruits",
    menuCode: "DRI-011",
    description: "Freshly prepared Fruit Shoot Summer Fruits from our menu.",
    category: cat_drinks._id,
    basePricePence: 130,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_fruit_shoot_blackcurrant = await MenuItem.create({
    tenant: tenantId,
    name: "Fruit Shoot Blackcurrant",
    menuCode: "DRI-012",
    description: "Freshly prepared Fruit Shoot Blackcurrant from our menu.",
    category: cat_drinks._id,
    basePricePence: 130,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_rubicon_guava_can = await MenuItem.create({
    tenant: tenantId,
    name: "Rubicon Guava Can",
    menuCode: "DRI-013",
    description: "Freshly prepared Rubicon Guava Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 130,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 13,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_rubicon_mango_can = await MenuItem.create({
    tenant: tenantId,
    name: "Rubicon Mango Can",
    menuCode: "DRI-014",
    description: "Freshly prepared Rubicon Mango Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 140,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 14,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_fanta_orange_can = await MenuItem.create({
    tenant: tenantId,
    name: "Fanta Orange Can",
    menuCode: "DRI-015",
    description: "Freshly prepared Fanta Orange Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 140,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 15,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_rio_can = await MenuItem.create({
    tenant: tenantId,
    name: "Rio Can",
    menuCode: "DRI-016",
    description: "Freshly prepared Rio Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 140,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 16,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_coke_vanilla_355_ml = await MenuItem.create({
    tenant: tenantId,
    name: "Coke Vanilla 355 Ml",
    menuCode: "DRI-017",
    description: "Freshly prepared Coke Vanilla 355 Ml from our menu.",
    category: cat_drinks._id,
    basePricePence: 229,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 17,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_ribena_strawberry_carton = await MenuItem.create({
    tenant: tenantId,
    name: "Ribena Strawberry Carton",
    menuCode: "DRI-018",
    description: "Freshly prepared Ribena Strawberry Carton from our menu.",
    category: cat_drinks._id,
    basePricePence: 140,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 18,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_irn_bru_can = await MenuItem.create({
    tenant: tenantId,
    name: "Irn Bru Can",
    menuCode: "DRI-019",
    description: "Freshly prepared Irn Bru Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 140,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 19,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_tango_orange_can = await MenuItem.create({
    tenant: tenantId,
    name: "Tango Orange Can",
    menuCode: "DRI-020",
    description: "Freshly prepared Tango Orange Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 140,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 20,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_lucozade_orignal_can = await MenuItem.create({
    tenant: tenantId,
    name: "Lucozade Orignal Can",
    menuCode: "DRI-021",
    description: "Freshly prepared Lucozade Orignal Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 21,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_coke_can = await MenuItem.create({
    tenant: tenantId,
    name: "Coke Can",
    menuCode: "DRI-022",
    description: "Freshly prepared Coke Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 22,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_pepsi_can = await MenuItem.create({
    tenant: tenantId,
    name: "Pepsi Can",
    menuCode: "DRI-023",
    description: "Freshly prepared Pepsi Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 23,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_pepsi_max_can = await MenuItem.create({
    tenant: tenantId,
    name: "Pepsi Max Can",
    menuCode: "DRI-024",
    description: "Freshly prepared Pepsi Max Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 24,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_1ltr_rubicon_mango = await MenuItem.create({
    tenant: tenantId,
    name: "1ltr Rubicon Mango",
    menuCode: "DRI-025",
    description: "Freshly prepared 1ltr Rubicon Mango from our menu.",
    category: cat_drinks._id,
    basePricePence: 260,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 25,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_1ltr_ribena_juice = await MenuItem.create({
    tenant: tenantId,
    name: "1ltr Ribena Juice",
    menuCode: "DRI-026",
    description: "Freshly prepared 1ltr Ribena Juice from our menu.",
    category: cat_drinks._id,
    basePricePence: 260,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 26,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_fanta_lemon_can = await MenuItem.create({
    tenant: tenantId,
    name: "Fanta Lemon Can",
    menuCode: "DRI-027",
    description: "Freshly prepared Fanta Lemon Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 130,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 27,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_diet_coke_can = await MenuItem.create({
    tenant: tenantId,
    name: "Diet Coke Can",
    menuCode: "DRI-028",
    description: "Freshly prepared Diet Coke Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 28,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_fanta_fruit_twist_can = await MenuItem.create({
    tenant: tenantId,
    name: "Fanta Fruit Twist Can",
    menuCode: "DRI-029",
    description: "Freshly prepared Fanta Fruit Twist Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 140,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 29,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_sprite_can = await MenuItem.create({
    tenant: tenantId,
    name: "Sprite Can",
    menuCode: "DRI-030",
    description: "Freshly prepared Sprite Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 140,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 30,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_ribena_blackcurrant_carton = await MenuItem.create({
    tenant: tenantId,
    name: "Ribena Blackcurrant Carton",
    menuCode: "DRI-031",
    description: "Freshly prepared Ribena Blackcurrant Carton from our menu.",
    category: cat_drinks._id,
    basePricePence: 140,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 31,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_vimto_can = await MenuItem.create({
    tenant: tenantId,
    name: "Vimto Can",
    menuCode: "DRI-032",
    description: "Freshly prepared Vimto Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 140,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 32,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_coke_zero_can = await MenuItem.create({
    tenant: tenantId,
    name: "Coke Zero Can",
    menuCode: "DRI-033",
    description: "Freshly prepared Coke Zero Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 140,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 33,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_tango_apple_can = await MenuItem.create({
    tenant: tenantId,
    name: "Tango Apple Can",
    menuCode: "DRI-034",
    description: "Freshly prepared Tango Apple Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 140,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 34,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_lucozade_orange_can = await MenuItem.create({
    tenant: tenantId,
    name: "Lucozade Orange Can",
    menuCode: "DRI-035",
    description: "Freshly prepared Lucozade Orange Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 35,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_coke_cherry_can = await MenuItem.create({
    tenant: tenantId,
    name: "Coke Cherry Can",
    menuCode: "DRI-036",
    description: "Freshly prepared Coke Cherry Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 36,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_dr_pepper_can = await MenuItem.create({
    tenant: tenantId,
    name: "Dr Pepper Can",
    menuCode: "DRI-037",
    description: "Freshly prepared Dr Pepper Can from our menu.",
    category: cat_drinks._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 37,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_1ltr_orange_juice = await MenuItem.create({
    tenant: tenantId,
    name: "1ltr Orange Juice",
    menuCode: "DRI-038",
    description: "Freshly prepared 1ltr Orange Juice from our menu.",
    category: cat_drinks._id,
    basePricePence: 290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 38,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_1ltr_rubicon_guava = await MenuItem.create({
    tenant: tenantId,
    name: "1ltr Rubicon Guava",
    menuCode: "DRI-039",
    description: "Freshly prepared 1ltr Rubicon Guava from our menu.",
    category: cat_drinks._id,
    basePricePence: 260,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 39,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_500ml_volvic_strawberry = await MenuItem.create({
    tenant: tenantId,
    name: "500ml Volvic Strawberry",
    menuCode: "DRI-040",
    description: "Freshly prepared 500ml Volvic Strawberry from our menu.",
    category: cat_drinks._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 40,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_chips = await MenuItem.create({
    tenant: tenantId,
    name: "Small Chips",
    menuCode: "EXT-001",
    description: "Golden, crispy chips cooked to perfection — a timeless favorite.",
    category: cat_extras._id,
    basePricePence: 290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_chips = await MenuItem.create({
    tenant: tenantId,
    name: "Large Chips",
    menuCode: "EXT-002",
    description: "Golden, crispy chips cooked to perfection — a timeless favorite.",
    category: cat_extras._id,
    basePricePence: 380,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_chips_and_cheese = await MenuItem.create({
    tenant: tenantId,
    name: "Small Chips And Cheese",
    menuCode: "EXT-003",
    description: "Crispy golden chips topped with melted cheese — a classic comfort combo.",
    category: cat_extras._id,
    basePricePence: 390,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_chips_and_cheese = await MenuItem.create({
    tenant: tenantId,
    name: "Large Chips And Cheese",
    menuCode: "EXT-004",
    description: "Crispy golden chips topped with melted cheese — a classic comfort combo.",
    category: cat_extras._id,
    basePricePence: 490,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chip_bap = await MenuItem.create({
    tenant: tenantId,
    name: "Chip Bap",
    menuCode: "EXT-005",
    description: "Golden crispy chips packed inside a toasted, soft seeded bun — a warm, satisfying treat.",
    category: cat_extras._id,
    basePricePence: 360,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_chicken_popcorn_and_chips = await MenuItem.create({
    tenant: tenantId,
    name: "Small Chicken Popcorn And Chips",
    menuCode: "EXT-006",
    description: "Bite-sized, crispy chicken popcorn served with golden, crunchy chips — the perfect snack combo.",
    category: cat_extras._id,
    basePricePence: 600,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_chicken_popcorn_and_chips = await MenuItem.create({
    tenant: tenantId,
    name: "Large Chicken Popcorn And Chips",
    menuCode: "EXT-007",
    description: "Bite-sized, crispy chicken popcorn served with golden, crunchy chips — the perfect snack combo.",
    category: cat_extras._id,
    basePricePence: 770,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_chicken_popcorn = await MenuItem.create({
    tenant: tenantId,
    name: "Small Chicken Popcorn",
    menuCode: "EXT-008",
    description: "A generous serving of crispy, bite-sized chicken popcorn — perfect for sharing or snacking.",
    category: cat_extras._id,
    basePricePence: 520,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_chicken_popcorn = await MenuItem.create({
    tenant: tenantId,
    name: "Large Chicken Popcorn",
    menuCode: "EXT-009",
    description: "A generous serving of crispy, bite-sized chicken popcorn — perfect for sharing or snacking.",
    category: cat_extras._id,
    basePricePence: 640,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_portion_chicken_doner = await MenuItem.create({
    tenant: tenantId,
    name: "Small Portion Chicken Doner",
    menuCode: "EXT-010",
    description: "Tender, seasoned chicken, thinly sliced and served with fresh toppings and a choice of sauces. A classic favorite made unforgettable.",
    category: cat_extras._id,
    basePricePence: 520,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_portion_chicken_doner = await MenuItem.create({
    tenant: tenantId,
    name: "Large Portion Chicken Doner",
    menuCode: "EXT-011",
    description: "Tender, seasoned chicken, thinly sliced and served with fresh toppings and a choice of sauces. A classic favorite made unforgettable.",
    category: cat_extras._id,
    basePricePence: 640,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_portion_doner_meat = await MenuItem.create({
    tenant: tenantId,
    name: "Small Portion Doner Meat",
    menuCode: "EXT-012",
    description: "Savory, tender doner meat—perfectly spiced and full of flavor.",
    category: cat_extras._id,
    basePricePence: 520,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_portion_doner_meat = await MenuItem.create({
    tenant: tenantId,
    name: "Large Portion Doner Meat",
    menuCode: "EXT-013",
    description: "Savory, tender doner meat—perfectly spiced and full of flavor.",
    category: cat_extras._id,
    basePricePence: 640,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 13,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_doner_meat_and_chips = await MenuItem.create({
    tenant: tenantId,
    name: "Small Doner Meat And Chips",
    menuCode: "EXT-014",
    description: "Juicy doner meat served with golden, crispy chips—an irresistible combo.",
    category: cat_extras._id,
    basePricePence: 590,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 14,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_doner_meat_and_chips = await MenuItem.create({
    tenant: tenantId,
    name: "Large Doner Meat And Chips",
    menuCode: "EXT-015",
    description: "Juicy doner meat served with golden, crispy chips—an irresistible combo.",
    category: cat_extras._id,
    basePricePence: 770,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 15,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_chicken_doner_and_chips = await MenuItem.create({
    tenant: tenantId,
    name: "Small Chicken Doner And Chips",
    menuCode: "EXT-016",
    description: "Flavor-packed chicken doner and crunchy chips for a hearty, tasty meal.",
    category: cat_extras._id,
    basePricePence: 590,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 16,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_chicken_doner_and_chips = await MenuItem.create({
    tenant: tenantId,
    name: "Large Chicken Doner And Chips",
    menuCode: "EXT-017",
    description: "Flavor-packed chicken doner and crunchy chips for a hearty, tasty meal.",
    category: cat_extras._id,
    basePricePence: 770,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 17,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_mixed_doner_meat_and_chips = await MenuItem.create({
    tenant: tenantId,
    name: "Large Mixed Doner Meat And Chips",
    menuCode: "EXT-018",
    description: "A flavorful mix of juicy chicken doner and tender doner meat, served with golden, crispy chips.",
    category: cat_extras._id,
    basePricePence: 819,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 18,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_6pcs_small_chicken_nuggets_and_chips = await MenuItem.create({
    tenant: tenantId,
    name: "6pcs Small Chicken Nuggets And Chips",
    menuCode: "EXT-019",
    description: "Golden, crispy chicken nuggets served with a side of crunchy, golden chips — a",
    category: cat_extras._id,
    basePricePence: 770,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 19,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_10pcs_large_chicken_nuggets_and_chips = await MenuItem.create({
    tenant: tenantId,
    name: "10pcs Large Chicken Nuggets And Chips",
    menuCode: "EXT-020",
    description: "Golden, crispy chicken nuggets served with a side of crunchy, golden chips — a",
    category: cat_extras._id,
    basePricePence: 969,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 20,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_nan = await MenuItem.create({
    tenant: tenantId,
    name: "Nan",
    menuCode: "FRE-001",
    description: "Soft, fluffy flatbread baked to perfection—ideal for dipping or pairing with your favorite dishes. Order ...",
    category: cat_fresh_nan_breads._id,
    basePricePence: 300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cheese_nan = await MenuItem.create({
    tenant: tenantId,
    name: "Cheese Nan",
    menuCode: "FRE-002",
    description: "Warm, soft flatbread stuffed with melted cheese — a gooey, flavorful treat perfect with any meal. Order now!",
    category: cat_fresh_nan_breads._id,
    basePricePence: 420,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_garlic_nan = await MenuItem.create({
    tenant: tenantId,
    name: "Garlic Nan",
    menuCode: "FRE-003",
    description: "Soft, fluffy flatbread brushed with fragrant garlic butter — perfect as a side or snack. Order now!",
    category: cat_fresh_nan_breads._id,
    basePricePence: 360,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_keema_nan = await MenuItem.create({
    tenant: tenantId,
    name: "Keema Nan",
    menuCode: "FRE-004",
    description: "Soft flatbread stuffed with spiced minced meat, baked fresh for a flavorful and satisfying treat. Order now!",
    category: cat_fresh_nan_breads._id,
    basePricePence: 420,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_peshwari_nan = await MenuItem.create({
    tenant: tenantId,
    name: "Peshwari Nan",
    menuCode: "FRE-005",
    description: "Soft flatbread filled with a delicious blend of nuts and sweetened coconut — a perfect balance of sweet and savory. Order now!",
    category: cat_fresh_nan_breads._id,
    basePricePence: 420,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_garlic_keema_nan = await MenuItem.create({
    tenant: tenantId,
    name: "Garlic Keema Nan",
    menuCode: "FRE-006",
    description: "Soft flatbread filled with spiced minced meat and brushed with garlic butter for an extra burst of flavor. Order now!",
    category: cat_fresh_nan_breads._id,
    basePricePence: 459,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_garlic_cheese_nan = await MenuItem.create({
    tenant: tenantId,
    name: "Garlic Cheese Nan",
    menuCode: "FRE-007",
    description: "Soft flatbread stuffed with melted cheese and brushed with fragrant garlic butter — a perfect cheesy, flavorful treat. Order now!",
    category: cat_fresh_nan_breads._id,
    basePricePence: 459,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_roti = await MenuItem.create({
    tenant: tenantId,
    name: "Roti",
    menuCode: "FRE-008",
    description: "Thin, soft flatbread cooked fresh — a classic accompaniment to any meal. Order now!",
    category: cat_fresh_nan_breads._id,
    basePricePence: 70,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_garlic_roti = await MenuItem.create({
    tenant: tenantId,
    name: "Garlic Roti",
    menuCode: "FRE-009",
    description: "Soft flatbread brushed with fragrant garlic butter — a flavorful side to complement any dish. Order now!",
    category: cat_fresh_nan_breads._id,
    basePricePence: 130,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_pitta_bread = await MenuItem.create({
    tenant: tenantId,
    name: "Pitta Bread",
    menuCode: "FRE-010",
    description: "Soft and fluffy pita bread, perfect for wraps, dipping, or pairing with your favorite dishes. Order now!",
    category: cat_fresh_nan_breads._id,
    basePricePence: 60,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chilli_nan = await MenuItem.create({
    tenant: tenantId,
    name: "Chilli Nan",
    menuCode: "FRE-011",
    description: "Soft and fluffy pita bread, perfect for wraps, dipping, or pairing with your favorite dishes. Order now!",
    category: cat_fresh_nan_breads._id,
    basePricePence: 400,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chilli_cheese_nan = await MenuItem.create({
    tenant: tenantId,
    name: "Chilli Cheese Nan",
    menuCode: "FRE-012",
    description: "Soft flatbread stuffed with melted cheese and a kick of spicy chilli for a bold, tasty treat. Order now!",
    category: cat_fresh_nan_breads._id,
    basePricePence: 490,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_keema_cheese_nan = await MenuItem.create({
    tenant: tenantId,
    name: "Keema Cheese Nan",
    menuCode: "FRE-013",
    description: "Soft flatbread stuffed with spiced minced meat and melted cheese — a perfect savory combination. Order now!",
    category: cat_fresh_nan_breads._id,
    basePricePence: 490,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 13,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_plain_nan = await MenuItem.create({
    tenant: tenantId,
    name: "Small Plain Nan",
    menuCode: "FRE-014",
    description: "A soft, fluffy flatbread in a smaller size — perfect as a side or snack. Order now!",
    category: cat_fresh_nan_breads._id,
    basePricePence: 220,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 14,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_garlic_nan = await MenuItem.create({
    tenant: tenantId,
    name: "Small Garlic Nan",
    menuCode: "FRE-015",
    description: "Soft, small-sized flatbread brushed with house-made garlic — a perfect flavorful side. Order now!",
    category: cat_fresh_nan_breads._id,
    basePricePence: 250,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 15,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_garlic_baguette = await MenuItem.create({
    tenant: tenantId,
    name: "Garlic Baguette",
    menuCode: "GAR-001",
    description: "Toasted baguette with savory garlic butter, perfect as a side or snack.",
    category: cat_garlic_baguette._id,
    basePricePence: 390,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_garlic_baguette_with_cheese = await MenuItem.create({
    tenant: tenantId,
    name: "Garlic Baguette With Cheese",
    menuCode: "GAR-002",
    description: "Golden garlic baguette smothered in buttery garlic and bubbling cheese.",
    category: cat_garlic_baguette._id,
    basePricePence: 490,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_loctite_super_glu = await MenuItem.create({
    tenant: tenantId,
    name: "Loctite Super Glu",
    menuCode: "HOU-001",
    description: "Freshly prepared Loctite Super Glu from our menu.",
    category: cat_household_miscellaneous._id,
    basePricePence: 400,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_travel_padlock = await MenuItem.create({
    tenant: tenantId,
    name: "Travel Padlock",
    menuCode: "HOU-002",
    description: "Freshly prepared Travel Padlock from our menu.",
    category: cat_household_miscellaneous._id,
    basePricePence: 400,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_magnum_white_choc_berry = await MenuItem.create({
    tenant: tenantId,
    name: "Magnum White Choc & Berry",
    menuCode: "ICE-001",
    description: "Freshly prepared Magnum White Choc & Berry from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_magnum_white_chocolate = await MenuItem.create({
    tenant: tenantId,
    name: "Magnum White Chocolate",
    menuCode: "ICE-002",
    description: "Freshly prepared Magnum White Chocolate from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_magnum_classic = await MenuItem.create({
    tenant: tenantId,
    name: "Magnum Classic",
    menuCode: "ICE-003",
    description: "Freshly prepared Magnum Classic from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_dairy_milk_ice_cream = await MenuItem.create({
    tenant: tenantId,
    name: "Dairy Milk Ice Cream",
    menuCode: "ICE-004",
    description: "Freshly prepared Dairy Milk Ice Cream from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cornetto_clasic_cone = await MenuItem.create({
    tenant: tenantId,
    name: "Cornetto Clasic Cone",
    menuCode: "ICE-005",
    description: "Freshly prepared Cornetto Clasic Cone from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 280,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_oreo_ice_cream_tub = await MenuItem.create({
    tenant: tenantId,
    name: "Oreo ice cream tub",
    menuCode: "ICE-006",
    description: "Freshly prepared Oreo ice cream tub from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 600,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_magum_classic_tubs = await MenuItem.create({
    tenant: tenantId,
    name: "Magum classic tubs",
    menuCode: "ICE-007",
    description: "Freshly prepared Magum classic tubs from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 700,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_ice_cubes_bag = await MenuItem.create({
    tenant: tenantId,
    name: "Ice Cubes Bag",
    menuCode: "ICE-008",
    description: "Freshly prepared Ice Cubes Bag from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_tubzee_kulfi_pistachio = await MenuItem.create({
    tenant: tenantId,
    name: "Tubzee Kulfi pistachio",
    menuCode: "ICE-009",
    description: "Freshly prepared Tubzee Kulfi pistachio from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 200,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_ben_n_jerry_minter_wonderland_tub = await MenuItem.create({
    tenant: tenantId,
    name: "Ben n jerry minter wonderland tub",
    menuCode: "ICE-010",
    description: "Freshly prepared Ben n jerry minter wonderland tub from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 600,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_ben_n_jerry_brookies_cream = await MenuItem.create({
    tenant: tenantId,
    name: "Ben n jerry Brookies & cream",
    menuCode: "ICE-011",
    description: "Freshly prepared Ben n jerry Brookies & cream from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 700,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_magnum_double_caramel = await MenuItem.create({
    tenant: tenantId,
    name: "Magnum Double Caramel",
    menuCode: "ICE-012",
    description: "Freshly prepared Magnum Double Caramel from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_magnum_mint = await MenuItem.create({
    tenant: tenantId,
    name: "Magnum Mint",
    menuCode: "ICE-013",
    description: "Freshly prepared Magnum Mint from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 13,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_magnum_white_choc_cookies = await MenuItem.create({
    tenant: tenantId,
    name: "Magnum White Choc & Cookies",
    menuCode: "ICE-014",
    description: "Freshly prepared Magnum White Choc & Cookies from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 14,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_flake_cone = await MenuItem.create({
    tenant: tenantId,
    name: "Flake Cone",
    menuCode: "ICE-015",
    description: "Freshly prepared Flake Cone from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 15,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_magnum_gold_caramel_billionaire = await MenuItem.create({
    tenant: tenantId,
    name: "Magnum Gold Caramel Billionaire",
    menuCode: "ICE-016",
    description: "Freshly prepared Magnum Gold Caramel Billionaire from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 16,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_ben_n_jerry_fudge_brownie = await MenuItem.create({
    tenant: tenantId,
    name: "Ben N Jerry fudge brownie",
    menuCode: "ICE-017",
    description: "Freshly prepared Ben N Jerry fudge brownie from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 700,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 17,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_haagen_dazs = await MenuItem.create({
    tenant: tenantId,
    name: "Haagen Dazs",
    menuCode: "ICE-018",
    description: "Freshly prepared Haagen Dazs from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 700,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 18,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_ben_n_jerry_strawberry_cheese_cake = await MenuItem.create({
    tenant: tenantId,
    name: "Ben n jerry strawberry cheese cake",
    menuCode: "ICE-019",
    description: "Freshly prepared Ben n jerry strawberry cheese cake from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 700,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 19,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_tubzee_kulfi_orignal_flavour = await MenuItem.create({
    tenant: tenantId,
    name: "Tubzee kulfi orignal flavour",
    menuCode: "ICE-020",
    description: "Freshly prepared Tubzee kulfi orignal flavour from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 200,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 20,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_ben_n_jerry_chunky_monkey = await MenuItem.create({
    tenant: tenantId,
    name: "Ben n jerry chunky monkey",
    menuCode: "ICE-021",
    description: "Freshly prepared Ben n jerry chunky monkey from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 700,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 21,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_ben_n_jerry_chocolate_orange_chunk = await MenuItem.create({
    tenant: tenantId,
    name: "Ben n jerry chocolate orange chunk",
    menuCode: "ICE-022",
    description: "Freshly prepared Ben n jerry chocolate orange chunk from our menu.",
    category: cat_ice_creams._id,
    basePricePence: 700,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 22,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_tikka_doner_box = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Tikka Doner Box",
    menuCode: "KEB-001",
    description: "Chicken tikka and Doner meat served with chips in 9inch box with choice of naan",
    category: cat_kebab_box_deals._id,
    basePricePence: 1250,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mix_doner_kebab_box = await MenuItem.create({
    tenant: tenantId,
    name: "Mix Doner Kebab Box",
    menuCode: "KEB-002",
    description: "Doner meat and Chicken Doner in 9inch pizza box served with chips, add Nan if required",
    category: cat_kebab_box_deals._id,
    basePricePence: 1250,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mixed_grill_box = await MenuItem.create({
    tenant: tenantId,
    name: "Mixed Grill Box",
    menuCode: "KEB-003",
    description: "Chicken Tikka, lamb Tikka, Shish and Doner meat served with chips, add Nan if required",
    category: cat_kebab_box_deals._id,
    basePricePence: 1400,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cheesy_kebab_box = await MenuItem.create({
    tenant: tenantId,
    name: "Cheesy Kebab Box",
    menuCode: "KEB-004",
    description: "Mixed doner meat served with chips, and choice of naan with cheese on top",
    category: cat_kebab_box_deals._id,
    basePricePence: 1300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_supreme_chicken_box = await MenuItem.create({
    tenant: tenantId,
    name: "Supreme Chicken Box",
    menuCode: "KEB-005",
    description: "Not sure which chicken you prefer, why not try this box meal, 2Pc Tandoori chicken and 2Pc Fried chicken served with chips, add Nan if required",
    category: cat_kebab_box_deals._id,
    basePricePence: 1450,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_deluxe_kebab_box = await MenuItem.create({
    tenant: tenantId,
    name: "Deluxe Kebab Box",
    menuCode: "KEB-006",
    description: "Chicken Tikka, Chicken Doner and Doner with chips in a Nan bread",
    category: cat_kebab_box_deals._id,
    basePricePence: 1399,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_curry_doner_kebab_in_naan = await MenuItem.create({
    tenant: tenantId,
    name: "Curry Doner Kebab In Naan",
    menuCode: "KEB-007",
    description: "Tender doner meat simmered in your choice of rich curry sauce—Masala, Korma, Madras, Balti, Jalfrezi, ...",
    category: cat_kebabs._id,
    basePricePence: 969,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_doner_kebab = await MenuItem.create({
    tenant: tenantId,
    name: "Doner Kebab",
    menuCode: "KEB-008",
    description: "Tender, seasoned meat sliced fresh and wrapped in soft bread with your choice of sauces and salad. A ...",
    category: cat_kebabs._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_doner_kebab = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Doner Kebab",
    menuCode: "KEB-009",
    description: "Flavourful, slow-roasted chicken doner meat served fresh in the bread of your choice.",
    category: cat_kebabs._id,
    basePricePence: 710,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_tikka_kebab = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Tikka Kebab",
    menuCode: "KEB-010",
    description: "Juicy chunks of tender, marinated chicken tikka cooked to perfection.",
    category: cat_kebabs._id,
    basePricePence: 710,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_garlic_chicken_kebab = await MenuItem.create({
    tenant: tenantId,
    name: "Garlic Chicken Kebab",
    menuCode: "KEB-011",
    description: "Juicy, perfectly cooked chicken infused with rich garlic flavor, served in your choice of bread.",
    category: cat_kebabs._id,
    basePricePence: 740,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_steak_tikka_kebeb = await MenuItem.create({
    tenant: tenantId,
    name: "Steak Tikka Kebeb",
    menuCode: "KEB-012",
    description: "chunks ofsteak tikka, bursting with bold spices, served fresh in your choice of bread.",
    category: cat_kebabs._id,
    basePricePence: 720,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_shish_kebab = await MenuItem.create({
    tenant: tenantId,
    name: "Shish Kebab",
    menuCode: "KEB-013",
    description: "Tender skewers of spiced minced chicken, expertly cooked and served hot in your choice of fresh bread.",
    category: cat_kebabs._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_combo_kebab_in_naan = await MenuItem.create({
    tenant: tenantId,
    name: "Large Combo Kebab In Naan",
    menuCode: "KEB-014",
    description: "Choose any two of our flavorful meats* piled high on a warm, soft naan bread for a satisfying and delicious meal. (*Garlic chicken excluded)",
    category: cat_kebabs._id,
    basePricePence: 1090,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_nan_special_kebab_in_naan = await MenuItem.create({
    tenant: tenantId,
    name: "Large Nan Special Kebab In Naan",
    menuCode: "KEB-015",
    description: "A generous mix of 4 pieces of chicken tikka, 3 pieces of steak, savory doner meat,",
    category: cat_kebabs._id,
    basePricePence: 1090,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chips_in_pitta = await MenuItem.create({
    tenant: tenantId,
    name: "Chips In Pitta",
    menuCode: "KEB-016",
    description: "Golden, crispy chips wrapped in warm, fluffy pitta bread — a perfect blend of",
    category: cat_kebabs._id,
    basePricePence: 300,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_tikka_masala = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Tikka Masala",
    menuCode: "MAS-001",
    description: "Enjoy our rich chicken tikka masala featuring tender marinated chicken simmered in a mildly spiced crea...",
    category: cat_masala_dishes._id,
    basePricePence: 840,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_tikka_mince_meat_masala = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Tikka Mince Meat Masala",
    menuCode: "MAS-002",
    description: "Juicy chicken tikka simmered in a rich, aromatic masala sauce with Mincemeat. Full of flavor in every bite!",
    category: cat_masala_dishes._id,
    basePricePence: 919,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_vegetable_tikka_masala = await MenuItem.create({
    tenant: tenantId,
    name: "Vegetable Tikka Masala",
    menuCode: "MAS-003",
    description: "Enjoy our Vegetable Tikka Masala, a delightful mix of peas, carrots, green beans, and sweetcorn. Perfectly seasoned",
    category: cat_masala_dishes._id,
    basePricePence: 810,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_tikka_prawn_masala = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Tikka Prawn Masala",
    menuCode: "MAS-004",
    description: "a delicious blend of tender chicken tikka and succulent prawns, simmered in a rich spiced tomato and cream sauce for a luxurious flavour packed dish.",
    category: cat_masala_dishes._id,
    basePricePence: 919,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mince_meat_prawn_masala = await MenuItem.create({
    tenant: tenantId,
    name: "Mince Meat Prawn Masala",
    menuCode: "MAS-005",
    description: "Juicy prawns simmered in a rich, flavorful masala sauce with Mincemeat. Bursting with spice and aroma!",
    category: cat_masala_dishes._id,
    basePricePence: 919,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_rup_express_nan_1 = await MenuItem.create({
    tenant: tenantId,
    name: "Rup Express Nan 1",
    menuCode: "MEA-001",
    description: "A satisfying two 9-inch box loaded with two pieces of chicken, savory doner meat, (Description truncated in image.)",
    category: cat_meal_deals._id,
    basePricePence: 0,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_rup_express_nan_2 = await MenuItem.create({
    tenant: tenantId,
    name: "Rup Express Nan 2",
    menuCode: "MEA-002",
    description: "A hearty feast featuring 2 pieces of tender chicken, savory doner meat, flavorful (Description truncated in image.)",
    category: cat_meal_deals._id,
    basePricePence: 0,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_7_inch_doner_pack = await MenuItem.create({
    tenant: tenantId,
    name: "7 Inch Doner Pack",
    menuCode: "MEA-003",
    description: "A satisfying 7 inch doner pack with one piece of chicken, savory doner meat, flavorful chicken doner, tender shish wrapped in soft naan, and a side of crispy chips.",
    category: cat_meal_deals._id,
    basePricePence: 1090,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_feast = await MenuItem.create({
    tenant: tenantId,
    name: "Feast",
    menuCode: "MEA-004",
    description: "A hearty feast featuring 2 pieces of tender chicken, savory doner meat, flavorful chicken doner, 3 pieces of succulent shish kebab, juicy chicken tikka, golden chips...",
    category: cat_meal_deals._id,
    basePricePence: 2200,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_burger_special = await MenuItem.create({
    tenant: tenantId,
    name: "Burger Special",
    menuCode: "MEA-005",
    description: "A juicy cheese burger paired with savory doner meat, crispy chips, 3 pieces of golden chicken nuggets, and...",
    category: cat_meal_deals._id,
    basePricePence: 950,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_value_pack_1 = await MenuItem.create({
    tenant: tenantId,
    name: "Small Value Pack 1",
    menuCode: "MEA-006",
    description: "A juicy flame-grilled cheese burger served with crispy chips and flavorful doner meat — a satisfying classic combo.",
    category: cat_meal_deals._id,
    basePricePence: 890,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_value_pack_1 = await MenuItem.create({
    tenant: tenantId,
    name: "Large Value Pack 1",
    menuCode: "MEA-007",
    description: "Double juicy flame-grilled cheese burger served with crispy chips and flavorful doner meat — a satisfying classic combo.",
    category: cat_meal_deals._id,
    basePricePence: 1040,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_value_pack_2 = await MenuItem.create({
    tenant: tenantId,
    name: "Small Value Pack 2",
    menuCode: "MEA-008",
    description: "A crispy chicken fillet burger nestled in a soft seeded bun, served with golden chips and savory doner meat.",
    category: cat_meal_deals._id,
    basePricePence: 919,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_value_pack_2 = await MenuItem.create({
    tenant: tenantId,
    name: "Large Value Pack 2",
    menuCode: "MEA-009",
    description: "Double crispy chicken fillet burger nestled in a soft seeded bun, served with golden chips and savory doner meat.",
    category: cat_meal_deals._id,
    basePricePence: 1070,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_value_pack_3 = await MenuItem.create({
    tenant: tenantId,
    name: "Small Value Pack 3",
    menuCode: "MEA-010",
    description: "A fiery, crispy Zinger burger nestled in a soft seeded bun, paired with golden chips and savory doner meat — a bold flavor combo.",
    category: cat_meal_deals._id,
    basePricePence: 940,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_value_pack_3 = await MenuItem.create({
    tenant: tenantId,
    name: "Large Value Pack 3",
    menuCode: "MEA-011",
    description: "Double fiery, crispy Zinger burger nestled in a soft seeded bun, paired with golden chips and savory doner meat — a bold flavor combo.",
    category: cat_meal_deals._id,
    basePricePence: 1090,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_tikka_meal_deal = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Tikka Meal Deal",
    menuCode: "MEA-012",
    description: "Juicy chunks of chicken tikka, savory doner meat, flavorful chicken doner, and crispy golden chips — a delicious combo packed with bold flavors.",
    category: cat_meal_deals._id,
    basePricePence: 900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_masala_doner_meat_chips = await MenuItem.create({
    tenant: tenantId,
    name: "Masala Doner Meat & Chips",
    menuCode: "MEA-013",
    description: "Freshly stir-fried doner meat and crispy chips coated in our signature masala seasoning, packed with flavor...",
    category: cat_meal_deals._id,
    basePricePence: 830,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 13,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mixed_box = await MenuItem.create({
    tenant: tenantId,
    name: "Mixed Box",
    menuCode: "MEA-014",
    description: "A tasty mix of 3 crispy chicken strips, 3 spicy hot wings, 3 golden nuggets, crispy chips, and savory doner meat — all packed in a convenient 7-inch box.",
    category: cat_meal_deals._id,
    basePricePence: 850,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 14,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_kids_meal_deal = await MenuItem.create({
    tenant: tenantId,
    name: "Kids Meal Deal",
    menuCode: "MEA-015",
    description: "Choose between crispy chicken nuggets or bite-sized popcorn chicken, served with chips and a drink — a perfect meal for the little ones!",
    category: cat_meal_deals._id,
    basePricePence: 490,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 15,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_ferrero_rocher_milkshake = await MenuItem.create({
    tenant: tenantId,
    name: "Ferrero Rocher Milkshake",
    menuCode: "MIL-001",
    description: "Delicious milkshakes made with your favourite chocolate bar, served with whipped cream",
    category: cat_milkshakes._id,
    basePricePence: 0,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_crunchie_milkshake = await MenuItem.create({
    tenant: tenantId,
    name: "Crunchie Milkshake",
    menuCode: "MIL-002",
    description: "Delicious milkshakes made with your favourite chocolate bar, served with whipped cream",
    category: cat_milkshakes._id,
    basePricePence: 0,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cadburys_flake_milkshake = await MenuItem.create({
    tenant: tenantId,
    name: "Cadburys Flake Milkshake",
    menuCode: "MIL-003",
    description: "Freshly prepared Cadburys Flake Milkshake from our menu.",
    category: cat_milkshakes._id,
    basePricePence: 450,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_galaxy_milkshake = await MenuItem.create({
    tenant: tenantId,
    name: "Galaxy Milkshake",
    menuCode: "MIL-004",
    description: "Freshly prepared Galaxy Milkshake from our menu.",
    category: cat_milkshakes._id,
    basePricePence: 450,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_maltesers_milkshake = await MenuItem.create({
    tenant: tenantId,
    name: "Maltesers Milkshake",
    menuCode: "MIL-005",
    description: "Freshly prepared Maltesers Milkshake from our menu.",
    category: cat_milkshakes._id,
    basePricePence: 450,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_wispa_milkshake = await MenuItem.create({
    tenant: tenantId,
    name: "Wispa Milkshake",
    menuCode: "MIL-006",
    description: "Freshly prepared Wispa Milkshake from our menu.",
    category: cat_milkshakes._id,
    basePricePence: 450,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_oreo_cookie_milkshake = await MenuItem.create({
    tenant: tenantId,
    name: "Oreo Cookie Milkshake",
    menuCode: "MIL-007",
    description: "Freshly prepared Oreo Cookie Milkshake from our menu.",
    category: cat_milkshakes._id,
    basePricePence: 450,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_snickers_milkshake = await MenuItem.create({
    tenant: tenantId,
    name: "Snickers Milkshake",
    menuCode: "MIL-008",
    description: "Freshly prepared Snickers Milkshake from our menu.",
    category: cat_milkshakes._id,
    basePricePence: 450,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_kinder_bueno_milkshake = await MenuItem.create({
    tenant: tenantId,
    name: "Kinder Bueno Milkshake",
    menuCode: "MIL-009",
    description: "Freshly prepared Kinder Bueno Milkshake from our menu.",
    category: cat_milkshakes._id,
    basePricePence: 450,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_milky_bar_milkshake = await MenuItem.create({
    tenant: tenantId,
    name: "Milky Bar Milkshake",
    menuCode: "MIL-010",
    description: "Freshly prepared Milky Bar Milkshake from our menu.",
    category: cat_milkshakes._id,
    basePricePence: 450,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_terrys_chocolate_orange_milkshake = await MenuItem.create({
    tenant: tenantId,
    name: "Terry's Chocolate Orange Milkshake",
    menuCode: "MIL-011",
    description: "Freshly prepared Terry's Chocolate Orange Milkshake from our menu.",
    category: cat_milkshakes._id,
    basePricePence: 450,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_twix_milkshake = await MenuItem.create({
    tenant: tenantId,
    name: "Twix Milkshake",
    menuCode: "MIL-012",
    description: "Freshly prepared Twix Milkshake from our menu.",
    category: cat_milkshakes._id,
    basePricePence: 450,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_aero_mint_milkshake = await MenuItem.create({
    tenant: tenantId,
    name: "Aero Mint Milkshake",
    menuCode: "MIL-013",
    description: "Freshly prepared Aero Mint Milkshake from our menu.",
    category: cat_milkshakes._id,
    basePricePence: 450,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 13,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_bubblegum_milkshake = await MenuItem.create({
    tenant: tenantId,
    name: "Bubblegum Milkshake",
    menuCode: "MIL-014",
    description: "Freshly prepared Bubblegum Milkshake from our menu.",
    category: cat_milkshakes._id,
    basePricePence: 380,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 14,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mango_milkshake = await MenuItem.create({
    tenant: tenantId,
    name: "Mango Milkshake",
    menuCode: "MIL-015",
    description: "Freshly prepared Mango Milkshake from our menu.",
    category: cat_milkshakes._id,
    basePricePence: 380,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 15,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_strawberry_milkshake = await MenuItem.create({
    tenant: tenantId,
    name: "Strawberry Milkshake",
    menuCode: "MIL-016",
    description: "Freshly prepared Strawberry Milkshake from our menu.",
    category: cat_milkshakes._id,
    basePricePence: 380,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 16,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_vanilla_milkshake = await MenuItem.create({
    tenant: tenantId,
    name: "Vanilla Milkshake",
    menuCode: "MIL-017",
    description: "Freshly prepared Vanilla Milkshake from our menu.",
    category: cat_milkshakes._id,
    basePricePence: 380,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 17,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chocolate_milkshake = await MenuItem.create({
    tenant: tenantId,
    name: "Chocolate Milkshake",
    menuCode: "MIL-018",
    description: "Freshly prepared Chocolate Milkshake from our menu.",
    category: cat_milkshakes._id,
    basePricePence: 380,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 18,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_scissors = await MenuItem.create({
    tenant: tenantId,
    name: "Scissors",
    menuCode: "MIS-001",
    description: "Freshly prepared Scissors from our menu.",
    category: cat_miscellaneous_items._id,
    basePricePence: 500,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_blue_tac = await MenuItem.create({
    tenant: tenantId,
    name: "Blue Tac",
    menuCode: "MIS-002",
    description: "Freshly prepared Blue Tac from our menu.",
    category: cat_miscellaneous_items._id,
    basePricePence: 300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_engine_oil_10w40_1ltr = await MenuItem.create({
    tenant: tenantId,
    name: "Engine Oil 10w40 1ltr",
    menuCode: "MIS-003",
    description: "Freshly prepared Engine Oil 10w40 1ltr from our menu.",
    category: cat_miscellaneous_items._id,
    basePricePence: 1100,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_wd_40_smart_straw = await MenuItem.create({
    tenant: tenantId,
    name: "WD 40 Smart Straw",
    menuCode: "MIS-004",
    description: "Freshly prepared WD 40 Smart Straw from our menu.",
    category: cat_miscellaneous_items._id,
    basePricePence: 800,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_holts_radiator_leak_repair = await MenuItem.create({
    tenant: tenantId,
    name: "Holts Radiator Leak Repair",
    menuCode: "MIS-005",
    description: "Freshly prepared Holts Radiator Leak Repair from our menu.",
    category: cat_miscellaneous_items._id,
    basePricePence: 700,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_booster_cable_400amps = await MenuItem.create({
    tenant: tenantId,
    name: "Booster Cable 400amps",
    menuCode: "MIS-006",
    description: "Freshly prepared Booster Cable 400amps from our menu.",
    category: cat_miscellaneous_items._id,
    basePricePence: 2000,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_drawing_pins = await MenuItem.create({
    tenant: tenantId,
    name: "Drawing Pins",
    menuCode: "MIS-007",
    description: "Freshly prepared Drawing Pins from our menu.",
    category: cat_miscellaneous_items._id,
    basePricePence: 250,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_engine_oil_5w_30_1ltr = await MenuItem.create({
    tenant: tenantId,
    name: "Engine Oil 5W 30 1ltr",
    menuCode: "MIS-008",
    description: "Freshly prepared Engine Oil 5W 30 1ltr from our menu.",
    category: cat_miscellaneous_items._id,
    basePricePence: 1200,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_engine_oil_turbo_diesel_15w40_1ltr = await MenuItem.create({
    tenant: tenantId,
    name: "Engine Oil Turbo Diesel 15W40 1ltr",
    menuCode: "MIS-009",
    description: "Freshly prepared Engine Oil Turbo Diesel 15W40 1ltr from our menu.",
    category: cat_miscellaneous_items._id,
    basePricePence: 1100,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_power_steering_fluid_1ltr = await MenuItem.create({
    tenant: tenantId,
    name: "Power Steering Fluid 1ltr",
    menuCode: "MIS-010",
    description: "Freshly prepared Power Steering Fluid 1ltr from our menu.",
    category: cat_miscellaneous_items._id,
    basePricePence: 1200,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_fuel_can = await MenuItem.create({
    tenant: tenantId,
    name: "Fuel Can",
    menuCode: "MIS-011",
    description: "Freshly prepared Fuel Can from our menu.",
    category: cat_miscellaneous_items._id,
    basePricePence: 900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_tyre_weld = await MenuItem.create({
    tenant: tenantId,
    name: "Tyre Weld",
    menuCode: "MIS-012",
    description: "Freshly prepared Tyre Weld from our menu.",
    category: cat_miscellaneous_items._id,
    basePricePence: 1200,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_buy_any_2x_12inch_pizza_get_1_free = await MenuItem.create({
    tenant: tenantId,
    name: "Buy Any 2x 12inch Pizza Get 1 Free",
    menuCode: "PIZ-001",
    description: "Enjoy our offer: Buy Any 2x 12-inch Pizza and Get 1 Free! Choose from delicious options",
    category: cat_pizza_deals._id,
    basePricePence: 1190,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_buy_any_2x_16inch_pizza_get_1_free = await MenuItem.create({
    tenant: tenantId,
    name: "Buy Any 2x 16inch Pizza Get 1 Free",
    menuCode: "PIZ-002",
    description: "Enjoy our special: Buy Any 2x 16inch Pizza Get 1 Free! Choose your favorites: ...",
    category: cat_pizza_deals._id,
    basePricePence: 1380,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_any_7inch_pizza_with_pepsi_can = await MenuItem.create({
    tenant: tenantId,
    name: "Any 7inch Pizza With Pepsi Can",
    menuCode: "PIZ-003",
    description: "Any 7\" Pizza + 🍕 Pepsi Can. Available on Wednesday from 4 PM.",
    category: cat_pizza_deals._id,
    basePricePence: 499,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_any_2x_9inch_pizzas = await MenuItem.create({
    tenant: tenantId,
    name: "Any 2x 9inch Pizzas",
    menuCode: "PIZ-004",
    description: "Two delicious 9-inch pizzas, perfect for sharing or a satisfying meal.",
    category: cat_pizza_deals._id,
    basePricePence: 1400,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_any_2x_16inch_pizzas = await MenuItem.create({
    tenant: tenantId,
    name: "Any 2x 16inch Pizzas",
    menuCode: "PIZ-005",
    description: "Two extra-large 16-inch pizzas packed with delicious toppings — ideal for big appetites and sharing with friends.",
    category: cat_pizza_deals._id,
    basePricePence: 2800,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_any_2x_12inch_pizzas = await MenuItem.create({
    tenant: tenantId,
    name: "Any 2x 12inch Pizzas",
    menuCode: "PIZ-006",
    description: "Two large 12-inch pizzas loaded with your favorite toppings — perfect for sharing or a hearty feast.",
    category: cat_pizza_deals._id,
    basePricePence: 2400,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_pizza_meal_deal_1 = await MenuItem.create({
    tenant: tenantId,
    name: "Pizza Meal Deal 1",
    menuCode: "PIZ-007",
    description: "Enjoy any 7-inch pizza paired with crispy onion rings, savory doner meat, and golden chips — all packed ...",
    category: cat_pizza_deals._id,
    basePricePence: 1050,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_pizza_meal_deal_3 = await MenuItem.create({
    tenant: tenantId,
    name: "Pizza Meal Deal 3",
    menuCode: "PIZ-008",
    description: "Enjoy any 16-inch pizza alongside a large portion of savory doner meat, crispy chips, and golden onion rings — a perfect feast for sharing or a hearty meal.",
    category: cat_pizza_deals._id,
    basePricePence: 2390,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_pizza_meal_deal_2 = await MenuItem.create({
    tenant: tenantId,
    name: "Pizza Meal Deal 2",
    menuCode: "PIZ-009",
    description: "A hearty meal featuring any 12-inch pizza, a warm garlic cheese baguette, a generous portion of large doner meat, crispy chips, and crunchy onion rings — ...",
    category: cat_pizza_deals._id,
    basePricePence: 2200,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_margherita_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Margherita Pizza",
    menuCode: "PIZ-010",
    description: "Enjoy a classic Margherita Pizza with a tasty tomato base, topped with mozzarella and cheddar cheese.",
    category: cat_pizzas._id,
    basePricePence: 560,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_garlic_cheese_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Garlic Cheese Pizza",
    menuCode: "PIZ-011",
    description: "Creamy melted cheese meets roasted garlic on a perfectly crispy crust. Simple, tasty, and satisfying every time. Order yours today!",
    category: cat_pizzas._id,
    basePricePence: 560,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_meat_feast_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Meat Feast Pizza",
    menuCode: "PIZ-012",
    description: "Enjoy our Meat Feast Pizza, loaded with pepperoni, mince meat, cheddar, mozzarella, and chicken tikka. ...",
    category: cat_pizzas._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hawaiian_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Hawaiian Pizza",
    menuCode: "PIZ-013",
    description: "Sweet pineapple, tender chicken tikka, and juicy sweetcorn come together for a fresh, flavorful bite. Taste the tropical twist now!",
    category: cat_pizzas._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hot_shot_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Hot Shot Pizza",
    menuCode: "PIZ-014",
    description: "Turn up the heat! Pepperoni, green chillies, mushrooms, jalapeños, and green peppers fire up this...",
    category: cat_pizzas._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_spicy_feast_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Spicy Feast Pizza",
    menuCode: "PIZ-015",
    description: "Crave the heat? Our Spicy Feast Pizza is packed with chicken tikka, minced meat, pepperoni, green chillies, and jalapeños for a fiery, meaty explosion. Order online ...",
    category: cat_pizzas._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_apollo_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Apollo Pizza",
    menuCode: "PIZ-016",
    description: "Enjoy the Apollo Pizza—a perfect blend of tender chicken tikka and fresh mushrooms on a cheesy, golden crust. Simple, savory, and full of flavor. Order now",
    category: cat_pizzas._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_vegetarian_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Vegetarian Pizza",
    menuCode: "PIZ-017",
    description: "Fresh veggies and sweet pineapple top this colorful, tasty pizza. A perfect choice for veggie lovers craving...",
    category: cat_pizzas._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_smokey_special_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Smokey Special Pizza",
    menuCode: "PIZ-018",
    description: "Smoky BBQ sauce, pepperoni, and BBQ chicken combine for a rich, flavorful pizza experience. Fire up your taste buds today!",
    category: cat_pizzas._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cheesy_bbq_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Cheesy BBQ Pizza",
    menuCode: "PIZ-019",
    description: "Cheesy Pizza with BBQ base and double cheese. A rich, melty classic for cheese lovers. Order now online.",
    category: cat_pizzas._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_doner_special_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Doner Special Pizza",
    menuCode: "PIZ-020",
    description: "Try our Doner Special Pizza, topped with doner meat, chicken doner, and red onion. A delicious choice from our Pizzas",
    category: cat_pizzas._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_fire_ball_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Fire Ball Pizza",
    menuCode: "PIZ-021",
    description: "Packed with chilli, minced meat, and fresh onions, this fiery pizza is a flavor explosion you don't want to miss.",
    category: cat_pizzas._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_double_pepperoni_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Double Pepperoni Pizza",
    menuCode: "PIZ-022",
    description: "Extra pepperoni piled high with melted cheese — classic, bold, and always a crowd-pleaser. Grab yours ...",
    category: cat_pizzas._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 13,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_oriental_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Oriental Pizza",
    menuCode: "PIZ-023",
    description: "Tender chicken tikka with crunchy green peppers and sweetcorn—an irresistible, balanced blend of flavors.",
    category: cat_pizzas._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 14,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_bbq_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "BBQ Pizza",
    menuCode: "PIZ-024",
    description: "BBQ Pizza with BBQ base, chicken tikka, mincemeat, and onions. A hearty, flavorful choice. Order online ...",
    category: cat_pizzas._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 15,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_curry_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Curry Pizza",
    menuCode: "PIZ-025",
    description: "Spice up your meal with our Curry Pizza — choose from creamy Chicken Korma, rich Chicken Tikka Masala, classic Chicken Curry, or our special house blend. Bold...",
    category: cat_pizzas._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 16,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_express_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Express Pizza",
    menuCode: "PIZ-026",
    description: "Everything you want, all on one pizza — juicy pineapple, spicy chicken tikka, pepperoni, mushrooms, keema, and more. Ready fast, delivered hot!",
    category: cat_pizzas._id,
    basePricePence: 730,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 17,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_apna_style_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Apna Style Pizza",
    menuCode: "PIZ-027",
    description: "Packed with chicken tikka, onions, mince meat, green peppers, green chillies, jalapeños, and sweetcorn—bursting with bold, spicy flavors. Order yours now!",
    category: cat_pizzas._id,
    basePricePence: 730,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 18,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mighty_meat_feast_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Mighty Meat Feast Pizza",
    menuCode: "PIZ-028",
    description: "Pepperoni, chicken tikka, doner meat, chicken doner and mince meat",
    category: cat_pizzas._id,
    basePricePence: 730,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 19,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_rupeyal_special_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Rupeyal Special Pizza",
    menuCode: "PIZ-029",
    description: "Pepperoni, onions, chicken, doner, minced meat & green peppers",
    category: cat_pizzas._id,
    basePricePence: 730,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 20,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_half_and_half_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Half And Half Pizza",
    menuCode: "PIZ-030",
    description: "Can't decide? Pick any two of your favorite pizzas and enjoy the best of both worlds, baked fresh and ready to share. Order now!",
    category: cat_pizzas._id,
    basePricePence: 1450,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 21,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_rices_boxes = await MenuItem.create({
    tenant: tenantId,
    name: "Rices Boxes",
    menuCode: "RIC-001",
    description: "Create your own Rice Box - Choose your Rice, Choose your Fillings, Add any Extras",
    category: cat_rice_box._id,
    basePricePence: 595,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_boiled_rice = await MenuItem.create({
    tenant: tenantId,
    name: "Boiled Rice",
    menuCode: "RIC-002",
    description: "Soft, aromatic rice, steamed to perfection for a perfect side.",
    category: cat_rice_dishes._id,
    basePricePence: 390,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_fried_rice = await MenuItem.create({
    tenant: tenantId,
    name: "Fried Rice",
    menuCode: "RIC-003",
    description: "Wok-tossed, lightly spiced rice with a deliciously savory flavor.",
    category: cat_rice_dishes._id,
    basePricePence: 470,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_prawn_fried_rice = await MenuItem.create({
    tenant: tenantId,
    name: "Prawn Fried Rice",
    menuCode: "RIC-004",
    description: "Fluffy rice stir-fried with juicy prawns and a hint of spice.",
    category: cat_rice_dishes._id,
    basePricePence: 550,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_keema_fried_rice = await MenuItem.create({
    tenant: tenantId,
    name: "Keema Fried Rice",
    menuCode: "RIC-005",
    description: "Aromatic basmati rice stir-fried with spiced minced meat, traditional herbs, and bold flavors. A classic ...",
    category: cat_rice_dishes._id,
    basePricePence: 500,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_egg_fried_rice = await MenuItem.create({
    tenant: tenantId,
    name: "Egg Fried Rice",
    menuCode: "RIC-006",
    description: "Fluffy basmati rice stir-fried with scrambled eggs, mild spices, and fresh herbs for a flavorful twist. Order ...",
    category: cat_rice_dishes._id,
    basePricePence: 500,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_vegetable_fried_rice = await MenuItem.create({
    tenant: tenantId,
    name: "Vegetable Fried Rice",
    menuCode: "RIC-007",
    description: "Fragrant rice stir-fried with a colorful mix of fresh vegetables and light seasoning — a tasty, wholesome...",
    category: cat_rice_dishes._id,
    basePricePence: 500,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_fried_rice_apna_style = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Fried Rice Apna Style",
    menuCode: "RIC-008",
    description: "Enjoy Chicken Fried Rice Apna Style, a delicious rice dish. This meal is a perfect blend of flavors, making it a tasty choice for any rice lover.",
    category: cat_rice_dishes._id,
    basePricePence: 750,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_pilau_rice = await MenuItem.create({
    tenant: tenantId,
    name: "Pilau Rice",
    menuCode: "RIC-009",
    description: "Aromatic, lightly spiced rice cooked to perfection. A fragrant companion to any curry.",
    category: cat_rice_dishes._id,
    basePricePence: 430,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_fried_rice = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Fried Rice",
    menuCode: "RIC-010",
    description: "Wok-tossed rice with tender chicken, lightly spiced and bursting with flavor.",
    category: cat_rice_dishes._id,
    basePricePence: 550,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mushroom_fried_rice = await MenuItem.create({
    tenant: tenantId,
    name: "Mushroom Fried Rice",
    menuCode: "RIC-011",
    description: "Fragrant basmati rice stir-fried with spiced mushrooms and aromatic herbs, delivering a deliciou...",
    category: cat_rice_dishes._id,
    basePricePence: 500,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_garlic_fried_rice = await MenuItem.create({
    tenant: tenantId,
    name: "Garlic Fried Rice",
    menuCode: "RIC-012",
    description: "Fragrant basmati rice tossed with roasted garlic, aromatic spices, and fresh herbs for a simple yet delicious-inspired side. Order now!",
    category: cat_rice_dishes._id,
    basePricePence: 500,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_special_fried_rice = await MenuItem.create({
    tenant: tenantId,
    name: "Special Fried Rice",
    menuCode: "RIC-013",
    description: "A delicious blend of fragrant basmati rice, mixed vegetables, spiced meats, and herbs — a flavorful fea...",
    category: cat_rice_dishes._id,
    basePricePence: 540,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_garlic_mushroom_fried_rice = await MenuItem.create({
    tenant: tenantId,
    name: "Garlic Mushroom Fried Rice",
    menuCode: "RIC-014",
    description: "Fragrant rice stir-fried with roasted garlic and tender mushrooms, creating a savory and satisfying dish. Order now!",
    category: cat_rice_dishes._id,
    basePricePence: 550,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 13,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_1pc_southern_fried_chicken = await MenuItem.create({
    tenant: tenantId,
    name: "1pc Southern Fried Chicken",
    menuCode: "S.F-001",
    description: "1 Crispy, golden Southern fried chicken with a flavorful, crunchy coating.",
    category: cat_sfc_and_value_boxes._id,
    basePricePence: 200,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "SFC_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_1pc_southern_fried_chicken_and_chips = await MenuItem.create({
    tenant: tenantId,
    name: "1pc Southern Fried Chicken And Chips",
    menuCode: "S.F-002",
    description: "1 crispy, golden Southern fried chicken served with crispy chips.",
    category: cat_sfc_and_value_boxes._id,
    basePricePence: 520,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "SFC_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_2pcs_southern_fried_chicken_and_chips = await MenuItem.create({
    tenant: tenantId,
    name: "2pcs Southern Fried Chicken And Chips",
    menuCode: "S.F-003",
    description: "2 Crispy, golden Southern fried chicken served with crispy chips.",
    category: cat_sfc_and_value_boxes._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "SFC_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_3pcs_southern_fried_chicken_and_chips = await MenuItem.create({
    tenant: tenantId,
    name: "3pcs Southern Fried Chicken And Chips",
    menuCode: "S.F-004",
    description: "3 Crispy, golden Southern fried chicken served with crispy chips.",
    category: cat_sfc_and_value_boxes._id,
    basePricePence: 819,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "SFC_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_1pc_value_box = await MenuItem.create({
    tenant: tenantId,
    name: "1pc Value Box",
    menuCode: "S.F-005",
    description: "1 Crispy, golden Southern fried chicken and savory doner meat, served with a side of crispy chips.",
    category: cat_sfc_and_value_boxes._id,
    basePricePence: 919,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "SFC_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_2pcs_value_box = await MenuItem.create({
    tenant: tenantId,
    name: "2pcs Value Box",
    menuCode: "S.F-006",
    description: "2 Crispy, golden Southern fried chicken and savory doner meat, served with a side of crispy chips.",
    category: cat_sfc_and_value_boxes._id,
    basePricePence: 994,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "SFC_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_unidentified_item = await MenuItem.create({
    tenant: tenantId,
    name: "Unidentified item",
    menuCode: "SHO-001",
    description: "Freshly prepared Unidentified item from our menu.",
    category: cat_shop_items._id,
    basePricePence: 260,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_raw_tips = await MenuItem.create({
    tenant: tenantId,
    name: "Raw Tips",
    menuCode: "SHO-002",
    description: "Freshly prepared Raw Tips from our menu.",
    category: cat_shop_items._id,
    basePricePence: 100,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_smoke_metal_pipe = await MenuItem.create({
    tenant: tenantId,
    name: "Smoke Metal Pipe",
    menuCode: "SHO-003",
    description: "Freshly prepared Smoke Metal Pipe from our menu.",
    category: cat_shop_items._id,
    basePricePence: 600,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mini_acrylic_bong = await MenuItem.create({
    tenant: tenantId,
    name: "Mini Acrylic Bong",
    menuCode: "SHO-004",
    description: "Freshly prepared Mini Acrylic Bong from our menu.",
    category: cat_shop_items._id,
    basePricePence: 600,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_teeth_shark_magnetic_grinder = await MenuItem.create({
    tenant: tenantId,
    name: "Teeth Shark Magnetic Grinder",
    menuCode: "SHO-005",
    description: "Freshly prepared Teeth Shark Magnetic Grinder from our menu.",
    category: cat_shop_items._id,
    basePricePence: 500,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_teeth_shark_mini_grinder = await MenuItem.create({
    tenant: tenantId,
    name: "Teeth Shark Mini Grinder",
    menuCode: "SHO-006",
    description: "Freshly prepared Teeth Shark Mini Grinder from our menu.",
    category: cat_shop_items._id,
    basePricePence: 400,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_pipe_screens = await MenuItem.create({
    tenant: tenantId,
    name: "Pipe Screens",
    menuCode: "SHO-007",
    description: "Freshly prepared Pipe Screens from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_glass_bongs = await MenuItem.create({
    tenant: tenantId,
    name: "Glass Bongs",
    menuCode: "SHO-008",
    description: "Freshly prepared Glass Bongs from our menu.",
    category: cat_shop_items._id,
    basePricePence: 1000,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_disposable_lighter = await MenuItem.create({
    tenant: tenantId,
    name: "Disposable Lighter",
    menuCode: "SHO-009",
    description: "Freshly prepared Disposable Lighter from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_clipper_lighter = await MenuItem.create({
    tenant: tenantId,
    name: "Clipper Lighter",
    menuCode: "SHO-010",
    description: "Freshly prepared Clipper Lighter from our menu.",
    category: cat_shop_items._id,
    basePricePence: 250,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_jet_flame_lighter = await MenuItem.create({
    tenant: tenantId,
    name: "Jet Flame Lighter",
    menuCode: "SHO-011",
    description: "Freshly prepared Jet Flame Lighter from our menu.",
    category: cat_shop_items._id,
    basePricePence: 320,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_match_box = await MenuItem.create({
    tenant: tenantId,
    name: "Match Box",
    menuCode: "SHO-012",
    description: "Freshly prepared Match Box from our menu.",
    category: cat_shop_items._id,
    basePricePence: 50,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_poppers_liquid_gold = await MenuItem.create({
    tenant: tenantId,
    name: "Poppers (Liquid Gold)",
    menuCode: "SHO-013",
    description: "Freshly prepared Poppers (Liquid Gold) from our menu.",
    category: cat_shop_items._id,
    basePricePence: 600,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 13,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_swan_slim_filters = await MenuItem.create({
    tenant: tenantId,
    name: "Swan Slim Filters",
    menuCode: "SHO-014",
    description: "Freshly prepared Swan Slim Filters from our menu.",
    category: cat_shop_items._id,
    basePricePence: 200,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 14,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_swan_extra_slim_filters = await MenuItem.create({
    tenant: tenantId,
    name: "Swan Extra Slim Filters",
    menuCode: "SHO-015",
    description: "Freshly prepared Swan Extra Slim Filters from our menu.",
    category: cat_shop_items._id,
    basePricePence: 260,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 15,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_swan_menthol_filters = await MenuItem.create({
    tenant: tenantId,
    name: "Swan Menthol Filters",
    menuCode: "SHO-016",
    description: "Freshly prepared Swan Menthol Filters from our menu.",
    category: cat_shop_items._id,
    basePricePence: 260,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 16,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_element_ks_slim_tips = await MenuItem.create({
    tenant: tenantId,
    name: "Element KS Slim + Tips",
    menuCode: "SHO-017",
    description: "Freshly prepared Element KS Slim + Tips from our menu.",
    category: cat_shop_items._id,
    basePricePence: 260,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 17,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chesterfield_tobacco_30gm = await MenuItem.create({
    tenant: tenantId,
    name: "Chesterfield tobacco 30gm",
    menuCode: "SHO-018",
    description: "Freshly prepared Chesterfield tobacco 30gm from our menu.",
    category: cat_shop_items._id,
    basePricePence: 2490,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 18,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_blunts_glass_cones = await MenuItem.create({
    tenant: tenantId,
    name: "Blunts Glass Cones",
    menuCode: "SHO-019",
    description: "Ask for flavours",
    category: cat_shop_items._id,
    basePricePence: 400,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 19,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_andrex_toilet_paper = await MenuItem.create({
    tenant: tenantId,
    name: "Andrex Toilet Paper",
    menuCode: "SHO-020",
    description: "Freshly prepared Andrex Toilet Paper from our menu.",
    category: cat_shop_items._id,
    basePricePence: 320,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 20,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_kleeneex_pocket_tissue = await MenuItem.create({
    tenant: tenantId,
    name: "Kleeneex Pocket Tissue",
    menuCode: "SHO-021",
    description: "Freshly prepared Kleeneex Pocket Tissue from our menu.",
    category: cat_shop_items._id,
    basePricePence: 80,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 21,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_domestos_bleach = await MenuItem.create({
    tenant: tenantId,
    name: "Domestos Bleach",
    menuCode: "SHO-022",
    description: "Freshly prepared Domestos Bleach from our menu.",
    category: cat_shop_items._id,
    basePricePence: 170,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 22,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_flash_bathroom_cleaner = await MenuItem.create({
    tenant: tenantId,
    name: "Flash Bathroom Cleaner",
    menuCode: "SHO-023",
    description: "Freshly prepared Flash Bathroom Cleaner from our menu.",
    category: cat_shop_items._id,
    basePricePence: 260,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 23,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_colgate_tooth_paste = await MenuItem.create({
    tenant: tenantId,
    name: "Colgate Tooth Paste",
    menuCode: "SHO-024",
    description: "Freshly prepared Colgate Tooth Paste from our menu.",
    category: cat_shop_items._id,
    basePricePence: 290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 24,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_carex_handwash = await MenuItem.create({
    tenant: tenantId,
    name: "Carex Handwash",
    menuCode: "SHO-025",
    description: "Freshly prepared Carex Handwash from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 25,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_gillette_shaving_blades = await MenuItem.create({
    tenant: tenantId,
    name: "Gillette Shaving Blades",
    menuCode: "SHO-026",
    description: "Freshly prepared Gillette Shaving Blades from our menu.",
    category: cat_shop_items._id,
    basePricePence: 290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 26,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_dettol_multipurpose_cleaner = await MenuItem.create({
    tenant: tenantId,
    name: "Dettol Multipurpose Cleaner",
    menuCode: "SHO-027",
    description: "Freshly prepared Dettol Multipurpose Cleaner from our menu.",
    category: cat_shop_items._id,
    basePricePence: 290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 27,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_iphone_lead = await MenuItem.create({
    tenant: tenantId,
    name: "Iphone Lead",
    menuCode: "SHO-028",
    description: "Freshly prepared Iphone Lead from our menu.",
    category: cat_shop_items._id,
    basePricePence: 800,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 28,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_type_c_usb_cable = await MenuItem.create({
    tenant: tenantId,
    name: "Type C USB Cable",
    menuCode: "SHO-029",
    description: "Freshly prepared Type C USB Cable from our menu.",
    category: cat_shop_items._id,
    basePricePence: 800,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 29,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_dual_usb_car_charger_20w = await MenuItem.create({
    tenant: tenantId,
    name: "Dual Usb Car Charger 20W",
    menuCode: "SHO-030",
    description: "Freshly prepared Dual Usb Car Charger 20W from our menu.",
    category: cat_shop_items._id,
    basePricePence: 1000,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 30,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_kleenex_balsam_facial_wipes = await MenuItem.create({
    tenant: tenantId,
    name: "Kleenex Balsam Facial Wipes",
    menuCode: "SHO-031",
    description: "Freshly prepared Kleenex Balsam Facial Wipes from our menu.",
    category: cat_shop_items._id,
    basePricePence: 290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 31,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_bin_bags = await MenuItem.create({
    tenant: tenantId,
    name: "Bin Bags",
    menuCode: "SHO-032",
    description: "Freshly prepared Bin Bags from our menu.",
    category: cat_shop_items._id,
    basePricePence: 300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 32,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_flash_kitchen_cleaner_spray = await MenuItem.create({
    tenant: tenantId,
    name: "Flash Kitchen Cleaner Spray",
    menuCode: "SHO-033",
    description: "Freshly prepared Flash Kitchen Cleaner Spray from our menu.",
    category: cat_shop_items._id,
    basePricePence: 260,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 33,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_tooth_brush = await MenuItem.create({
    tenant: tenantId,
    name: "Tooth Brush",
    menuCode: "SHO-034",
    description: "Freshly prepared Tooth Brush from our menu.",
    category: cat_shop_items._id,
    basePricePence: 200,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 34,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_head_n_shoulders = await MenuItem.create({
    tenant: tenantId,
    name: "Head N Shoulders",
    menuCode: "SHO-035",
    description: "Freshly prepared Head N Shoulders from our menu.",
    category: cat_shop_items._id,
    basePricePence: 300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 35,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_womens_shaving_blade = await MenuItem.create({
    tenant: tenantId,
    name: "Womens Shaving Blade",
    menuCode: "SHO-036",
    description: "Freshly prepared Womens Shaving Blade from our menu.",
    category: cat_shop_items._id,
    basePricePence: 250,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 36,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_flash_bleach_spray = await MenuItem.create({
    tenant: tenantId,
    name: "Flash Bleach Spray",
    menuCode: "SHO-037",
    description: "Freshly prepared Flash Bleach Spray from our menu.",
    category: cat_shop_items._id,
    basePricePence: 260,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 37,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_myco_scales_001gm_100gm = await MenuItem.create({
    tenant: tenantId,
    name: "Myco Scales 0.01gm - 100gm",
    menuCode: "SHO-038",
    description: "Freshly prepared Myco Scales 0.01gm - 100gm from our menu.",
    category: cat_shop_items._id,
    basePricePence: 2500,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 38,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_samsung_micro_usb_cable = await MenuItem.create({
    tenant: tenantId,
    name: "Samsung Micro USB Cable",
    menuCode: "SHO-039",
    description: "Freshly prepared Samsung Micro USB Cable from our menu.",
    category: cat_shop_items._id,
    basePricePence: 800,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 39,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_aux_lead = await MenuItem.create({
    tenant: tenantId,
    name: "Aux Lead",
    menuCode: "SHO-040",
    description: "Freshly prepared Aux Lead from our menu.",
    category: cat_shop_items._id,
    basePricePence: 600,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 40,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_iphone_braded_15_mtr_lead = await MenuItem.create({
    tenant: tenantId,
    name: "Iphone Braded 1.5 Mtr Lead",
    menuCode: "SHO-041",
    description: "Freshly prepared Iphone Braded 1.5 Mtr Lead from our menu.",
    category: cat_shop_items._id,
    basePricePence: 1200,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 41,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_bachelors_cup_a_soup_asparagus = await MenuItem.create({
    tenant: tenantId,
    name: "Bachelors Cup A Soup Asparagus",
    menuCode: "SHO-042",
    description: "Freshly prepared Bachelors Cup A Soup Asparagus from our menu.",
    category: cat_shop_items._id,
    basePricePence: 190,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 42,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_bachelors_cup_a_soup_chicken_mushroom = await MenuItem.create({
    tenant: tenantId,
    name: "Bachelors Cup A Soup Chicken Mushroom",
    menuCode: "SHO-043",
    description: "Freshly prepared Bachelors Cup A Soup Chicken Mushroom from our menu.",
    category: cat_shop_items._id,
    basePricePence: 190,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 43,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_bachelors_cup_a_soup_broccoli_cauliflower = await MenuItem.create({
    tenant: tenantId,
    name: "Bachelors Cup A Soup Broccoli & Cauliflower",
    menuCode: "SHO-044",
    description: "Freshly prepared Bachelors Cup A Soup Broccoli & Cauliflower from our menu.",
    category: cat_shop_items._id,
    basePricePence: 190,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 44,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_tuna_chunks_in_sunflower = await MenuItem.create({
    tenant: tenantId,
    name: "Tuna Chunks In Sunflower",
    menuCode: "SHO-045",
    description: "Freshly prepared Tuna Chunks In Sunflower from our menu.",
    category: cat_shop_items._id,
    basePricePence: 300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 45,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_tuna_chunks_in_brine = await MenuItem.create({
    tenant: tenantId,
    name: "Tuna Chunks In Brine",
    menuCode: "SHO-046",
    description: "Freshly prepared Tuna Chunks In Brine from our menu.",
    category: cat_shop_items._id,
    basePricePence: 300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 46,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_kitchen_foil = await MenuItem.create({
    tenant: tenantId,
    name: "Kitchen Foil",
    menuCode: "SHO-047",
    description: "Freshly prepared Kitchen Foil from our menu.",
    category: cat_shop_items._id,
    basePricePence: 300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 47,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cling_film = await MenuItem.create({
    tenant: tenantId,
    name: "Cling Film",
    menuCode: "SHO-048",
    description: "Freshly prepared Cling Film from our menu.",
    category: cat_shop_items._id,
    basePricePence: 300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 48,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_roberts_medium_loaf_bread = await MenuItem.create({
    tenant: tenantId,
    name: "Roberts Medium Loaf Bread",
    menuCode: "SHO-049",
    description: "Freshly prepared Roberts Medium Loaf Bread from our menu.",
    category: cat_shop_items._id,
    basePricePence: 229,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 49,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_nutella_jar = await MenuItem.create({
    tenant: tenantId,
    name: "Nutella Jar",
    menuCode: "SHO-050",
    description: "Freshly prepared Nutella Jar from our menu.",
    category: cat_shop_items._id,
    basePricePence: 390,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 50,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_ambrosia_custard_1_kg = await MenuItem.create({
    tenant: tenantId,
    name: "Ambrosia Custard 1 Kg",
    menuCode: "SHO-051",
    description: "Freshly prepared Ambrosia Custard 1 Kg from our menu.",
    category: cat_shop_items._id,
    basePricePence: 300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 51,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_fairy_original = await MenuItem.create({
    tenant: tenantId,
    name: "Fairy Original",
    menuCode: "SHO-052",
    description: "Freshly prepared Fairy Original from our menu.",
    category: cat_shop_items._id,
    basePricePence: 190,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 52,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_heinz_chicken_soup = await MenuItem.create({
    tenant: tenantId,
    name: "Heinz Chicken Soup",
    menuCode: "SHO-053",
    description: "Freshly prepared Heinz Chicken Soup from our menu.",
    category: cat_shop_items._id,
    basePricePence: 220,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 53,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_heinz_oxtail_soup = await MenuItem.create({
    tenant: tenantId,
    name: "Heinz Oxtail Soup",
    menuCode: "SHO-054",
    description: "Freshly prepared Heinz Oxtail Soup from our menu.",
    category: cat_shop_items._id,
    basePricePence: 220,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 54,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_heinz_beef_broth = await MenuItem.create({
    tenant: tenantId,
    name: "Heinz Beef Broth",
    menuCode: "SHO-055",
    description: "Freshly prepared Heinz Beef Broth from our menu.",
    category: cat_shop_items._id,
    basePricePence: 220,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 55,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_heinz_minestrone_soup = await MenuItem.create({
    tenant: tenantId,
    name: "Heinz Minestrone Soup",
    menuCode: "SHO-056",
    description: "Freshly prepared Heinz Minestrone Soup from our menu.",
    category: cat_shop_items._id,
    basePricePence: 220,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 56,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_heinz_scotch_broth = await MenuItem.create({
    tenant: tenantId,
    name: "Heinz Scotch Broth",
    menuCode: "SHO-057",
    description: "Freshly prepared Heinz Scotch Broth from our menu.",
    category: cat_shop_items._id,
    basePricePence: 220,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 57,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_heinz_mushroom_soup = await MenuItem.create({
    tenant: tenantId,
    name: "Heinz Mushroom Soup",
    menuCode: "SHO-058",
    description: "Freshly prepared Heinz Mushroom Soup from our menu.",
    category: cat_shop_items._id,
    basePricePence: 220,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 58,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_heinz_hoops = await MenuItem.create({
    tenant: tenantId,
    name: "Heinz Hoops",
    menuCode: "SHO-059",
    description: "Freshly prepared Heinz Hoops from our menu.",
    category: cat_shop_items._id,
    basePricePence: 240,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 59,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_heinz_macaroni_cheese = await MenuItem.create({
    tenant: tenantId,
    name: "Heinz Macaroni Cheese",
    menuCode: "SHO-060",
    description: "Freshly prepared Heinz Macaroni Cheese from our menu.",
    category: cat_shop_items._id,
    basePricePence: 290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 60,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_napolina_chopped_tomatoes = await MenuItem.create({
    tenant: tenantId,
    name: "Napolina Chopped Tomatoes",
    menuCode: "SHO-061",
    description: "Freshly prepared Napolina Chopped Tomatoes from our menu.",
    category: cat_shop_items._id,
    basePricePence: 190,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 61,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_bisto_gravy_granules = await MenuItem.create({
    tenant: tenantId,
    name: "Bisto Gravy Granules",
    menuCode: "SHO-062",
    description: "Freshly prepared Bisto Gravy Granules from our menu.",
    category: cat_shop_items._id,
    basePricePence: 300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 62,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_oxo_beef = await MenuItem.create({
    tenant: tenantId,
    name: "Oxo Beef",
    menuCode: "SHO-063",
    description: "Freshly prepared Oxo Beef from our menu.",
    category: cat_shop_items._id,
    basePricePence: 300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 63,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_ambrosia_custard_400gm = await MenuItem.create({
    tenant: tenantId,
    name: "Ambrosia Custard 400gm",
    menuCode: "SHO-064",
    description: "Freshly prepared Ambrosia Custard 400gm from our menu.",
    category: cat_shop_items._id,
    basePricePence: 200,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 64,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_glass_tumblers_12 = await MenuItem.create({
    tenant: tenantId,
    name: "Glass Tumblers 12",
    menuCode: "SHO-065",
    description: "Freshly prepared Glass Tumblers 12 from our menu.",
    category: cat_shop_items._id,
    basePricePence: 300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 65,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cooking_sunflower_oil_1ltr = await MenuItem.create({
    tenant: tenantId,
    name: "Cooking Sunflower Oil 1ltr",
    menuCode: "SHO-066",
    description: "Freshly prepared Cooking Sunflower Oil 1ltr from our menu.",
    category: cat_shop_items._id,
    basePricePence: 300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 66,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cooking_vegetable_oil = await MenuItem.create({
    tenant: tenantId,
    name: "Cooking Vegetable Oil",
    menuCode: "SHO-067",
    description: "Freshly prepared Cooking Vegetable Oil from our menu.",
    category: cat_shop_items._id,
    basePricePence: 300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 67,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_calpol_infant_2_months = await MenuItem.create({
    tenant: tenantId,
    name: "Calpol Infant 2 Months",
    menuCode: "SHO-068",
    description: "Freshly prepared Calpol Infant 2 Months from our menu.",
    category: cat_shop_items._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 68,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_calpol_ibuprofen_3_months = await MenuItem.create({
    tenant: tenantId,
    name: "Calpol Ibuprofen 3 Months",
    menuCode: "SHO-069",
    description: "Freshly prepared Calpol Ibuprofen 3 Months from our menu.",
    category: cat_shop_items._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 69,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_nurofen_for_children_3_months_to_9_years = await MenuItem.create({
    tenant: tenantId,
    name: "Nurofen For Children 3 Months To 9 Years",
    menuCode: "SHO-070",
    description: "Freshly prepared Nurofen For Children 3 Months To 9 Years from our menu.",
    category: cat_shop_items._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 70,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_beechams_max_strength_16_capsules = await MenuItem.create({
    tenant: tenantId,
    name: "Beechams Max Strength 16 Capsules",
    menuCode: "SHO-071",
    description: "Freshly prepared Beechams Max Strength 16 Capsules from our menu.",
    category: cat_shop_items._id,
    basePricePence: 590,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 71,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_anadin_extra_tablets = await MenuItem.create({
    tenant: tenantId,
    name: "Anadin Extra Tablets",
    menuCode: "SHO-072",
    description: "Freshly prepared Anadin Extra Tablets from our menu.",
    category: cat_shop_items._id,
    basePricePence: 400,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 72,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_nurofen_tablets = await MenuItem.create({
    tenant: tenantId,
    name: "Nurofen Tablets",
    menuCode: "SHO-073",
    description: "Freshly prepared Nurofen Tablets from our menu.",
    category: cat_shop_items._id,
    basePricePence: 490,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 73,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_benylin_cold_flu_max_strength_capsules = await MenuItem.create({
    tenant: tenantId,
    name: "Benylin Cold & Flu Max Strength Capsules",
    menuCode: "SHO-074",
    description: "Freshly prepared Benylin Cold & Flu Max Strength Capsules from our menu.",
    category: cat_shop_items._id,
    basePricePence: 480,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 74,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_paracetamol_tubs = await MenuItem.create({
    tenant: tenantId,
    name: "Paracetamol Tubs",
    menuCode: "SHO-075",
    description: "Freshly prepared Paracetamol Tubs from our menu.",
    category: cat_shop_items._id,
    basePricePence: 190,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 75,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_vicks_vapour_rub = await MenuItem.create({
    tenant: tenantId,
    name: "Vicks Vapour Rub",
    menuCode: "SHO-076",
    description: "Freshly prepared Vicks Vapour Rub from our menu.",
    category: cat_shop_items._id,
    basePricePence: 490,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 76,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_strepsils_original = await MenuItem.create({
    tenant: tenantId,
    name: "Strepsils Original",
    menuCode: "SHO-077",
    description: "Freshly prepared Strepsils Original from our menu.",
    category: cat_shop_items._id,
    basePricePence: 490,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 77,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_strepsils_honey_lemon = await MenuItem.create({
    tenant: tenantId,
    name: "Strepsils Honey & Lemon",
    menuCode: "SHO-078",
    description: "Freshly prepared Strepsils Honey & Lemon from our menu.",
    category: cat_shop_items._id,
    basePricePence: 490,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 78,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_calpol_6_years = await MenuItem.create({
    tenant: tenantId,
    name: "Calpol 6 + Years",
    menuCode: "SHO-079",
    description: "Freshly prepared Calpol 6 + Years from our menu.",
    category: cat_shop_items._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 79,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_benylin_chesty_cough = await MenuItem.create({
    tenant: tenantId,
    name: "Benylin Chesty Cough",
    menuCode: "SHO-080",
    description: "Freshly prepared Benylin Chesty Cough from our menu.",
    category: cat_shop_items._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 80,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_benylin_dry_cough_for_children = await MenuItem.create({
    tenant: tenantId,
    name: "Benylin Dry Cough For Children",
    menuCode: "SHO-081",
    description: "Freshly prepared Benylin Dry Cough For Children from our menu.",
    category: cat_shop_items._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 81,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_gaviscon_bottle = await MenuItem.create({
    tenant: tenantId,
    name: "Gaviscon Bottle",
    menuCode: "SHO-082",
    description: "Freshly prepared Gaviscon Bottle from our menu.",
    category: cat_shop_items._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 82,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_sudafed_congestion_headache_max_strength = await MenuItem.create({
    tenant: tenantId,
    name: "Sudafed Congestion & Headache Max Strength",
    menuCode: "SHO-083",
    description: "Freshly prepared Sudafed Congestion & Headache Max Strength from our menu.",
    category: cat_shop_items._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 83,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_covonia_dry_tickly_cough = await MenuItem.create({
    tenant: tenantId,
    name: "Covonia Dry & Tickly Cough",
    menuCode: "SHO-084",
    description: "Freshly prepared Covonia Dry & Tickly Cough from our menu.",
    category: cat_shop_items._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 84,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_covonia_chesty_cough = await MenuItem.create({
    tenant: tenantId,
    name: "Covonia Chesty Cough",
    menuCode: "SHO-085",
    description: "Freshly prepared Covonia Chesty Cough from our menu.",
    category: cat_shop_items._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 85,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_vaseline_tubs = await MenuItem.create({
    tenant: tenantId,
    name: "Vaseline Tubs",
    menuCode: "SHO-086",
    description: "Freshly prepared Vaseline Tubs from our menu.",
    category: cat_shop_items._id,
    basePricePence: 250,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 86,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_bonjela_kids_ulcers = await MenuItem.create({
    tenant: tenantId,
    name: "Bonjela Kids (ulcers)",
    menuCode: "SHO-087",
    description: "Freshly prepared Bonjela Kids (ulcers) from our menu.",
    category: cat_shop_items._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 87,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_bonjela_adult = await MenuItem.create({
    tenant: tenantId,
    name: "Bonjela Adult",
    menuCode: "SHO-088",
    description: "Freshly prepared Bonjela Adult from our menu.",
    category: cat_shop_items._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 88,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_beechams_all_in_one_max_strength_160ml = await MenuItem.create({
    tenant: tenantId,
    name: "Beechams All In One Max Strength 160ml",
    menuCode: "SHO-089",
    description: "Freshly prepared Beechams All In One Max Strength 160ml from our menu.",
    category: cat_shop_items._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 89,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_proplus_caffeine_tablets = await MenuItem.create({
    tenant: tenantId,
    name: "Proplus Caffeine Tablets",
    menuCode: "SHO-090",
    description: "Freshly prepared Proplus Caffeine Tablets from our menu.",
    category: cat_shop_items._id,
    basePricePence: 380,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 90,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_gaviscon_double_action_150ml = await MenuItem.create({
    tenant: tenantId,
    name: "Gaviscon Double Action 150ml",
    menuCode: "SHO-091",
    description: "Freshly prepared Gaviscon Double Action 150ml from our menu.",
    category: cat_shop_items._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 91,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_lemsip_max_blackcurrent = await MenuItem.create({
    tenant: tenantId,
    name: "Lemsip Max Blackcurrent",
    menuCode: "SHO-092",
    description: "Freshly prepared Lemsip Max Blackcurrent from our menu.",
    category: cat_shop_items._id,
    basePricePence: 590,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 92,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_deep_heat_rub = await MenuItem.create({
    tenant: tenantId,
    name: "Deep Heat Rub",
    menuCode: "SHO-093",
    description: "Freshly prepared Deep Heat Rub from our menu.",
    category: cat_shop_items._id,
    basePricePence: 480,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 93,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_vicks_sinex_unblock_nose = await MenuItem.create({
    tenant: tenantId,
    name: "Vicks Sinex Unblock Nose",
    menuCode: "SHO-094",
    description: "Freshly prepared Vicks Sinex Unblock Nose from our menu.",
    category: cat_shop_items._id,
    basePricePence: 590,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 94,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_alka_seltzer_original = await MenuItem.create({
    tenant: tenantId,
    name: "Alka Seltzer Original",
    menuCode: "SHO-095",
    description: "Freshly prepared Alka Seltzer Original from our menu.",
    category: cat_shop_items._id,
    basePricePence: 400,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 95,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_panadol_extra_advance = await MenuItem.create({
    tenant: tenantId,
    name: "Panadol Extra Advance",
    menuCode: "SHO-096",
    description: "Freshly prepared Panadol Extra Advance from our menu.",
    category: cat_shop_items._id,
    basePricePence: 390,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 96,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_benylin_dry_tickly_cough_syrup = await MenuItem.create({
    tenant: tenantId,
    name: "Benylin Dry & Tickly Cough Syrup",
    menuCode: "SHO-097",
    description: "Freshly prepared Benylin Dry & Tickly Cough Syrup from our menu.",
    category: cat_shop_items._id,
    basePricePence: 680,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 97,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_nurofen_tablets_200mg = await MenuItem.create({
    tenant: tenantId,
    name: "Nurofen Tablets 200mg",
    menuCode: "SHO-098",
    description: "Freshly prepared Nurofen Tablets 200mg from our menu.",
    category: cat_shop_items._id,
    basePricePence: 480,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 98,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_elastoplast_waterproof_plasters = await MenuItem.create({
    tenant: tenantId,
    name: "Elastoplast Waterproof Plasters",
    menuCode: "SHO-099",
    description: "Freshly prepared Elastoplast Waterproof Plasters from our menu.",
    category: cat_shop_items._id,
    basePricePence: 260,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 99,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_nurofen_express = await MenuItem.create({
    tenant: tenantId,
    name: "Nurofen Express",
    menuCode: "SHO-100",
    description: "Freshly prepared Nurofen Express from our menu.",
    category: cat_shop_items._id,
    basePricePence: 490,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 100,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_andain_extra_16_tablets = await MenuItem.create({
    tenant: tenantId,
    name: "Andain Extra 16 Tablets",
    menuCode: "SHO-101",
    description: "Freshly prepared Andain Extra 16 Tablets from our menu.",
    category: cat_shop_items._id,
    basePricePence: 590,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 101,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_sudocrem_antiseptic_healing_cream = await MenuItem.create({
    tenant: tenantId,
    name: "Sudocrem Antiseptic Healing Cream",
    menuCode: "SHO-102",
    description: "Freshly prepared Sudocrem Antiseptic Healing Cream from our menu.",
    category: cat_shop_items._id,
    basePricePence: 600,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 102,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_piriteze_allergy_tablets = await MenuItem.create({
    tenant: tenantId,
    name: "Piriteze Allergy Tablets",
    menuCode: "SHO-103",
    description: "Freshly prepared Piriteze Allergy Tablets from our menu.",
    category: cat_shop_items._id,
    basePricePence: 490,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 103,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_medisure_pregnancy_test = await MenuItem.create({
    tenant: tenantId,
    name: "Medisure Pregnancy Test",
    menuCode: "SHO-104",
    description: "Freshly prepared Medisure Pregnancy Test from our menu.",
    category: cat_shop_items._id,
    basePricePence: 390,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 104,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_immodium_original = await MenuItem.create({
    tenant: tenantId,
    name: "Immodium Original",
    menuCode: "SHO-105",
    description: "Freshly prepared Immodium Original from our menu.",
    category: cat_shop_items._id,
    basePricePence: 590,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 105,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_rennie_peppermint = await MenuItem.create({
    tenant: tenantId,
    name: "Rennie Peppermint",
    menuCode: "SHO-106",
    description: "Freshly prepared Rennie Peppermint from our menu.",
    category: cat_shop_items._id,
    basePricePence: 490,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 106,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_pacifiers_x_2 = await MenuItem.create({
    tenant: tenantId,
    name: "Pacifiers X 2",
    menuCode: "SHO-107",
    description: "Freshly prepared Pacifiers X 2 from our menu.",
    category: cat_shop_items._id,
    basePricePence: 300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 107,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_baby_bottle = await MenuItem.create({
    tenant: tenantId,
    name: "Baby Bottle",
    menuCode: "SHO-108",
    description: "Freshly prepared Baby Bottle from our menu.",
    category: cat_shop_items._id,
    basePricePence: 250,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 108,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_jhonsons_baby_shampoo = await MenuItem.create({
    tenant: tenantId,
    name: "Jhonsons Baby Shampoo",
    menuCode: "SHO-109",
    description: "Freshly prepared Jhonsons Baby Shampoo from our menu.",
    category: cat_shop_items._id,
    basePricePence: 400,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 109,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_pampers_size_3 = await MenuItem.create({
    tenant: tenantId,
    name: "Pampers Size 3",
    menuCode: "SHO-110",
    description: "Freshly prepared Pampers Size 3 from our menu.",
    category: cat_shop_items._id,
    basePricePence: 650,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 110,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_butter_cup_syrup_non_drowsy = await MenuItem.create({
    tenant: tenantId,
    name: "Butter Cup Syrup Non Drowsy",
    menuCode: "SHO-111",
    description: "Freshly prepared Butter Cup Syrup Non Drowsy from our menu.",
    category: cat_shop_items._id,
    basePricePence: 690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 111,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_durex_6_condoms = await MenuItem.create({
    tenant: tenantId,
    name: "Durex 6 Condoms",
    menuCode: "SHO-112",
    description: "Freshly prepared Durex 6 Condoms from our menu.",
    category: cat_shop_items._id,
    basePricePence: 700,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 112,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_sudafed_blocked_nose_spray = await MenuItem.create({
    tenant: tenantId,
    name: "Sudafed Blocked Nose Spray",
    menuCode: "SHO-113",
    description: "Freshly prepared Sudafed Blocked Nose Spray from our menu.",
    category: cat_shop_items._id,
    basePricePence: 590,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 113,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_durex_3_condoms = await MenuItem.create({
    tenant: tenantId,
    name: "Durex 3 Condoms",
    menuCode: "SHO-114",
    description: "Freshly prepared Durex 3 Condoms from our menu.",
    category: cat_shop_items._id,
    basePricePence: 450,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 114,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_lemsip_cold_flu_max_lemon = await MenuItem.create({
    tenant: tenantId,
    name: "Lemsip Cold & Flu Max Lemon",
    menuCode: "SHO-115",
    description: "Freshly prepared Lemsip Cold & Flu Max Lemon from our menu.",
    category: cat_shop_items._id,
    basePricePence: 590,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 115,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_vicks_inhaler_nasal_stick = await MenuItem.create({
    tenant: tenantId,
    name: "Vicks Inhaler Nasal Stick",
    menuCode: "SHO-116",
    description: "Freshly prepared Vicks Inhaler Nasal Stick from our menu.",
    category: cat_shop_items._id,
    basePricePence: 320,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 116,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_strepsils_extra_tripple_action_24_lozenges = await MenuItem.create({
    tenant: tenantId,
    name: "Strepsils Extra Tripple Action 24 Lozenges",
    menuCode: "SHO-117",
    description: "Freshly prepared Strepsils Extra Tripple Action 24 Lozenges from our menu.",
    category: cat_shop_items._id,
    basePricePence: 600,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 117,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_iburonfen_200mg_16_tab = await MenuItem.create({
    tenant: tenantId,
    name: "Iburonfen 200mg 16 Tab",
    menuCode: "SHO-118",
    description: "Freshly prepared Iburonfen 200mg 16 Tab from our menu.",
    category: cat_shop_items._id,
    basePricePence: 250,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 118,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_panadol_advance_500mg_tablets = await MenuItem.create({
    tenant: tenantId,
    name: "Panadol Advance 500mg Tablets",
    menuCode: "SHO-119",
    description: "Freshly prepared Panadol Advance 500mg Tablets from our menu.",
    category: cat_shop_items._id,
    basePricePence: 400,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 119,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_calpolprofen_iuprofen_3_months = await MenuItem.create({
    tenant: tenantId,
    name: "Calpolprofen Iuprofen 3+ Months",
    menuCode: "SHO-120",
    description: "Freshly prepared Calpolprofen Iuprofen 3+ Months from our menu.",
    category: cat_shop_items._id,
    basePricePence: 680,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 120,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_gaviscon_double_action_12_chewable_tablets = await MenuItem.create({
    tenant: tenantId,
    name: "Gaviscon Double Action 12 Chewable Tablets",
    menuCode: "SHO-121",
    description: "Freshly prepared Gaviscon Double Action 12 Chewable Tablets from our menu.",
    category: cat_shop_items._id,
    basePricePence: 590,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 121,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_nurofen_cold_flu_relief = await MenuItem.create({
    tenant: tenantId,
    name: "Nurofen Cold & Flu Relief",
    menuCode: "SHO-122",
    description: "Freshly prepared Nurofen Cold & Flu Relief from our menu.",
    category: cat_shop_items._id,
    basePricePence: 480,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 122,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_nuromol_dual_action_pain_releif = await MenuItem.create({
    tenant: tenantId,
    name: "Nuromol Dual Action Pain Releif",
    menuCode: "SHO-123",
    description: "Freshly prepared Nuromol Dual Action Pain Releif from our menu.",
    category: cat_shop_items._id,
    basePricePence: 599,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 123,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_aspirin_tablets = await MenuItem.create({
    tenant: tenantId,
    name: "Aspirin Tablets",
    menuCode: "SHO-124",
    description: "Freshly prepared Aspirin Tablets from our menu.",
    category: cat_shop_items._id,
    basePricePence: 200,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 124,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_deep_heat_relief_spray_150ml = await MenuItem.create({
    tenant: tenantId,
    name: "Deep Heat Relief Spray 150ml",
    menuCode: "SHO-125",
    description: "Freshly prepared Deep Heat Relief Spray 150ml from our menu.",
    category: cat_shop_items._id,
    basePricePence: 590,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 125,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_lemsip_max_day_night_flu_16_capsules = await MenuItem.create({
    tenant: tenantId,
    name: "Lemsip Max Day & Night Flu 16 Capsules",
    menuCode: "SHO-126",
    description: "Freshly prepared Lemsip Max Day & Night Flu 16 Capsules from our menu.",
    category: cat_shop_items._id,
    basePricePence: 600,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 126,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_immodium_instants = await MenuItem.create({
    tenant: tenantId,
    name: "Immodium Instants",
    menuCode: "SHO-127",
    description: "Freshly prepared Immodium Instants from our menu.",
    category: cat_shop_items._id,
    basePricePence: 590,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 127,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_rennie_spearmint = await MenuItem.create({
    tenant: tenantId,
    name: "Rennie Spearmint",
    menuCode: "SHO-128",
    description: "Freshly prepared Rennie Spearmint from our menu.",
    category: cat_shop_items._id,
    basePricePence: 490,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 128,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_rennie_liquid_heatburn_relief = await MenuItem.create({
    tenant: tenantId,
    name: "Rennie Liquid Heatburn Relief",
    menuCode: "SHO-129",
    description: "Freshly prepared Rennie Liquid Heatburn Relief from our menu.",
    category: cat_shop_items._id,
    basePricePence: 590,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 129,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_baby_wipes = await MenuItem.create({
    tenant: tenantId,
    name: "Baby Wipes",
    menuCode: "SHO-130",
    description: "Freshly prepared Baby Wipes from our menu.",
    category: cat_shop_items._id,
    basePricePence: 290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 130,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_200pcs_cotton_buds = await MenuItem.create({
    tenant: tenantId,
    name: "200pcs Cotton Buds",
    menuCode: "SHO-131",
    description: "Freshly prepared 200pcs Cotton Buds from our menu.",
    category: cat_shop_items._id,
    basePricePence: 250,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 131,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_pampers_size_4 = await MenuItem.create({
    tenant: tenantId,
    name: "Pampers Size 4",
    menuCode: "SHO-132",
    description: "Freshly prepared Pampers Size 4 from our menu.",
    category: cat_shop_items._id,
    basePricePence: 650,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 132,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_pampers_size_5 = await MenuItem.create({
    tenant: tenantId,
    name: "Pampers Size 5",
    menuCode: "SHO-133",
    description: "Freshly prepared Pampers Size 5 from our menu.",
    category: cat_shop_items._id,
    basePricePence: 650,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 133,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_pampers_size_6 = await MenuItem.create({
    tenant: tenantId,
    name: "Pampers Size 6",
    menuCode: "SHO-134",
    description: "Freshly prepared Pampers Size 6 from our menu.",
    category: cat_shop_items._id,
    basePricePence: 650,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 134,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cowgate_follow_on_2 = await MenuItem.create({
    tenant: tenantId,
    name: "Cow&gate Follow On 2",
    menuCode: "SHO-135",
    description: "Freshly prepared Cow&gate Follow On 2 from our menu.",
    category: cat_shop_items._id,
    basePricePence: 1390,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 135,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_jhonson_baby_powder = await MenuItem.create({
    tenant: tenantId,
    name: "Jhonson Baby Powder",
    menuCode: "SHO-136",
    description: "Freshly prepared Jhonson Baby Powder from our menu.",
    category: cat_shop_items._id,
    basePricePence: 280,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 136,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_jhonson_baby_lotion = await MenuItem.create({
    tenant: tenantId,
    name: "Jhonson Baby Lotion",
    menuCode: "SHO-137",
    description: "Freshly prepared Jhonson Baby Lotion from our menu.",
    category: cat_shop_items._id,
    basePricePence: 300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 137,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_doritos_hot_chilli_180_gm = await MenuItem.create({
    tenant: tenantId,
    name: "Doritos Hot Chilli 180 Gm",
    menuCode: "SHO-138",
    description: "Freshly prepared Doritos Hot Chilli 180 Gm from our menu.",
    category: cat_shop_items._id,
    basePricePence: 290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 138,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_doritos_dips_cool_sour_cream = await MenuItem.create({
    tenant: tenantId,
    name: "Doritos Dips Cool Sour Cream",
    menuCode: "SHO-139",
    description: "Freshly prepared Doritos Dips Cool Sour Cream from our menu.",
    category: cat_shop_items._id,
    basePricePence: 320,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 139,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_walkers_quavers = await MenuItem.create({
    tenant: tenantId,
    name: "Walkers Quavers",
    menuCode: "SHO-140",
    description: "Freshly prepared Walkers Quavers from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 140,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_pom_pom_bears_original = await MenuItem.create({
    tenant: tenantId,
    name: "Pom Pom Bears Original",
    menuCode: "SHO-141",
    description: "Freshly prepared Pom Pom Bears Original from our menu.",
    category: cat_shop_items._id,
    basePricePence: 90,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 141,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_walkers_squares_crunch = await MenuItem.create({
    tenant: tenantId,
    name: "Walkers Squares Crunch",
    menuCode: "SHO-142",
    description: "Freshly prepared Walkers Squares Crunch from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 142,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_walkers_salt_and_vinegar = await MenuItem.create({
    tenant: tenantId,
    name: "Walkers Salt And Vinegar",
    menuCode: "SHO-143",
    description: "Freshly prepared Walkers Salt And Vinegar from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 143,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_doritos_chilli_heatwave = await MenuItem.create({
    tenant: tenantId,
    name: "Doritos Chilli Heatwave",
    menuCode: "SHO-144",
    description: "Freshly prepared Doritos Chilli Heatwave from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 144,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_pringles_texas_bbq = await MenuItem.create({
    tenant: tenantId,
    name: "Large Pringles Texas Bbq",
    menuCode: "SHO-145",
    description: "Freshly prepared Large Pringles Texas Bbq from our menu.",
    category: cat_shop_items._id,
    basePricePence: 340,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 145,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_pringles_original = await MenuItem.create({
    tenant: tenantId,
    name: "Large Pringles Original",
    menuCode: "SHO-146",
    description: "Freshly prepared Large Pringles Original from our menu.",
    category: cat_shop_items._id,
    basePricePence: 340,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 146,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_pringles_salt_vinegar = await MenuItem.create({
    tenant: tenantId,
    name: "Large Pringles Salt Vinegar",
    menuCode: "SHO-147",
    description: "Freshly prepared Large Pringles Salt Vinegar from our menu.",
    category: cat_shop_items._id,
    basePricePence: 340,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 147,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_pringles_flamed_grill_steak = await MenuItem.create({
    tenant: tenantId,
    name: "Large Pringles Flamed Grill Steak",
    menuCode: "SHO-148",
    description: "Freshly prepared Large Pringles Flamed Grill Steak from our menu.",
    category: cat_shop_items._id,
    basePricePence: 340,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 148,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hula_hoops_beef = await MenuItem.create({
    tenant: tenantId,
    name: "Hula Hoops Beef",
    menuCode: "SHO-149",
    description: "Freshly prepared Hula Hoops Beef from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 149,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_butterkist_crinchy_toffee = await MenuItem.create({
    tenant: tenantId,
    name: "Butterkist Crinchy Toffee",
    menuCode: "SHO-150",
    description: "Freshly prepared Butterkist Crinchy Toffee from our menu.",
    category: cat_shop_items._id,
    basePricePence: 190,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 150,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_crunchips_x_cut_salted = await MenuItem.create({
    tenant: tenantId,
    name: "Crunchips X Cut Salted",
    menuCode: "SHO-151",
    description: "Freshly prepared Crunchips X Cut Salted from our menu.",
    category: cat_shop_items._id,
    basePricePence: 190,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 151,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cofresh_bombay_mix = await MenuItem.create({
    tenant: tenantId,
    name: "Cofresh Bombay Mix",
    menuCode: "SHO-152",
    description: "Freshly prepared Cofresh Bombay Mix from our menu.",
    category: cat_shop_items._id,
    basePricePence: 160,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 152,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cofresh_chana_dal_300gm = await MenuItem.create({
    tenant: tenantId,
    name: "Cofresh Chana Dal 300gm",
    menuCode: "SHO-153",
    description: "Freshly prepared Cofresh Chana Dal 300gm from our menu.",
    category: cat_shop_items._id,
    basePricePence: 200,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 153,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_dry_roasted_peanuts = await MenuItem.create({
    tenant: tenantId,
    name: "Dry Roasted Peanuts",
    menuCode: "SHO-154",
    description: "Freshly prepared Dry Roasted Peanuts from our menu.",
    category: cat_shop_items._id,
    basePricePence: 220,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 154,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mc_coys_flame_grilled = await MenuItem.create({
    tenant: tenantId,
    name: "Mc Coys Flame Grilled",
    menuCode: "SHO-155",
    description: "Freshly prepared Mc Coys Flame Grilled from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 155,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mc_coys_cheddar_onion_crisps = await MenuItem.create({
    tenant: tenantId,
    name: "Mc Coys Cheddar & Onion Crisps",
    menuCode: "SHO-156",
    description: "Freshly prepared Mc Coys Cheddar & Onion Crisps from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 156,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cowgate_first_infant_1 = await MenuItem.create({
    tenant: tenantId,
    name: "Cow&gate First Infant 1",
    menuCode: "SHO-157",
    description: "Freshly prepared Cow&gate First Infant 1 from our menu.",
    category: cat_shop_items._id,
    basePricePence: 1390,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 157,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cow_gate_infant_milk_hungrier_babies_from_birth = await MenuItem.create({
    tenant: tenantId,
    name: "Cow & Gate Infant Milk Hungrier Babies From Birth",
    menuCode: "SHO-158",
    description: "Freshly prepared Cow & Gate Infant Milk Hungrier Babies From Birth from our menu.",
    category: cat_shop_items._id,
    basePricePence: 1390,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 158,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_jhonson_baby_oil = await MenuItem.create({
    tenant: tenantId,
    name: "Jhonson Baby Oil",
    menuCode: "SHO-159",
    description: "Freshly prepared Jhonson Baby Oil from our menu.",
    category: cat_shop_items._id,
    basePricePence: 320,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 159,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_doritos_tangy_cheese_180_gm = await MenuItem.create({
    tenant: tenantId,
    name: "Doritos Tangy Cheese 180 Gm",
    menuCode: "SHO-160",
    description: "Freshly prepared Doritos Tangy Cheese 180 Gm from our menu.",
    category: cat_shop_items._id,
    basePricePence: 290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 160,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_doritos_dips_hot_chilli = await MenuItem.create({
    tenant: tenantId,
    name: "Doritos Dips Hot Chilli",
    menuCode: "SHO-161",
    description: "Freshly prepared Doritos Dips Hot Chilli from our menu.",
    category: cat_shop_items._id,
    basePricePence: 320,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 161,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_doritos_dips_nacho_cheese = await MenuItem.create({
    tenant: tenantId,
    name: "Doritos Dips Nacho Cheese",
    menuCode: "SHO-162",
    description: "Freshly prepared Doritos Dips Nacho Cheese from our menu.",
    category: cat_shop_items._id,
    basePricePence: 320,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 162,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_walkers_prawn_cocktail = await MenuItem.create({
    tenant: tenantId,
    name: "Walkers Prawn Cocktail",
    menuCode: "SHO-163",
    description: "Freshly prepared Walkers Prawn Cocktail from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 163,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_walkers_max_flame_grilled_steak = await MenuItem.create({
    tenant: tenantId,
    name: "Walkers Max Flame Grilled Steak",
    menuCode: "SHO-164",
    description: "Freshly prepared Walkers Max Flame Grilled Steak from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 164,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_walkers_ready_salted = await MenuItem.create({
    tenant: tenantId,
    name: "Walkers Ready Salted",
    menuCode: "SHO-165",
    description: "Freshly prepared Walkers Ready Salted from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 165,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_walkers_cheese_and_onion = await MenuItem.create({
    tenant: tenantId,
    name: "Walkers Cheese And Onion",
    menuCode: "SHO-166",
    description: "Freshly prepared Walkers Cheese And Onion from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 166,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_doritos_tangy_cheese = await MenuItem.create({
    tenant: tenantId,
    name: "Doritos Tangy Cheese",
    menuCode: "SHO-167",
    description: "Freshly prepared Doritos Tangy Cheese from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 167,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_pringles_sour_cream = await MenuItem.create({
    tenant: tenantId,
    name: "Large Pringles Sour Cream",
    menuCode: "SHO-168",
    description: "Freshly prepared Large Pringles Sour Cream from our menu.",
    category: cat_shop_items._id,
    basePricePence: 340,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 168,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_walkers_paprika_max = await MenuItem.create({
    tenant: tenantId,
    name: "Walkers Paprika Max",
    menuCode: "SHO-169",
    description: "Freshly prepared Walkers Paprika Max from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 169,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_pringles_prawn_cocktail = await MenuItem.create({
    tenant: tenantId,
    name: "Large Pringles Prawn Cocktail",
    menuCode: "SHO-170",
    description: "Freshly prepared Large Pringles Prawn Cocktail from our menu.",
    category: cat_shop_items._id,
    basePricePence: 340,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 170,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_walkers_wotsis = await MenuItem.create({
    tenant: tenantId,
    name: "Walkers Wotsis",
    menuCode: "SHO-171",
    description: "Freshly prepared Walkers Wotsis from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 171,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mini_cheddars_smoky_bbq = await MenuItem.create({
    tenant: tenantId,
    name: "Mini Cheddars Smoky Bbq",
    menuCode: "SHO-172",
    description: "Freshly prepared Mini Cheddars Smoky Bbq from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 172,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_doritos_dips_mild_salsa = await MenuItem.create({
    tenant: tenantId,
    name: "Doritos Dips Mild Salsa",
    menuCode: "SHO-173",
    description: "Freshly prepared Doritos Dips Mild Salsa from our menu.",
    category: cat_shop_items._id,
    basePricePence: 320,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 173,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_crunchips_red_chilli = await MenuItem.create({
    tenant: tenantId,
    name: "Crunchips Red Chilli",
    menuCode: "SHO-174",
    description: "Freshly prepared Crunchips Red Chilli from our menu.",
    category: cat_shop_items._id,
    basePricePence: 190,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 174,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cofresh_chick_peas_300gms = await MenuItem.create({
    tenant: tenantId,
    name: "Cofresh Chick Peas 300gms",
    menuCode: "SHO-175",
    description: "Freshly prepared Cofresh Chick Peas 300gms from our menu.",
    category: cat_shop_items._id,
    basePricePence: 200,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 175,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_salted_peanuts = await MenuItem.create({
    tenant: tenantId,
    name: "Salted Peanuts",
    menuCode: "SHO-176",
    description: "Freshly prepared Salted Peanuts from our menu.",
    category: cat_shop_items._id,
    basePricePence: 220,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 176,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mc_coys_hot_n_spicy_crisp = await MenuItem.create({
    tenant: tenantId,
    name: "Mc coys hot n spicy crisp",
    menuCode: "SHO-177",
    description: "Freshly prepared Mc coys hot n spicy crisp from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 177,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mc_coys_sizzling_prawn_crisp = await MenuItem.create({
    tenant: tenantId,
    name: "Mc Coys Sizzling Prawn Crisp",
    menuCode: "SHO-178",
    description: "Freshly prepared Mc Coys Sizzling Prawn Crisp from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 178,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mc_coys_thai_sweet_chicken_crisps = await MenuItem.create({
    tenant: tenantId,
    name: "Mc Coys Thai Sweet Chicken Crisps",
    menuCode: "SHO-179",
    description: "Freshly prepared Mc Coys Thai Sweet Chicken Crisps from our menu.",
    category: cat_shop_items._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 179,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_portion_fried_onions = await MenuItem.create({
    tenant: tenantId,
    name: "Portion Fried Onions",
    menuCode: "SID-001",
    description: "Crispy, golden fried onions — the perfect crunchy topping or side to enhance your meal. Order now!",
    category: cat_side_orders._id,
    basePricePence: 459,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_portion_fried_mushrooms = await MenuItem.create({
    tenant: tenantId,
    name: "Portion Fried Mushrooms",
    menuCode: "SID-002",
    description: "Crispy on the outside, tender on the inside—golden fried mushrooms that add the perfect savory crunch to your meal. Order now!",
    category: cat_side_orders._id,
    basePricePence: 459,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_spicy_chicken_cooked_in_a_classic_madras_curry = await MenuItem.create({
    tenant: tenantId,
    name: "Spicy chicken cooked in a classic Madras curry",
    menuCode: "SID-003",
    description: "Spicy chicken cooked in a classic Madras curry — full of bold, vibrant flavors. Order now!",
    category: cat_side_orders._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_bhuna_chat_2 = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Bhuna Chat",
    menuCode: "SID-004",
    description: "Succulent chicken cooked in a thick, spiced Bhuna sauce with tomatoes — rich, hearty, and full of flavor. Order now!",
    category: cat_side_orders._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_dupliaza_chat_2 = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Dupliaza Chat",
    menuCode: "SID-005",
    description: "Juicy chicken cooked with plenty of onions, fresh green peppers, and tomatoes in a flavorful Dupliaza sauce — rich, tangy, and satisfying. Order now!",
    category: cat_side_orders._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_tender_chicken_simmered_in_a_creamy_mild_korma_sauce = await MenuItem.create({
    tenant: tenantId,
    name: "Tender chicken simmered in a creamy, mild korma sauce",
    menuCode: "SID-006",
    description: "Tender chicken simmered in a creamy, mild korma sauce — rich, flavorful, and comforting. Order now!",
    category: cat_side_orders._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_tikka_massala_chat = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Tikka Massala Chat",
    menuCode: "SID-007",
    description: "Tender chicken tikka simmered in a creamy, spiced masala sauce with fresh green peppers and tomatoes — a rich and flavorful classic. Order now!",
    category: cat_side_orders._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_balti_chat_2 = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Balti Chat",
    menuCode: "SID-008",
    description: "Tender chicken simmered in a rich, spiced Balti sauce — full of bold flavors and perfect for any curry lover. Order now!",
    category: cat_side_orders._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_jam_roly_poly = await MenuItem.create({
    tenant: tenantId,
    name: "Jam Roly Poly",
    menuCode: "SID-009",
    description: "Jam Roly Poly",
    category: cat_side_orders._id,
    basePricePence: 420,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_oreo_cheese_cake = await MenuItem.create({
    tenant: tenantId,
    name: "Oreo Cheese Cake",
    menuCode: "SID-010",
    description: "Oreo Cheesecake",
    category: cat_side_orders._id,
    basePricePence: 420,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_apple_crumble_pie = await MenuItem.create({
    tenant: tenantId,
    name: "Apple Crumble Pie",
    menuCode: "SID-011",
    description: "Apple Crumble Pie",
    category: cat_side_orders._id,
    basePricePence: 420,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_vegan_cheese_cake = await MenuItem.create({
    tenant: tenantId,
    name: "Vegan Cheese Cake",
    menuCode: "SID-012",
    description: "Vegan Cheesecake",
    category: cat_side_orders._id,
    basePricePence: 420,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_biscoff_cheese_cake = await MenuItem.create({
    tenant: tenantId,
    name: "Biscoff Cheese Cake",
    menuCode: "SID-013",
    description: "Biscoff Cheesecake",
    category: cat_side_orders._id,
    basePricePence: 420,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 13,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_molten_lava_cake = await MenuItem.create({
    tenant: tenantId,
    name: "Molten Lava Cake",
    menuCode: "SID-014",
    description: "Molten Lava Cake",
    category: cat_side_orders._id,
    basePricePence: 420,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 14,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_10pcs_onion_rings = await MenuItem.create({
    tenant: tenantId,
    name: "10pcs Onion Rings",
    menuCode: "SID-015",
    description: "Crispy, golden onion rings with a crunchy coating and a sweet, tender center — the perfect snack or side.",
    category: cat_sides._id,
    basePricePence: 420,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_6pcs_chicken_nuggets = await MenuItem.create({
    tenant: tenantId,
    name: "6pcs Chicken Nuggets",
    menuCode: "SID-016",
    description: "Crispy, golden chicken nuggets with tender, juicy chicken inside — a classic favorite for all ages.",
    category: cat_sides._id,
    basePricePence: 420,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_4pcs_hot_wings = await MenuItem.create({
    tenant: tenantId,
    name: "4pcs Hot Wings",
    menuCode: "SID-017",
    description: "Freshly prepared 4pcs Hot Wings from our menu.",
    category: cat_sides._id,
    basePricePence: 420,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_6pcs_mozzarella_cheese_sticks = await MenuItem.create({
    tenant: tenantId,
    name: "6pcs Mozzarella Cheese Sticks",
    menuCode: "SID-018",
    description: "Crispy on the outside, bursting with warm, gooey mozzarella cheese on the inside — a perfect cheesy treat.",
    category: cat_sides._id,
    basePricePence: 420,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_curly_fries = await MenuItem.create({
    tenant: tenantId,
    name: "Small Curly Fries",
    menuCode: "SID-019",
    description: "Crispy, seasoned curly fries — golden spirals of crunchy goodness with a perfect twist of flavor.",
    category: cat_sides._id,
    basePricePence: 420,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_15pcs_onion_rings = await MenuItem.create({
    tenant: tenantId,
    name: "15pcs Onion Rings",
    menuCode: "SID-020",
    description: "Crispy, golden onion rings with a crunchy coating and a sweet, tender center — the perfect snack or side.",
    category: cat_sides._id,
    basePricePence: 540,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_10pcs_chicken_nuggets = await MenuItem.create({
    tenant: tenantId,
    name: "10pcs Chicken Nuggets",
    menuCode: "SID-021",
    description: "Crispy, golden chicken nuggets with tender, juicy chicken inside — a classic favorite for all ages.",
    category: cat_sides._id,
    basePricePence: 540,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_6pcs_hot_wings = await MenuItem.create({
    tenant: tenantId,
    name: "6pcs Hot Wings",
    menuCode: "SID-022",
    description: "Freshly prepared 6pcs Hot Wings from our menu.",
    category: cat_sides._id,
    basePricePence: 480,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_10pcs_mozzarella_cheese_sticks = await MenuItem.create({
    tenant: tenantId,
    name: "10pcs Mozzarella Cheese Sticks",
    menuCode: "SID-023",
    description: "Crispy on the outside, bursting with warm, gooey mozzarella cheese on the inside — a perfect cheesy treat.",
    category: cat_sides._id,
    basePricePence: 540,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_curly_fries = await MenuItem.create({
    tenant: tenantId,
    name: "Large Curly Fries",
    menuCode: "SID-024",
    description: "Crispy, seasoned curly fries — golden spirals of crunchy goodness with a perfect twist of flavor.",
    category: cat_sides._id,
    basePricePence: 540,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_margherita_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square Margherita Pizza",
    menuCode: "SQU-001",
    description: "Enjoy our Square Margherita Pizza, a classic choice from our Square Pizzas menu. Available for just ...",
    category: cat_square_pizzas._id,
    basePricePence: 1420,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_garlic_cheese_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square Garlic Cheese Pizza",
    menuCode: "SQU-002",
    description: "Enjoy our Square Garlic Cheese Pizza, a delicious choice from our Square Pizzas. Available for just £12.70, it's perfect for pizza lovers!",
    category: cat_square_pizzas._id,
    basePricePence: 1420,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_meat_feast_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square Meat Feast Pizza",
    menuCode: "SQU-003",
    description: "Enjoy our Square Meat Feast Pizza, featuring pepperoni, chicken tikka, and mincemeat. Perfect for sharing! Get it for just £14.80",
    category: cat_square_pizzas._id,
    basePricePence: 1739,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_hawaiian_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square Hawaiian Pizza",
    menuCode: "SQU-004",
    description: "Enjoy our Square Hawaiian Pizza, a delightful choice from our Square Pizzas menu. Priced at £14.80, it's a tasty treat for any meal!",
    category: cat_square_pizzas._id,
    basePricePence: 1739,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_hot_shot_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square Hot Shot Pizza",
    menuCode: "SQU-005",
    description: "Enjoy our Square Hot Shot Pizza, a delicious choice from our Square Pizzas category.",
    category: cat_square_pizzas._id,
    basePricePence: 1739,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_spicy_feast_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square Spicy Feast Pizza",
    menuCode: "SQU-006",
    description: "Enjoy our Square Spicy Feast Pizza, a delicious addition to our Square Pizzas menu and is perfect for ...",
    category: cat_square_pizzas._id,
    basePricePence: 1739,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_apollo_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square Apollo Pizza",
    menuCode: "SQU-007",
    description: "Enjoy our Square Apollo Pizza, topped with Chicken Tikka and Mushrooms. Perfect for pizza lovers! Get it from our Square Pizzas menu.",
    category: cat_square_pizzas._id,
    basePricePence: 1739,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_vegetarian_pizza_all_veg = await MenuItem.create({
    tenant: tenantId,
    name: "Square Vegetarian Pizza (All Veg)",
    menuCode: "SQU-008",
    description: "Enjoy our Square Vegetarian Pizza, perfect for all veggie lovers! This delicious pizza is part of our Square Pizzas menu.",
    category: cat_square_pizzas._id,
    basePricePence: 1739,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_smokey_special_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square Smokey Special Pizza",
    menuCode: "SQU-009",
    description: "Try our Square Smokey Special Pizza! It features BBQ base with Chicken Tikka, Mincemeat, and Onions. Enjoy this tasty treat for just £14.80. Perfect for pizza ...",
    category: cat_square_pizzas._id,
    basePricePence: 1739,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_cheesy_bbq_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square Cheesy BBQ Pizza",
    menuCode: "SQU-010",
    description: "Enjoy our Square Cheesy BBQ Pizza with a BBQ base and double cheese. Perfect for sharing, it",
    category: cat_square_pizzas._id,
    basePricePence: 1739,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_doner_special_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square Doner Special Pizza",
    menuCode: "SQU-011",
    description: "Enjoy our Square Doner Special Pizza, topped with Chicken Doner, Donnermeat, and Onions. A delicious choice from our Square Pizzas menu for just £14.80!",
    category: cat_square_pizzas._id,
    basePricePence: 1739,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_fire_ball_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square Fire Ball Pizza",
    menuCode: "SQU-012",
    description: "Try our Square Fire Ball Pizza, featuring a spicy chilli base with minced meat, onions, green chillies, and jalapenos.",
    category: cat_square_pizzas._id,
    basePricePence: 1480,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_double_pepperoni_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square Double Pepperoni Pizza",
    menuCode: "SQU-013",
    description: "Enjoy our Square Double Pepperoni Pizza, packed with pepperoni and more pepperoni. Perfect for Sharing and a tasty choice!",
    category: cat_square_pizzas._id,
    basePricePence: 1480,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 13,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_oriental_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square Oriental Pizza",
    menuCode: "SQU-014",
    description: "A square based pizza topped with delicious chicken tikka, green peppers, and sweetcorn. A perfect choice for any pizza lover!",
    category: cat_square_pizzas._id,
    basePricePence: 1480,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 14,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_bbq_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square BBQ Pizza",
    menuCode: "SQU-015",
    description: "BBQ sauce, juicy chicken tikka, spiced minced meat, and red onions on a crispy square crust.",
    category: cat_square_pizzas._id,
    basePricePence: 1480,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 15,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_curry_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square Curry Pizza",
    menuCode: "SQU-016",
    description: "our favorite curry, now on a pizza! Choose from Korma, Tikka Masala, Balti, Madras, Vindaloo, or our Curry Special — all on a crispy square crust and loaded ...",
    category: cat_square_pizzas._id,
    basePricePence: 1480,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 16,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_express_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square Express Pizza",
    menuCode: "SQU-017",
    description: "flavor-packed curry base on a crispy square crust, topped with a little bit of everything — tender chicken, minced meat, sweet red onions, peppers, and melty...",
    category: cat_square_pizzas._id,
    basePricePence: 1630,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 17,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_apna_style_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square Apna Style Pizza",
    menuCode: "SQU-018",
    description: "Square base chicken tikka green chillis jalapenos red onions sweetcorn green peppers minced meat",
    category: cat_square_pizzas._id,
    basePricePence: 1630,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 18,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_popcorn_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square Popcorn Pizza",
    menuCode: "SQU-019",
    description: "Freshly prepared Square Popcorn Pizza from our menu.",
    category: cat_square_pizzas._id,
    basePricePence: 1630,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 19,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_rupeyal_special_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square Rupeyal Special Pizza",
    menuCode: "SQU-020",
    description: "Freshly prepared Square Rupeyal Special Pizza from our menu.",
    category: cat_square_pizzas._id,
    basePricePence: 1630,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 20,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_square_mighty_meat_feast_pizza = await MenuItem.create({
    tenant: tenantId,
    name: "Square Mighty Meat Feast Pizza",
    menuCode: "SQU-021",
    description: "Freshly prepared Square Mighty Meat Feast Pizza from our menu.",
    category: cat_square_pizzas._id,
    basePricePence: 1630,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 21,
    kitchenStationId: "PIZZA_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_poppadom_2pc = await MenuItem.create({
    tenant: tenantId,
    name: "Poppadom 2pc",
    menuCode: "STA-001",
    description: "Light and crispy.",
    category: cat_starters._id,
    basePricePence: 150,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_tandoori_chicken_starter = await MenuItem.create({
    tenant: tenantId,
    name: "Tandoori Chicken Starter",
    menuCode: "STA-002",
    description: "Comes with salad and mint sauce dip. Juicy chicken leg marinated in aromatic spices and grilled to smoky perfection — a flavorful starter.",
    category: cat_starters._id,
    basePricePence: 490,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_chicken_tikka_starter = await MenuItem.create({
    tenant: tenantId,
    name: "Small Chicken Tikka Starter",
    menuCode: "STA-003",
    description: "Juicy chunks of marinated chicken tikka served on a bed of fresh salad, accompanied by a cooling mint yogurt dip.",
    category: cat_starters._id,
    basePricePence: 520,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_chicken_tikka_starter = await MenuItem.create({
    tenant: tenantId,
    name: "Large Chicken Tikka Starter",
    menuCode: "STA-004",
    description: "Juicy chunks of marinated chicken tikka served on a bed of fresh salad, accompanied by a cooling mint yogurt dip.",
    category: cat_starters._id,
    basePricePence: 800,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mix_grill_starter = await MenuItem.create({
    tenant: tenantId,
    name: "Mix Grill Starter",
    menuCode: "STA-005",
    description: "Tandoori leg, juicy chicken tikka, flavorful steak tikka, and tender shish kebab served on a bed of fresh salad with a cooling mint yogurt dip.",
    category: cat_starters._id,
    basePricePence: 750,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_katlama = await MenuItem.create({
    tenant: tenantId,
    name: "Katlama",
    menuCode: "STA-006",
    description: "Deep-fried flaky pastry stuffed with seasoned minced meat, served on a bed of fresh salad and accompanied by a cooling mint yogurt dip.",
    category: cat_starters._id,
    basePricePence: 500,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_samosa_2_pc = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Samosa 2 PC",
    menuCode: "STA-007",
    description: "Crispy pastry pockets filled with spiced minced chicken, served with fresh salad and a cooling mint yogurt dip.",
    category: cat_starters._id,
    basePricePence: 470,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_vegetable_samosa_2pc = await MenuItem.create({
    tenant: tenantId,
    name: "Vegetable Samosa 2pc",
    menuCode: "STA-008",
    description: "Crispy pastry pockets filled with spiced vegetables, served with fresh salad and a cooling mint yogurt dip.",
    category: cat_starters._id,
    basePricePence: 450,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_shish_kebab_starter_2pc = await MenuItem.create({
    tenant: tenantId,
    name: "Shish Kebab Starter 2pc",
    menuCode: "STA-009",
    description: "Tender minced chicken skewers, cooked to perfection, served on a bed of fresh salad with a cooling mint yogurt dip.",
    category: cat_starters._id,
    basePricePence: 450,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_shami_kebab_starter = await MenuItem.create({
    tenant: tenantId,
    name: "Shami Kebab Starter",
    menuCode: "STA-010",
    description: "Comes with salad and mint sauce dip. Delicately spiced shami kebabs made with minced meat aromatic herbs, fried for a crispy outside and melt in the mouth centre. A perfect starter or side.",
    category: cat_starters._id,
    basePricePence: 450,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_onion_bhaji2pc = await MenuItem.create({
    tenant: tenantId,
    name: "Onion Bhaji(2PC)",
    menuCode: "STA-011",
    description: "Comes with salad and mint sauce dip. Crispy onion bhajis made with thinly sliced onions and fragrant spices. Freshly fried to a golden finish for a perfect starter or snack.",
    category: cat_starters._id,
    basePricePence: 360,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_puri_starter = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Puri Starter",
    menuCode: "STA-012",
    description: "Comes with salad and mint sauce dip. Tender chicken cooked in a mild flavourful sauce and served on a soft, freshly fried puri.",
    category: cat_starters._id,
    basePricePence: 500,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_prawn_puri_starter = await MenuItem.create({
    tenant: tenantId,
    name: "Prawn Puri Starter",
    menuCode: "STA-013",
    description: "Comes with salad and mint sauce dip. Juicy prawns cooked in a gently spiced sauce served on a soft, freshly fried puri.",
    category: cat_starters._id,
    basePricePence: 500,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 13,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_rupeyal_special_starter = await MenuItem.create({
    tenant: tenantId,
    name: "Rupeyal Special Starter",
    menuCode: "STA-014",
    description: "A delicious mix of tender chicken tikka, flavorful steak tikka, crispy onion bhaji, and succulent shish kebab, served with fresh salad and a cooling mint yogurt dip.",
    category: cat_starters._id,
    basePricePence: 900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 14,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_a_warm_fluffy_puri = await MenuItem.create({
    tenant: tenantId,
    name: "A warm fluffy puri",
    menuCode: "STA-015",
    description: "...savory shish, served on a fresh bed of salad with cool mint yogurt dip. Perfect for...",
    category: cat_starters._id,
    basePricePence: 500,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 15,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mango_chutney = await MenuItem.create({
    tenant: tenantId,
    name: "Mango Chutney",
    menuCode: "STA-016",
    description: "Rich, sweet, and tangy mango chutney — a deliciously fruity dip or side.",
    category: cat_starters._id,
    basePricePence: 50,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 16,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mint_chutney = await MenuItem.create({
    tenant: tenantId,
    name: "Mint Chutney",
    menuCode: "STA-017",
    description: "Cool and creamy yogurt blended with fresh mint — a refreshing and tangy chutney perfect for balancing bold flavors.",
    category: cat_starters._id,
    basePricePence: 50,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 17,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_onion_chutney = await MenuItem.create({
    tenant: tenantId,
    name: "Onion Chutney",
    menuCode: "STA-018",
    description: "A savory blend of onions, fresh mint, and tomatoes — a refreshing and flavorful chutney to complement yo...",
    category: cat_starters._id,
    basePricePence: 50,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 18,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_large_steak_tikka_starter = await MenuItem.create({
    tenant: tenantId,
    name: "Large Steak Tikka Starter",
    menuCode: "STA-019",
    description: "chunks of marinated steak tikka served on a bed of fresh salad, accompanied by a cooling mint yogurt dip.",
    category: cat_starters._id,
    basePricePence: 900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 19,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_steak_tikka_starter = await MenuItem.create({
    tenant: tenantId,
    name: "Small Steak Tikka Starter",
    menuCode: "STA-020",
    description: "chunks of marinated steak tikka served in a bed of crunchy salad and includes a mint sauce dip",
    category: cat_starters._id,
    basePricePence: 550,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 20,
    kitchenStationId: "STARTER_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_the_curry_box = await MenuItem.create({
    tenant: tenantId,
    name: "The Curry Box",
    menuCode: "THE-001",
    description: "Generous curry box served with fragrant rice and golden chips. Choose from chicken, chicken tikka, ...",
    category: cat_the_curry_box._id,
    basePricePence: 999,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_sterling_50_gm = await MenuItem.create({
    tenant: tenantId,
    name: "Sterling 50 Gm",
    menuCode: "TOB-001",
    description: "Freshly prepared Sterling 50 Gm from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 4390,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_riverstone_50_gm = await MenuItem.create({
    tenant: tenantId,
    name: "Riverstone 50 Gm",
    menuCode: "TOB-002",
    description: "Freshly prepared Riverstone 50 Gm from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 4190,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cutters_choice_orignal_50gm = await MenuItem.create({
    tenant: tenantId,
    name: "Cutters Choice Orignal 50gm",
    menuCode: "TOB-003",
    description: "Freshly prepared Cutters Choice Orignal 50gm from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 5040,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_golden_virginia_30g = await MenuItem.create({
    tenant: tenantId,
    name: "Golden Virginia 30g",
    menuCode: "TOB-004",
    description: "Freshly prepared Golden Virginia 30g from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 2990,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_players_30gm = await MenuItem.create({
    tenant: tenantId,
    name: "Players 30gm",
    menuCode: "TOB-005",
    description: "Freshly prepared Players 30gm from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 2690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_amberleaf_50g = await MenuItem.create({
    tenant: tenantId,
    name: "Amberleaf 50g",
    menuCode: "TOB-006",
    description: "Freshly prepared Amberleaf 50g from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 4890,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_gold_leaf_50_gm = await MenuItem.create({
    tenant: tenantId,
    name: "Gold Leaf 50 Gm",
    menuCode: "TOB-007",
    description: "Freshly prepared Gold Leaf 50 Gm from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 4340,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_gold_leaf_30gm = await MenuItem.create({
    tenant: tenantId,
    name: "Gold Leaf 30gm",
    menuCode: "TOB-008",
    description: "Freshly prepared Gold Leaf 30gm from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 2790,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_pallmall_30_gm_extra_fine = await MenuItem.create({
    tenant: tenantId,
    name: "Pallmall 30 Gm Extra Fine",
    menuCode: "TOB-009",
    description: "Freshly prepared Pallmall 30 Gm Extra Fine from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 2790,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_riverstone_30_gm = await MenuItem.create({
    tenant: tenantId,
    name: "Riverstone 30 Gm",
    menuCode: "TOB-010",
    description: "Freshly prepared Riverstone 30 Gm from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 2690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_benson_blue_tobacco_50gm = await MenuItem.create({
    tenant: tenantId,
    name: "Benson Blue Tobacco 50gm",
    menuCode: "TOB-011",
    description: "Freshly prepared Benson Blue Tobacco 50gm from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 4290,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_players_50_gm = await MenuItem.create({
    tenant: tenantId,
    name: "Players 50 Gm",
    menuCode: "TOB-012",
    description: "Freshly prepared Players 50 Gm from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 4190,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_silver_ks_slim_rizla = await MenuItem.create({
    tenant: tenantId,
    name: "Silver Ks Slim Rizla",
    menuCode: "TOB-013",
    description: "Freshly prepared Silver Ks Slim Rizla from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 180,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 13,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_red_ks_rizla = await MenuItem.create({
    tenant: tenantId,
    name: "Red Ks Rizla",
    menuCode: "TOB-014",
    description: "Freshly prepared Red Ks Rizla from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 180,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 14,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_green_rizla = await MenuItem.create({
    tenant: tenantId,
    name: "Small Green Rizla",
    menuCode: "TOB-015",
    description: "Freshly prepared Small Green Rizla from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 80,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 15,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_silver_rizla = await MenuItem.create({
    tenant: tenantId,
    name: "Small Silver Rizla",
    menuCode: "TOB-016",
    description: "Freshly prepared Small Silver Rizla from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 80,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 16,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_liquorice_rizla = await MenuItem.create({
    tenant: tenantId,
    name: "Small Liquorice Rizla",
    menuCode: "TOB-017",
    description: "Freshly prepared Small Liquorice Rizla from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 80,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 17,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_ks_raw_with_tips = await MenuItem.create({
    tenant: tenantId,
    name: "Ks Raw With Tips",
    menuCode: "TOB-018",
    description: "Freshly prepared Ks Raw With Tips from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 0,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 18,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cutters_choice_extra_fine_50_gm = await MenuItem.create({
    tenant: tenantId,
    name: "Cutters Choice Extra Fine 50 Gm",
    menuCode: "TOB-019",
    description: "Freshly prepared Cutters Choice Extra Fine 50 Gm from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 4670,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 19,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_lambert_blue_tobacco_30_gm = await MenuItem.create({
    tenant: tenantId,
    name: "Lambert Blue Tobacco 30 Gm",
    menuCode: "TOB-020",
    description: "Freshly prepared Lambert Blue Tobacco 30 Gm from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 2790,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 20,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cutters_choice_extra_fine_30gm = await MenuItem.create({
    tenant: tenantId,
    name: "Cutters Choice Extra Fine 30gm",
    menuCode: "TOB-021",
    description: "Freshly prepared Cutters Choice Extra Fine 30gm from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 3190,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 21,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_golden_virginia_50g = await MenuItem.create({
    tenant: tenantId,
    name: "Golden Virginia 50g",
    menuCode: "TOB-022",
    description: "Freshly prepared Golden Virginia 50g from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 4990,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 22,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_amber_leaf_30g = await MenuItem.create({
    tenant: tenantId,
    name: "Amber Leaf 30g",
    menuCode: "TOB-023",
    description: "Freshly prepared Amber Leaf 30g from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 3090,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 23,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_benson_and_hedges_silver_30g = await MenuItem.create({
    tenant: tenantId,
    name: "Benson And Hedges Silver 30g",
    menuCode: "TOB-024",
    description: "Freshly prepared Benson And Hedges Silver 30g from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 3090,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 24,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_sterling_30gm = await MenuItem.create({
    tenant: tenantId,
    name: "Sterling 30gm",
    menuCode: "TOB-025",
    description: "Freshly prepared Sterling 30gm from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 2790,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 25,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_marlboro_gold_30_gm = await MenuItem.create({
    tenant: tenantId,
    name: "Marlboro Gold 30 Gm",
    menuCode: "TOB-026",
    description: "Freshly prepared Marlboro Gold 30 Gm from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 2590,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 26,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cutters_choice_orignal_30_gm = await MenuItem.create({
    tenant: tenantId,
    name: "Cutters Choice Orignal 30 Gm",
    menuCode: "TOB-027",
    description: "Freshly prepared Cutters Choice Orignal 30 Gm from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 3190,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 27,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_benson_blue_tobacco_30gm = await MenuItem.create({
    tenant: tenantId,
    name: "Benson Blue Tobacco 30gm",
    menuCode: "TOB-028",
    description: "Freshly prepared Benson Blue Tobacco 30gm from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 2690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 28,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_new_embassy_tobacco_30gm = await MenuItem.create({
    tenant: tenantId,
    name: "New Embassy Tobacco 30gm",
    menuCode: "TOB-029",
    description: "Freshly prepared New Embassy Tobacco 30gm from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 2790,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 29,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_royals_tobacco_30gm = await MenuItem.create({
    tenant: tenantId,
    name: "Royals Tobacco 30gm",
    menuCode: "TOB-030",
    description: "Freshly prepared Royals Tobacco 30gm from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 2690,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 30,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_blue_slim_ks_rizla = await MenuItem.create({
    tenant: tenantId,
    name: "Blue Slim Ks Rizla",
    menuCode: "TOB-031",
    description: "Freshly prepared Blue Slim Ks Rizla from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 180,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 31,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_green_ks_rizla = await MenuItem.create({
    tenant: tenantId,
    name: "Green Ks Rizla",
    menuCode: "TOB-032",
    description: "Freshly prepared Green Ks Rizla from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 180,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 32,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_blue_rizla = await MenuItem.create({
    tenant: tenantId,
    name: "Small Blue Rizla",
    menuCode: "TOB-033",
    description: "Freshly prepared Small Blue Rizla from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 80,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 33,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_red_rizla = await MenuItem.create({
    tenant: tenantId,
    name: "Small Red Rizla",
    menuCode: "TOB-034",
    description: "Freshly prepared Small Red Rizla from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 80,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 34,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_small_green_zigzag = await MenuItem.create({
    tenant: tenantId,
    name: "Small Green Zigzag",
    menuCode: "TOB-035",
    description: "Freshly prepared Small Green Zigzag from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 70,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 35,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_ks_raw_paper = await MenuItem.create({
    tenant: tenantId,
    name: "Ks Raw Paper",
    menuCode: "TOB-036",
    description: "Freshly prepared Ks Raw Paper from our menu.",
    category: cat_tobacco_rizla._id,
    basePricePence: 0,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 36,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_vape_liquid = await MenuItem.create({
    tenant: tenantId,
    name: "Vape Liquid",
    menuCode: "TOB-037",
    description: "Freshly prepared Vape Liquid from our menu.",
    category: cat_tobacco_liquid._id,
    basePricePence: 400,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_balti = await MenuItem.create({
    tenant: tenantId,
    name: "Balti",
    menuCode: "TRA-001",
    description: "A gently spiced, aromatic curry with fresh ingredients, cooked to perfection for a smooth and flavorful taste.",
    category: cat_traditional_curries._id,
    basePricePence: 800,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_rogan_josh = await MenuItem.create({
    tenant: tenantId,
    name: "Rogan Josh",
    menuCode: "TRA-002",
    description: "A medium-spiced curry prepared with fresh tomatoes and green peppers, delivering a flavorful and balanced taste.",
    category: cat_traditional_curries._id,
    basePricePence: 819,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_korma = await MenuItem.create({
    tenant: tenantId,
    name: "Korma",
    menuCode: "TRA-003",
    description: "Sweet & Mild Korma — Mild, creamy, and slightly sweet curry packed with comforting flavor.",
    category: cat_traditional_curries._id,
    basePricePence: 819,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_madras = await MenuItem.create({
    tenant: tenantId,
    name: "Madras",
    menuCode: "TRA-004",
    description: "A hot and spicy curry bursting with bold flavors and vibrant spices — perfect for those who love a fiery kick.",
    category: cat_traditional_curries._id,
    basePricePence: 800,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_jalfrezi = await MenuItem.create({
    tenant: tenantId,
    name: "Jalfrezi",
    menuCode: "TRA-005",
    description: "Juicy chicken in a mouthwatering, hot, and spicy-tangy sauce that's sure to delight.",
    category: cat_traditional_curries._id,
    basePricePence: 819,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_apna_style = await MenuItem.create({
    tenant: tenantId,
    name: "Apna Style",
    menuCode: "TRA-006",
    description: "Traditional home cooked style dish",
    category: cat_traditional_curries._id,
    basePricePence: 900,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_bhuna = await MenuItem.create({
    tenant: tenantId,
    name: "Bhuna",
    menuCode: "TRA-007",
    description: "A rich, slow-cooked stew made with fresh tomatoes and aromatic spices, offering deep, hearty flavors in every bite.",
    category: cat_traditional_curries._id,
    basePricePence: 819,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_dupiaza = await MenuItem.create({
    tenant: tenantId,
    name: "Dupiaza",
    menuCode: "TRA-008",
    description: "A flavorful curry cooked with a generous amount of onions and fresh spices, creating a rich and aromatic dish.",
    category: cat_traditional_curries._id,
    basePricePence: 819,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_dansak = await MenuItem.create({
    tenant: tenantId,
    name: "Dansak",
    menuCode: "TRA-009",
    description: "A delicious blend of lentils and spices cooked with fresh ingredients, creating a tangy and hearty curry.",
    category: cat_traditional_curries._id,
    basePricePence: 770,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_vindaloo = await MenuItem.create({
    tenant: tenantId,
    name: "Vindaloo",
    menuCode: "TRA-010",
    description: "Bold, very hot, and flavorful curry with your choice of meat or vegetables, packed with a fiery kick.",
    category: cat_traditional_curries._id,
    basePricePence: 819,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_paneer = await MenuItem.create({
    tenant: tenantId,
    name: "Paneer",
    menuCode: "TRA-011",
    description: "A medium strength dish using cheese and spices",
    category: cat_traditional_curries._id,
    basePricePence: 770,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_darka_daal = await MenuItem.create({
    tenant: tenantId,
    name: "Darka Daal",
    menuCode: "TRA-012",
    description: "Slow cooked lentils tempered with garlic and spices creating a warm and comforting darka daal full of rich and authentic flavour.",
    category: cat_traditional_curries._id,
    basePricePence: 600,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_madras_curry = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Madras Curry",
    menuCode: "TRA-013",
    description: "Spicy chicken cooked in a classic Madras curry — full of bold, vibrant flavors. Order now!",
    category: cat_traditional_curries._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 13,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_korma = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Korma",
    menuCode: "TRA-014",
    description: "Tender chicken simmered in a creamy, mild korma sauce — rich, flavorful, and comforting. Order now!",
    category: cat_traditional_curries._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 14,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_bhuna_chat_3 = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Bhuna Chat",
    menuCode: "TRA-015",
    description: "Succulent chicken cooked in a thick, spiced Bhuna sauce with tomatoes — rich, hearty, and full of flavor. Order now!",
    category: cat_traditional_curries._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 15,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_tikka_massala_chat_2 = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Tikka Massala Chat",
    menuCode: "TRA-016",
    description: "Tender chicken tikka simmered in a creamy, spiced masala sauce with fresh green peppers and tomatoes — a rich and flavorful classic. Order now!",
    category: cat_traditional_curries._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 16,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_duplaza_chat = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Duplaza Chat",
    menuCode: "TRA-017",
    description: "Juicy chicken cooked with plenty of onions, fresh green peppers, and tomatoes in a flavorful Duplaza sauce — rich, tangy, and satisfying. Order now!",
    category: cat_traditional_curries._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 17,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_balti_chat_3 = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Balti Chat",
    menuCode: "TRA-018",
    description: "Tender chicken simmered in a rich, spiced Balti sauce — full of bold flavors and perfect for any curry lover. Order now!",
    category: cat_traditional_curries._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 18,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_dupliaza_chat_3 = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Dupliaza Chat",
    menuCode: "TRA-019",
    description: "Juicy chicken cooked with plenty of onions, fresh green peppers, and tomatoes in a flavorful Dupliaza sauce — rich, tangy, and satisfying. Order now!",
    category: cat_traditional_curries._id,
    basePricePence: 980,
    vatRate: 20,
    modifierGroups: [curryAddonsGroup._id],
    groupAssignments: assignGroups([curryAddonsGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 19,
    kitchenStationId: "CURRY_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_crystal_blueberries_sour_raspberries = await MenuItem.create({
    tenant: tenantId,
    name: "Crystal Blueberries sour Raspberries",
    menuCode: "VAP-001",
    description: "600 Puffs",
    category: cat_vapes_ecigs._id,
    basePricePence: 600,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_crystal_fizzy_cherry = await MenuItem.create({
    tenant: tenantId,
    name: "Crystal Fizzy Cherry",
    menuCode: "VAP-002",
    description: "600 Puffs",
    category: cat_vapes_ecigs._id,
    basePricePence: 600,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_crystal_watermelon_ice = await MenuItem.create({
    tenant: tenantId,
    name: "Crystal Watermelon Ice",
    menuCode: "VAP-003",
    description: "600 Puffs",
    category: cat_vapes_ecigs._id,
    basePricePence: 600,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_crystal_strawberry_burst = await MenuItem.create({
    tenant: tenantId,
    name: "Crystal Strawberry Burst",
    menuCode: "VAP-004",
    description: "600 Puffs",
    category: cat_vapes_ecigs._id,
    basePricePence: 600,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_crystal_cola = await MenuItem.create({
    tenant: tenantId,
    name: "Crystal Cola",
    menuCode: "VAP-005",
    description: "600 Puffs",
    category: cat_vapes_ecigs._id,
    basePricePence: 600,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_crystal_lemon_lime = await MenuItem.create({
    tenant: tenantId,
    name: "Crystal Lemon & Lime",
    menuCode: "VAP-006",
    description: "600 Puffs",
    category: cat_vapes_ecigs._id,
    basePricePence: 600,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_crystal_fruit_medley = await MenuItem.create({
    tenant: tenantId,
    name: "Crystal Fruit medley",
    menuCode: "VAP-007",
    description: "600 Puffs",
    category: cat_vapes_ecigs._id,
    basePricePence: 600,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_lost_mary_red_edition_30k = await MenuItem.create({
    tenant: tenantId,
    name: "Lost Mary Red edition 30k",
    menuCode: "VAP-008",
    description: "Strawberry watermelon & Raspberry watermelon",
    category: cat_vapes_ecigs._id,
    basePricePence: 1900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_lost_cherry_edition_30k = await MenuItem.create({
    tenant: tenantId,
    name: "Lost Cherry edition 30k",
    menuCode: "VAP-009",
    description: "Cherry ice/Sparkling cherry",
    category: cat_vapes_ecigs._id,
    basePricePence: 1900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayatti_cherry_cola_6k = await MenuItem.create({
    tenant: tenantId,
    name: "Hayatti cherry cola 6k",
    menuCode: "VAP-010",
    description: "Freshly prepared Hayatti cherry cola 6k from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayatti_fizzy_cherry_6k = await MenuItem.create({
    tenant: tenantId,
    name: "Hayatti Fizzy cherry 6k",
    menuCode: "VAP-011",
    description: "Freshly prepared Hayatti Fizzy cherry 6k from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayatti_strawberry_kiwi_6k = await MenuItem.create({
    tenant: tenantId,
    name: "Hayatti Strawberry kiwi 6k",
    menuCode: "VAP-012",
    description: "Freshly prepared Hayatti Strawberry kiwi 6k from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayatti_bluerazz_cherry_6k = await MenuItem.create({
    tenant: tenantId,
    name: "Hayatti BlueRazz cherry 6k",
    menuCode: "VAP-013",
    description: "Freshly prepared Hayatti BlueRazz cherry 6k from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 13,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayatti_strawberry_watermelon_6k = await MenuItem.create({
    tenant: tenantId,
    name: "Hayatti strawberry watermelon 6k",
    menuCode: "VAP-014",
    description: "Freshly prepared Hayatti strawberry watermelon 6k from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 14,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayatti_bluerazz_pineapple_6k = await MenuItem.create({
    tenant: tenantId,
    name: "Hayatti BlueRazz pineapple 6k",
    menuCode: "VAP-015",
    description: "Freshly prepared Hayatti BlueRazz pineapple 6k from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 15,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayatti_blueberry_cherry_cranberry_6k = await MenuItem.create({
    tenant: tenantId,
    name: "Hayatti Blueberry Cherry Cranberry 6k",
    menuCode: "VAP-016",
    description: "Freshly prepared Hayatti Blueberry Cherry Cranberry 6k from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 16,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayatti_fruit_twist_6k = await MenuItem.create({
    tenant: tenantId,
    name: "Hayatti Fruit twist 6k",
    menuCode: "VAP-017",
    description: "Freshly prepared Hayatti Fruit twist 6k from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 17,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_lost_mary_blueberry_edition_30k = await MenuItem.create({
    tenant: tenantId,
    name: "Lost Mary Blueberry Edition 30k",
    menuCode: "VAP-018",
    description: "blueberry sour raspberry / blueberry Raspberry",
    category: cat_vapes_ecigs._id,
    basePricePence: 1900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 18,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_lost_watermelon_edition_30k = await MenuItem.create({
    tenant: tenantId,
    name: "Lost watermelon edition 30k",
    menuCode: "VAP-019",
    description: "Watermelon ice/ Strawberry",
    category: cat_vapes_ecigs._id,
    basePricePence: 1900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 19,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_lost_mary_dubai_chocolate_30_k_puffs = await MenuItem.create({
    tenant: tenantId,
    name: "Lost Mary Dubai chocolate 30 k Puffs",
    menuCode: "VAP-020",
    description: "Cola/Pink lemonade",
    category: cat_vapes_ecigs._id,
    basePricePence: 1900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 20,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayati_blue_razz_cherry_6k = await MenuItem.create({
    tenant: tenantId,
    name: "Hayati Blue Razz Cherry 6k",
    menuCode: "VAP-021",
    description: "Freshly prepared Hayati Blue Razz Cherry 6k from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 21,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayati_watermelon_ice_6k = await MenuItem.create({
    tenant: tenantId,
    name: "Hayati watermelon Ice 6k",
    menuCode: "VAP-022",
    description: "Freshly prepared Hayati watermelon Ice 6k from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 22,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayati_blue_razz_gb_6k = await MenuItem.create({
    tenant: tenantId,
    name: "Hayati Blue Razz GB 6k",
    menuCode: "VAP-023",
    description: "Freshly prepared Hayati Blue Razz GB 6k from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 23,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayati_25k_blurazz_gummybear = await MenuItem.create({
    tenant: tenantId,
    name: "Hayati 25k BluRazz Gummybear",
    menuCode: "VAP-024",
    description: "Freshly prepared Hayati 25k BluRazz Gummybear from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 24,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayati_25k_blueberry_raspberry = await MenuItem.create({
    tenant: tenantId,
    name: "Hayati 25k Blueberry Raspberry",
    menuCode: "VAP-025",
    description: "Freshly prepared Hayati 25k Blueberry Raspberry from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 25,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayati_25k_straberrygrapefruitdragonfruit = await MenuItem.create({
    tenant: tenantId,
    name: "Hayati 25k Straberry/Grapefruit/Dragonfruit",
    menuCode: "VAP-026",
    description: "Freshly prepared Hayati 25k Straberry/Grapefruit/Dragonfruit from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 26,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayati_25k_grape_gbstrawberry_gb = await MenuItem.create({
    tenant: tenantId,
    name: "Hayati 25k Grape GB/Strawberry GB",
    menuCode: "VAP-027",
    description: "Freshly prepared Hayati 25k Grape GB/Strawberry GB from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 27,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayati_25k_cherry_berry = await MenuItem.create({
    tenant: tenantId,
    name: "Hayati 25k Cherry Berry",
    menuCode: "VAP-028",
    description: "Freshly prepared Hayati 25k Cherry Berry from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 28,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayati_25_k_fresh_mint = await MenuItem.create({
    tenant: tenantId,
    name: "Hayati 25 k Fresh mint",
    menuCode: "VAP-029",
    description: "Freshly prepared Hayati 25 k Fresh mint from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 29,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_lost_mary_berry_edition_30k = await MenuItem.create({
    tenant: tenantId,
    name: "Lost Mary Berry Edition 30k",
    menuCode: "VAP-030",
    description: "Berry Mix/Blueberry cherry blackberry",
    category: cat_vapes_ecigs._id,
    basePricePence: 1900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 30,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayati_hubba_bubba_6k = await MenuItem.create({
    tenant: tenantId,
    name: "Hayati Hubba bubba 6k",
    menuCode: "VAP-031",
    description: "Freshly prepared Hayati Hubba bubba 6k from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 31,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayati_mr_blue_6k = await MenuItem.create({
    tenant: tenantId,
    name: "Hayati Mr Blue 6k",
    menuCode: "VAP-032",
    description: "Freshly prepared Hayati Mr Blue 6k from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1300,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 32,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayati_25k_lemon_lime = await MenuItem.create({
    tenant: tenantId,
    name: "Hayati 25k Lemon & Lime",
    menuCode: "VAP-033",
    description: "Freshly prepared Hayati 25k Lemon & Lime from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 33,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayati_25k_summer_dream = await MenuItem.create({
    tenant: tenantId,
    name: "Hayati 25k Summer dream",
    menuCode: "VAP-034",
    description: "Freshly prepared Hayati 25k Summer dream from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 34,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayati_25k_blueberrywatermelonhubba_b = await MenuItem.create({
    tenant: tenantId,
    name: "Hayati 25k Blueberry/watermelon/Hubba b",
    menuCode: "VAP-035",
    description: "Freshly prepared Hayati 25k Blueberry/watermelon/Hubba b from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 35,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayati_25k_mr_blue = await MenuItem.create({
    tenant: tenantId,
    name: "Hayati 25k Mr Blue",
    menuCode: "VAP-036",
    description: "Freshly prepared Hayati 25k Mr Blue from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 36,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayati_25k_blueberry_sourraspberry = await MenuItem.create({
    tenant: tenantId,
    name: "Hayati 25k Blueberry SourRaspberry",
    menuCode: "VAP-037",
    description: "Freshly prepared Hayati 25k Blueberry SourRaspberry from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 37,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_hayati_25k_bluerazz_cherry = await MenuItem.create({
    tenant: tenantId,
    name: "Hayati 25k BlueRazz cherry",
    menuCode: "VAP-038",
    description: "Freshly prepared Hayati 25k BlueRazz cherry from our menu.",
    category: cat_vapes_ecigs._id,
    basePricePence: 1900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 38,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_lost_mary_purple_edition_30k = await MenuItem.create({
    tenant: tenantId,
    name: "Lost Mary Purple Edition 30k",
    menuCode: "VAP-039",
    description: "Summer grape/strawberry raspberry ice",
    category: cat_vapes_ecigs._id,
    basePricePence: 1900,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: false,
    isActive: true,
    sortOrder: 39,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_viral_crunch_cake = await MenuItem.create({
    tenant: tenantId,
    name: "Viral Crunch Cake",
    menuCode: "VIR-001",
    description: "Freshly prepared Viral Crunch Cake from our menu.",
    category: cat_viral_crunch_cake._id,
    basePricePence: 649,
    vatRate: 20,
    modifierGroups: [],
    groupAssignments: assignGroups([]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "OTHER",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_tikka_wrap = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Tikka Wrap",
    menuCode: "WRA-001",
    description: "Tender chicken tikka strips cooked with fragrant herbs and spices, wrapped in a soft tortilla. Perfect for a ...",
    category: cat_wraps._id,
    basePricePence: 580,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_steak_wrap = await MenuItem.create({
    tenant: tenantId,
    name: "Steak Wrap",
    menuCode: "WRA-002",
    description: "Strips of steak tikka cooked with aromatic herbs and spices, wrapped in a soft tortilla. A tasty choice from our wraps selection.",
    category: cat_wraps._id,
    basePricePence: 590,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_shish_wrap = await MenuItem.create({
    tenant: tenantId,
    name: "Shish Wrap",
    menuCode: "WRA-003",
    description: "Juicy minced chicken skewers wrapped in a soft tortilla—a delicious and satisfying meal on the go!",
    category: cat_wraps._id,
    basePricePence: 580,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 3,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chips_wrap = await MenuItem.create({
    tenant: tenantId,
    name: "Chips Wrap",
    menuCode: "WRA-004",
    description: "Golden crispy chips wrapped in a delicious tortilla—a crunchy, tasty treat perfect for any time snack!",
    category: cat_wraps._id,
    basePricePence: 509,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 4,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_doner_wrap = await MenuItem.create({
    tenant: tenantId,
    name: "Doner Wrap",
    menuCode: "WRA-005",
    description: "Juicy doner meat all wrapped up in a soft tortilla—the perfect tasty meal. Try it today!",
    category: cat_wraps._id,
    basePricePence: 580,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 5,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mix_doner_wrap = await MenuItem.create({
    tenant: tenantId,
    name: "Mix Doner Wrap",
    menuCode: "WRA-006",
    description: "chicken doner and savory doner meat, perfectly seasoned and wrapped in a soft tortilla for a flavor-packed bite.",
    category: cat_wraps._id,
    basePricePence: 650,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 6,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_doner_wrap = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Doner Wrap",
    menuCode: "WRA-007",
    description: "Enjoy a Chicken Doner Wrap, packed with flavour in a softtortilla wrap. This tasty option perfect for a quick...",
    category: cat_wraps._id,
    basePricePence: 580,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 7,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_chicken_strip_wrap = await MenuItem.create({
    tenant: tenantId,
    name: "Chicken Strip Wrap",
    menuCode: "WRA-008",
    description: "Enjoy our Chicken Strip Wrap, featuring southern fried strips wrapped in a tasty tortilla wrap. Perfect for a quick meal in our Wraps and more category!",
    category: cat_wraps._id,
    basePricePence: 590,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 8,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mince_meat_wrap = await MenuItem.create({
    tenant: tenantId,
    name: "Mince Meat Wrap",
    menuCode: "WRA-009",
    description: "Enjoy our Mince Meat Wrap, cooked with spices and herbs, wrapped in a fresh tortilla. Perfectly satisfying, ideal for any meal.",
    category: cat_wraps._id,
    basePricePence: 580,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 9,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_mix_wrap = await MenuItem.create({
    tenant: tenantId,
    name: "Mix Wrap",
    menuCode: "WRA-010",
    description: "Enjoy our Mix Wrap, featuring chicken tikka and shish cooked with spices and herbs. Served in a tortilla wrap, it's a tasty choice from our Wraps menu.",
    category: cat_wraps._id,
    basePricePence: 650,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 10,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_fillet_burger_wrap = await MenuItem.create({
    tenant: tenantId,
    name: "Fillet Burger Wrap",
    menuCode: "WRA-011",
    description: "Try our Fillet Burger Wrap, filled with tender chicken fillet strips, crisp lettuce, and smooth mayo, all wrapped in a warm tortilla wrap. Perfect for a quick snack!",
    category: cat_wraps._id,
    basePricePence: 590,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 11,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_cheese_burger_wrap = await MenuItem.create({
    tenant: tenantId,
    name: "Cheese Burger Wrap",
    menuCode: "WRA-012",
    description: "Enjoy our Cheese Burger Wrap, toasted with lettuce and mayo Perfectly satisfying, it's a delicious choice in our Wraps. Dive into this tasty option",
    category: cat_wraps._id,
    basePricePence: 590,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 12,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  const item_zinger_burger_wrap = await MenuItem.create({
    tenant: tenantId,
    name: "Zinger Burger Wrap",
    menuCode: "WRA-013",
    description: "Try our Zinger Burger Wrap, featuring spicy zinger strips, fresh lettuce, and creamy mayo, all wrapped up in a soft tortilla wrap. Enjoy it in NOW",
    category: cat_wraps._id,
    basePricePence: 590,
    vatRate: 20,
    modifierGroups: [kebabBreadGroup._id, drizzleGroup._id],
    groupAssignments: assignGroups([kebabBreadGroup._id, drizzleGroup._id]),
    isFeatured: false,
    isActive: true,
    sortOrder: 13,
    kitchenStationId: "HOT_GRILL_LINE",
    backgroundColor: "#1e293b",
    textColor: "#ffffff"
  });

  // --- BUNDLES / DEALS (per TakeaayPOS_Menu Items.md) ---
  console.log('🍱 Seeding bundle deals...');
  await Bundle.create([
    // Pizza BOGO deals (Buy Any 2 Get 1 Free)
    {
      tenant: tenantId, name: 'Buy Any 2x 7" Pizza Get 1 Free', bundlePricePence: 560,
      description: 'Buy any two 7" pizzas and get a third 7" pizza free.',
      backgroundColor: '#ea580c', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Pizza 1', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Pizza 2', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Free Pizza', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
      ],
    },
    {
      tenant: tenantId, name: 'Buy Any 2x 9" Pizza Get 1 Free', bundlePricePence: 740,
      description: 'Buy any two 9" pizzas and get a third 9" pizza free.',
      backgroundColor: '#ea580c', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Pizza 1', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Pizza 2', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Free Pizza', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
      ],
    },
    {
      tenant: tenantId, name: 'Buy Any 2x 12" Pizza Get 1 Free', bundlePricePence: 1190,
      description: 'Buy any two 12" pizzas and get a third 12" pizza free.',
      backgroundColor: '#ea580c', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Pizza 1', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Pizza 2', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Free Pizza', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
      ],
    },
    {
      tenant: tenantId, name: 'Buy Any 2x 16" Pizza Get 1 Free', bundlePricePence: 1380,
      description: 'Buy any two 16" pizzas and get a third 16" pizza free.',
      backgroundColor: '#ea580c', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Pizza 1', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Pizza 2', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Free Pizza', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
      ],
    },
    // Multi-pizza offers
    {
      tenant: tenantId, name: 'Any 2x 9" Pizzas', bundlePricePence: 1400,
      description: 'Choose any two 9-inch pizzas.',
      backgroundColor: '#f59e0b', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Pizza 1', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Pizza 2', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
      ],
    },
    {
      tenant: tenantId, name: 'Any 2x 12" Pizzas', bundlePricePence: 2400,
      description: 'Choose any two 12-inch pizzas.',
      backgroundColor: '#f59e0b', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Pizza 1', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Pizza 2', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
      ],
    },
    {
      tenant: tenantId, name: 'Any 2x 16" Pizzas', bundlePricePence: 2800,
      description: 'Choose any two 16-inch pizzas.',
      backgroundColor: '#f59e0b', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Pizza 1', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Pizza 2', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
      ],
    },
    // Weekday pizza + drink deal
    {
      tenant: tenantId, name: 'Weekday Deal: 7" Pizza With Pepsi Can', bundlePricePence: 499,
      description: 'Any 7-inch pizza with a Pepsi can — weekday only.',
      backgroundColor: '#22c55e', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Pizza', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Drink', allowedCategoryIds: [], minChoices: 1, maxChoices: 1, required: true },
      ],
    },
    // Pizza meal deals
    {
      tenant: tenantId, name: 'Pizza Meal Deal 1', bundlePricePence: 1050,
      description: 'Any 7" pizza + onion rings + doner meat + chips.',
      backgroundColor: '#3b82f6', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Pizza', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Side 1', allowedCategoryIds: [cat_sides._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Side 2', allowedCategoryIds: [cat_sides._id], minChoices: 1, maxChoices: 1, required: true },
      ],
    },
    {
      tenant: tenantId, name: 'Pizza Meal Deal 2', bundlePricePence: 2200,
      description: 'Any 12" pizza + garlic baguette + doner meat + chips + onion rings.',
      backgroundColor: '#3b82f6', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Pizza', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Garlic Bread', allowedCategoryIds: [cat_garlic_baguette._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Side', allowedCategoryIds: [cat_sides._id], minChoices: 1, maxChoices: 1, required: true },
      ],
    },
    {
      tenant: tenantId, name: 'Pizza Meal Deal 3', bundlePricePence: 2390,
      description: 'Any 16" pizza + doner meat + chips + onion rings.',
      backgroundColor: '#3b82f6', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Pizza', allowedCategoryIds: [cat_pizzas._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Side', allowedCategoryIds: [cat_sides._id], minChoices: 1, maxChoices: 2, required: true },
      ],
    },
    // Rup Express Nan deals
    {
      tenant: tenantId, name: 'Rup Express Nan 1', bundlePricePence: 1090,
      description: '7" box: 1pc chicken, doner meat, chicken doner, shish in naan + chips.',
      backgroundColor: '#a855f7', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Kebab', allowedCategoryIds: [cat_kebabs._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Side', allowedCategoryIds: [cat_sides._id], minChoices: 1, maxChoices: 1, required: true },
      ],
    },
    {
      tenant: tenantId, name: 'Rup Express Nan 2', bundlePricePence: 2200,
      description: '9" box: 2pc chicken, doner meat, chicken doner, 3pc shish in naan + chips.',
      backgroundColor: '#a855f7', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Kebab', allowedCategoryIds: [cat_kebabs._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Side', allowedCategoryIds: [cat_sides._id], minChoices: 1, maxChoices: 1, required: true },
      ],
    },
    // Kebab box deals
    {
      tenant: tenantId, name: 'Chicken Tikka Doner Box', bundlePricePence: 1250,
      description: 'Chicken tikka doner served in a loaded box.',
      backgroundColor: '#ec4899', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Kebab', allowedCategoryIds: [cat_kebab_box_deals._id], minChoices: 1, maxChoices: 1, required: true },
      ],
    },
    {
      tenant: tenantId, name: 'Mixed Grill Box', bundlePricePence: 1400,
      description: 'Mixed grill selection served in a loaded box.',
      backgroundColor: '#ec4899', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Kebab', allowedCategoryIds: [cat_kebab_box_deals._id], minChoices: 1, maxChoices: 1, required: true },
      ],
    },
    // Value packs / meal deals
    {
      tenant: tenantId, name: 'Burger Special', bundlePricePence: 950,
      description: 'Burger meal special with sides.',
      backgroundColor: '#10b981', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Burger', allowedCategoryIds: [cat_burgers._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Side', allowedCategoryIds: [cat_sides._id], minChoices: 0, maxChoices: 1, required: false },
      ],
    },
    {
      tenant: tenantId, name: 'Kids Meal Deal', bundlePricePence: 490,
      description: 'Small meal deal perfect for kids.',
      backgroundColor: '#10b981', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Main', allowedCategoryIds: [cat_burgers._id, cat_sfc_and_value_boxes._id], minChoices: 1, maxChoices: 1, required: true },
      ],
    },
    {
      tenant: tenantId, name: 'Mixed Box', bundlePricePence: 850,
      description: 'Mixed selection box.',
      backgroundColor: '#10b981', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Main', allowedCategoryIds: [cat_sfc_and_value_boxes._id, cat_kebabs._id], minChoices: 1, maxChoices: 1, required: true },
      ],
    },
    {
      tenant: tenantId, name: 'Chicken Tikka Meal Deal', bundlePricePence: 900,
      description: 'Chicken tikka meal with sides.',
      backgroundColor: '#10b981', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Main', allowedCategoryIds: [cat_kebabs._id], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Side', allowedCategoryIds: [cat_sides._id], minChoices: 0, maxChoices: 1, required: false },
      ],
    },
    {
      tenant: tenantId, name: 'Curry Deal', bundlePricePence: 1890,
      description: 'Curry offers deal — curry with sides and drink.',
      backgroundColor: '#ef4444', textColor: '#ffffff', isActive: true,
      components: [
        { label: 'Curry', allowedCategoryIds: [], minChoices: 1, maxChoices: 1, required: true },
        { label: 'Side', allowedCategoryIds: [cat_sides._id], minChoices: 0, maxChoices: 1, required: false },
      ],
    },
  ]);

  // --- VARIATIONS ---
  await Variation.create([
    { tenant: tenantId, menuItem: item_pizza_burger._id, name: 'Single Patty Build', priceDeltaPence: 0, isDefault: true, sku: 'BG-BUR-001-SGL', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_pizza_burger._id, name: 'Double Patty Build', priceDeltaPence: 200, isDefault: false, sku: 'BG-BUR-001-DBL', sortOrder: 1 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_beef_burger._id, name: 'Single Patty Build', priceDeltaPence: 0, isDefault: true, sku: 'BG-BUR-002-SGL', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_beef_burger._id, name: 'Double Patty Build', priceDeltaPence: 200, isDefault: false, sku: 'BG-BUR-002-DBL', sortOrder: 1 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_cheese_burger._id, name: 'Single Patty Build', priceDeltaPence: 0, isDefault: true, sku: 'BG-BUR-003-SGL', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_cheese_burger._id, name: 'Double Patty Build', priceDeltaPence: 200, isDefault: false, sku: 'BG-BUR-003-DBL', sortOrder: 1 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_chicken_fillet_burger._id, name: 'Single Patty Build', priceDeltaPence: 0, isDefault: true, sku: 'BG-BUR-004-SGL', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_chicken_fillet_burger._id, name: 'Double Patty Build', priceDeltaPence: 200, isDefault: false, sku: 'BG-BUR-004-DBL', sortOrder: 1 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_cheese_burger_and_egg._id, name: 'Single Patty Build', priceDeltaPence: 0, isDefault: true, sku: 'BG-BUR-005-SGL', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_cheese_burger_and_egg._id, name: 'Double Patty Build', priceDeltaPence: 200, isDefault: false, sku: 'BG-BUR-005-DBL', sortOrder: 1 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_zinger_burger._id, name: 'Single Patty Build', priceDeltaPence: 0, isDefault: true, sku: 'BG-BUR-006-SGL', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_zinger_burger._id, name: 'Double Patty Build', priceDeltaPence: 200, isDefault: false, sku: 'BG-BUR-006-DBL', sortOrder: 1 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_tower_burger._id, name: 'Single Patty Build', priceDeltaPence: 0, isDefault: true, sku: 'BG-BUR-007-SGL', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_tower_burger._id, name: 'Double Patty Build', priceDeltaPence: 200, isDefault: false, sku: 'BG-BUR-007-DBL', sortOrder: 1 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_combo_burger._id, name: 'Single Patty Build', priceDeltaPence: 0, isDefault: true, sku: 'BG-BUR-008-SGL', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_combo_burger._id, name: 'Double Patty Build', priceDeltaPence: 200, isDefault: false, sku: 'BG-BUR-008-DBL', sortOrder: 1 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_deluxe_burger._id, name: 'Single Patty Build', priceDeltaPence: 0, isDefault: true, sku: 'BG-BUR-009-SGL', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_deluxe_burger._id, name: 'Double Patty Build', priceDeltaPence: 200, isDefault: false, sku: 'BG-BUR-009-DBL', sortOrder: 1 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_loaded_burger._id, name: 'Single Patty Build', priceDeltaPence: 0, isDefault: true, sku: 'BG-BUR-010-SGL', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_loaded_burger._id, name: 'Double Patty Build', priceDeltaPence: 200, isDefault: false, sku: 'BG-BUR-010-DBL', sortOrder: 1 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_margherita_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-010-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_margherita_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-010-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_margherita_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-010-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_margherita_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-010-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_garlic_cheese_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-011-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_garlic_cheese_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-011-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_garlic_cheese_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-011-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_garlic_cheese_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-011-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_meat_feast_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-012-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_meat_feast_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-012-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_meat_feast_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-012-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_meat_feast_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-012-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_hawaiian_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-013-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_hawaiian_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-013-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_hawaiian_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-013-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_hawaiian_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-013-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_hot_shot_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-014-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_hot_shot_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-014-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_hot_shot_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-014-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_hot_shot_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-014-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_spicy_feast_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-015-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_spicy_feast_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-015-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_spicy_feast_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-015-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_spicy_feast_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-015-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_apollo_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-016-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_apollo_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-016-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_apollo_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-016-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_apollo_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-016-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_vegetarian_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-017-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_vegetarian_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-017-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_vegetarian_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-017-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_vegetarian_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-017-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_smokey_special_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-018-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_smokey_special_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-018-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_smokey_special_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-018-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_smokey_special_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-018-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_cheesy_bbq_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-019-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_cheesy_bbq_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-019-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_cheesy_bbq_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-019-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_cheesy_bbq_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-019-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_doner_special_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-020-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_doner_special_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-020-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_doner_special_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-020-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_doner_special_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-020-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_fire_ball_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-021-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_fire_ball_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-021-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_fire_ball_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-021-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_fire_ball_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-021-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_double_pepperoni_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-022-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_double_pepperoni_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-022-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_double_pepperoni_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-022-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_double_pepperoni_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-022-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_oriental_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-023-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_oriental_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-023-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_oriental_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-023-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_oriental_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-023-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_bbq_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-024-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_bbq_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-024-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_bbq_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-024-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_bbq_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-024-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_curry_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-025-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_curry_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-025-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_curry_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-025-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_curry_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-025-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_express_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-026-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_express_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-026-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_express_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-026-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_express_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-026-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_apna_style_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-027-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_apna_style_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-027-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_apna_style_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-027-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_apna_style_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-027-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_mighty_meat_feast_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-028-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_mighty_meat_feast_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-028-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_mighty_meat_feast_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-028-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_mighty_meat_feast_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-028-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_rupeyal_special_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-029-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_rupeyal_special_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-029-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_rupeyal_special_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-029-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_rupeyal_special_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-029-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_half_and_half_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PIZ-030-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_half_and_half_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PIZ-030-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_half_and_half_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PIZ-030-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_half_and_half_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PIZ-030-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_margherita_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-001-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_margherita_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-001-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_margherita_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-001-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_margherita_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-001-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_garlic_cheese_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-002-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_garlic_cheese_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-002-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_garlic_cheese_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-002-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_garlic_cheese_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-002-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_meat_feast_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-003-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_meat_feast_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-003-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_meat_feast_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-003-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_meat_feast_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-003-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_hawaiian_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-004-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_hawaiian_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-004-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_hawaiian_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-004-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_hawaiian_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-004-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_hot_shot_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-005-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_hot_shot_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-005-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_hot_shot_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-005-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_hot_shot_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-005-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_spicy_feast_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-006-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_spicy_feast_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-006-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_spicy_feast_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-006-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_spicy_feast_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-006-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_apollo_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-007-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_apollo_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-007-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_apollo_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-007-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_apollo_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-007-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_vegetarian_pizza_all_veg._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-008-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_vegetarian_pizza_all_veg._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-008-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_vegetarian_pizza_all_veg._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-008-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_vegetarian_pizza_all_veg._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-008-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_smokey_special_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-009-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_smokey_special_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-009-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_smokey_special_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-009-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_smokey_special_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-009-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_cheesy_bbq_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-010-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_cheesy_bbq_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-010-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_cheesy_bbq_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-010-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_cheesy_bbq_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-010-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_doner_special_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-011-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_doner_special_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-011-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_doner_special_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-011-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_doner_special_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-011-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_fire_ball_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-012-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_fire_ball_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-012-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_fire_ball_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-012-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_fire_ball_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-012-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_double_pepperoni_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-013-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_double_pepperoni_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-013-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_double_pepperoni_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-013-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_double_pepperoni_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-013-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_oriental_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-014-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_oriental_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-014-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_oriental_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-014-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_oriental_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-014-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_bbq_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-015-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_bbq_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-015-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_bbq_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-015-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_bbq_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-015-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_curry_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-016-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_curry_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-016-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_curry_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-016-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_curry_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-016-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_express_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-017-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_express_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-017-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_express_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-017-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_express_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-017-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_apna_style_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-018-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_apna_style_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-018-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_apna_style_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-018-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_apna_style_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-018-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_popcorn_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-019-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_popcorn_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-019-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_popcorn_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-019-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_popcorn_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-019-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_rupeyal_special_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-020-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_rupeyal_special_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-020-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_rupeyal_special_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-020-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_rupeyal_special_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-020-16', sortOrder: 3 }
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: item_square_mighty_meat_feast_pizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-SQU-021-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: item_square_mighty_meat_feast_pizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-SQU-021-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: item_square_mighty_meat_feast_pizza._id, name: '12" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-SQU-021-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: item_square_mighty_meat_feast_pizza._id, name: '16" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-SQU-021-16', sortOrder: 3 }
  ]);

  console.log('🚗 Creating delivery zones...');
  await DeliveryZone.create([
    {
      tenant: tenantId,
      name: 'Zone 1 — Tunstall Central',
      postcodePrefix: ['ST6'],
      radiusMiles: 2.0,
      storeCoords: { lat: 53.06469, lng: -2.21445 },
      deliveryChargePence: 150,
      minimumOrderPence: 1000,
      estimatedDeliveryMinutes: 30,
    },
    {
      tenant: tenantId,
      name: 'Zone 2 — Stoke Outskirts',
      postcodePrefix: ['ST1', 'ST5'],
      radiusMiles: 4.5,
      storeCoords: { lat: 53.06469, lng: -2.21445 },
      deliveryChargePence: 300,
      minimumOrderPence: 1500,
      estimatedDeliveryMinutes: 45,
    },
  ]);

  console.log('⚙️ Creating restaurant settings...');
  await Setting.create({
    tenant: tenantId,
    receiptHeader: "Rupeyal Express\n385 High Street, Tunstall, ST6 5EP\nTel: 01782 790 600",
    receiptFooter: "VAT Number: GB123456789\nThank you for ordering with us!\nOrder online at rupeyaltunstall.com",
    receiptShowLogo: true,
    receiptShowVat: true,
    smsConfirmationEnabled: true,
    emailConfirmationEnabled: true,
    pushNotificationsEnabled: false,
    cashEnabled: true,
    cardEnabled: true,
    maxItemsPerOrder: 150,
    allowSpecialInstructions: true,
    autoConfirmOrders: true,
    printerEnabled: false,
    printerHost: '192.168.1.200',
    printerPort: 9100,
    printKitchenTicket: true,
    printCustomerReceipt: true,
  });

  console.log('\n🎉 DATABASE SEED COMPLETED SUCCESSFULLY!');
}

if (process.argv[1]?.endsWith('seed_spiceup.js')) {
  try {
    await connectDb();
    await seed();
    await disconnectDb();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

export async function seedIfEmpty() {
  const [targetTenantExists, userCount] = await Promise.all([
    Tenant.findById(TARGET_TENANT_ID).select('_id').lean(),
    User.countDocuments({ tenant: TARGET_TENANT_ID })
  ]);
  if (!targetTenantExists || userCount === 0) {
    await seed();
  }
}

/**
 * One-time repair: for each default user, verify the stored PIN still validates
 * against its known default; if not (corrupted hash from the old double-hash
 * bug), re-hash and persist the default. Only ever touches the 5 default
 * usernames and only when their hash is provably broken — a user with a working
 * custom PIN is never affected.
 *
 * Replaces the previous in-request auth-bypass that lived in authController.
 */
export async function repairDefaultUserPins() {
  try {
    const tenant = await Tenant.findById(TARGET_TENANT_ID).select('_id').lean()
      ?? (await Tenant.findOne().select('_id').lean());
    if (!tenant) {
      console.warn('⚠️  repairDefaultUserPins: no tenant found — skipping PIN repair');
      return;
    }
    const tenantId = tenant._id;
    console.log(`🔧 Repairing default user PINs for tenant ${tenantId}...`);

    const defaultUsers = [
      { username: 'admin',   pin: '1111' },
      { username: 'manager', pin: '2222' },
      { username: 'cashier', pin: '3333' },
      { username: 'kitchen', pin: '4444' },
      { username: 'driver',  pin: '5555' },
    ];

    let repaired = 0;
    for (const { username, pin } of defaultUsers) {
      const user = await User.findOne({ tenant: tenantId, username });
      if (!user) {
        console.log(`   ⏭️  ${username}: user not found — will be created by ensureAdminExists`);
        continue;
      }

      // Only repair when the stored PIN genuinely fails to verify.
      const pinWorks = user.pin && (await user.verifyPin(pin));
      if (!pinWorks) {
        console.log(`   🔧 ${username}: PIN verification failed — re-hashing...`);
        user.pin = await User.hashPin(pin);
        await user.save();
        repaired++;
      } else {
        console.log(`   ✅ ${username}: PIN OK`);
      }
    }
    console.log(`🔧 PIN repair complete — ${repaired} PIN(s) fixed`);
  } catch (err) {
    console.error('Error repairing default user PINs:', err);
  }
}

/**
 * Guarantee the five default staff accounts exist and are healthy. Crucially,
 * an existing PIN is NEVER overwritten — only missing ones are seeded — so any
 * PIN a user has set themselves is preserved.
 */
export async function ensureAdminExists() {
  try {
    const tenant = await Tenant.findById(TARGET_TENANT_ID).select('_id').lean()
      ?? (await Tenant.findOne().select('_id').lean());
    if (!tenant) return;
    const tenantId = tenant._id;

    const ensureUser = async (username, name, role, defaultPin, defaultPass) => {
      let user = await User.findOne({ tenant: tenantId, username });

      if (!user) {
        console.log(`🛡️ Default ${role} user not found. Re-creating default ${role}...`);
        const pinHash = await User.hashPin(defaultPin);
        const passHash = await User.hashPassword(defaultPass);
        await User.create({
          tenant: tenantId,
          name,
          username,
          role,
          passwordHash: passHash,
          pin: pinHash,
          isActive: true,
        });
        return;
      }

      // User exists — only fix role/isActive/missing PIN. NEVER overwrite an existing PIN.
      let needsUpdate = false;

      if (user.role !== role) {
        user.role = role;
        needsUpdate = true;
      }

      if (user.isActive !== true) {
        user.isActive = true;
        needsUpdate = true;
      }

      // Only seed a PIN if the user has none at all.
      if (!user.pin || (typeof user.pin === 'string' && user.pin.trim() === '')) {
        // Pin set silently — no log output to avoid leaking user credential state.
        user.pin = await User.hashPin(defaultPin);
        needsUpdate = true;
      }

      // Only seed a password if none exists.
      if (!user.passwordHash) {
        user.passwordHash = await User.hashPassword(defaultPass);
        needsUpdate = true;
      }

      if (needsUpdate) {
        await user.save();
      }
    };

    await ensureUser('admin',   'Owner Admin',     'admin',   '1111', 'Admin123!');
    await ensureUser('manager', 'Shift Manager',   'manager', '2222', 'Manager123!');
    await ensureUser('cashier', 'Cashier Staff',   'cashier', '3333', 'Cashier123!');
    await ensureUser('kitchen', 'Kitchen Chef',    'kitchen', '4444', 'Kitchen123!');
    await ensureUser('driver',  'Delivery Driver', 'driver',  '5555', 'Driver123!');
  } catch (err) {
    console.error('Error ensuring default users exist:', err);
  }
}
