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
        { day: 0, open: '12:00', close: '23:00' }, // Sun
        { day: 1, open: '16:00', close: '23:00' }, // Mon
        { day: 2, open: '16:00', close: '23:00' }, // Tue
        { day: 3, open: '16:00', close: '23:00' }, // Wed
        { day: 4, open: '16:00', close: '23:00' }, // Thu
        { day: 5, open: '12:00', close: '00:00' }, // Fri
        { day: 6, open: '12:00', close: '00:00' }, // Sat
      ],
      deliveryLeadMinutes: 45,
      collectionLeadMinutes: 20,
      minimumOrderPence: 1000,
      isOpen: true,
      currency: 'GBP',
      timezone: 'Europe/London',
    },
    voiceAgentEnabled: true,
    voiceAgentVoice: 'Aoede',
    voiceAgentPrompt: 'You are an AI order-taker for Rupeyal Express. Greet customers warmly and help them order.',
    plan: 'pro',
  });

  const tenantId = tenant._id;
  console.log(`✅ Tenant created: ${tenant.businessName} (ID: ${tenantId})`);

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
    {
      tenant: tenantId,
      name: 'Owner Admin',
      username: 'admin',
      email: 'admin@papaspizza.co.uk',
      role: 'admin',
      passwordHash: adminPass,
      pin: pin1111,
    },
    {
      tenant: tenantId,
      name: 'Shift Manager',
      username: 'manager',
      email: 'manager@papaspizza.co.uk',
      role: 'manager',
      passwordHash: managerPass,
      pin: pin2222,
    },
    {
      tenant: tenantId,
      name: 'Cashier Staff',
      username: 'cashier',
      role: 'cashier',
      passwordHash: cashierPass,
      pin: pin3333,
    },
    {
      tenant: tenantId,
      name: 'Kitchen Chef',
      username: 'kitchen',
      role: 'kitchen',
      passwordHash: kitchenPass,
      pin: pin4444,
    },
    {
      tenant: tenantId,
      name: 'Delivery Driver',
      username: 'driver',
      role: 'driver',
      passwordHash: driverPass,
      pin: pin5555,
    },
  ]);
  console.log('✅ Staff users seeded.');

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
  ]);
  const dept = Object.fromEntries(departments.map(d => [d.name, d._id]));
  console.log('✅ Departments seeded.');

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
  console.log('✅ Modifier labels seeded.');

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
    { name: 'GO REGULAR', defaultPriceDeltaPence: 0 },
    { name: 'GO LARGE', defaultPriceDeltaPence: 150 },
    { name: 'EXTRA GARLIC', defaultPriceDeltaPence: 50 },
    { name: 'NORMAL', defaultPriceDeltaPence: 0 },
    { name: 'HOT', defaultPriceDeltaPence: 0 },
    { name: 'MILD', defaultPriceDeltaPence: 0 },
    { name: 'WELL DONE', defaultPriceDeltaPence: 0 },

    // Margherita specific components
    { name: '8" Pizza', defaultPriceDeltaPence: 0 },
    { name: '10" Pizza', defaultPriceDeltaPence: 150 },
    { name: '12" Pizza', defaultPriceDeltaPence: 300 },
    { name: '16" Pizza', defaultPriceDeltaPence: 600 },
    { name: 'Standard Crust', defaultPriceDeltaPence: 0 },
    { name: 'Thin Crust', defaultPriceDeltaPence: 0 },
    { name: 'Stuffed Crust', defaultPriceDeltaPence: 250 },
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
    { name: 'No Garlic & Herb Dip', defaultPriceDeltaPence: 0 }
  ];
  const componentsList = await Component.create(rawComponents.map(c => ({
    tenant: tenantId,
    name: c.name,
    defaultPriceDeltaPence: c.defaultPriceDeltaPence,
    color: '#1e293b',
    textColor: '#f8fafc'
  })));
  const comp = Object.fromEntries(componentsList.map(c => [c.name, c]));
  console.log('✅ Global components seeded.');

  console.log('⏰ Creating product times...');
  const productTimesList = await ProductTime.create([
    { tenant: tenantId, name: 'Breakfast', startTime: '08:00', endTime: '11:30' },
    { tenant: tenantId, name: 'Lunch', startTime: '11:30', endTime: '15:30' },
    { tenant: tenantId, name: 'Dinner', startTime: '15:30', endTime: '23:30' }
  ]);
  console.log('✅ Product times seeded.');

  console.log('🍔 Creating categories & sub-categories...');
  // Curries Category
  const curriesCategory = await Category.create({
    tenant: tenantId,
    name: 'CURRIES',
    slug: 'curries',
    displayOrder: 1,
    color: '#b91c1c',
    backgroundColor: '#b91c1c',
    department: dept.CURRYS
  });

  // Curries sub-categories
  const subCategories = await Category.create([
    { tenant: tenantId, name: 'BALTI DISHES', slug: 'balti-dishes', displayOrder: 1, parent: curriesCategory._id, department: dept.CURRYS, backgroundColor: '#991b1b' },
    { tenant: tenantId, name: 'BHUNA DISHES', slug: 'bhuna-dishes', displayOrder: 2, parent: curriesCategory._id, department: dept.CURRYS, backgroundColor: '#991b1b' },
    { tenant: tenantId, name: 'KORMA DISHES', slug: 'korma-dishes', displayOrder: 3, parent: curriesCategory._id, department: dept.CURRYS, backgroundColor: '#991b1b' }
  ]);

  const pizzasCategory = await Category.create({
    tenant: tenantId,
    name: 'PIZZAS',
    slug: 'pizzas',
    displayOrder: 2,
    color: '#f59e0b',
    backgroundColor: '#f59e0b',
    department: dept.PIZZA
  });

  const sidesCategory = await Category.create({
    tenant: tenantId,
    name: 'SIDES',
    slug: 'sides',
    displayOrder: 3,
    color: '#10b981',
    backgroundColor: '#10b981',
    department: dept['SIDE ORDER']
  });

  const drinksCategory = await Category.create({
    tenant: tenantId,
    name: 'DRINKS',
    slug: 'drinks',
    displayOrder: 4,
    color: '#3b82f6',
    backgroundColor: '#3b82f6',
    department: dept['DRINK N DESSETS']
  });
  console.log('✅ Categories and sub-categories seeded.');

  console.log('➕ Creating modifier groups...');
  const sizeGroup = await ModifierGroup.create({
    tenant: tenantId,
    name: 'Choose your size',
    displayName: 'Pizza Size',
    dashboardHeading: 'CHOOSE PIZZA SIZE',
    staticLabelsEnabled: false,
    type: 'required',
    selectionType: 'single',
    minSelections: 1,
    maxSelections: 1,
    options: [
      { name: '8" Pizza', priceDeltaPence: 0, isDefault: true, component: comp['8" Pizza']?._id },
      { name: '10" Pizza', priceDeltaPence: 150, component: comp['10" Pizza']?._id },
      { name: '12" Pizza', priceDeltaPence: 300, component: comp['12" Pizza']?._id },
      { name: '16" Pizza', priceDeltaPence: 600, component: comp['16" Pizza']?._id },
    ],
  });

  const crustGroup = await ModifierGroup.create({
    tenant: tenantId,
    name: 'Choose your Crust',
    displayName: 'Crust',
    dashboardHeading: 'CHOOSE PIZZA CRUST',
    staticLabelsEnabled: false,
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
    dashboardHeading: 'CHOOSE DRIZZLE ON PIZZA',
    staticLabelsEnabled: false,
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
    staticLabelsEnabled: false,
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
    allowedLabelIds: [labelByName.NO, labelByName.LESS, labelByName['ON CHIPS'], labelByName['ALL OVER']],
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
  console.log('✅ Modifier groups seeded.');

  console.log('🍕 Creating menu items...');
  const assignGroups = (groupIds) => groupIds.map((group, index) => ({
    group,
    isEnabled: true,
    requiredOverride: null,
    posOrder: index,
    websiteOrder: index,
    showOnPos: true,
    showOnWebsite: true,
  }));
  const menuItems = await MenuItem.create([
    {
      tenant: tenantId,
      name: 'CHICKEN BALTI',
      menuCode: 'CUR-01',
      description: 'Chicken cooked in a traditional Balti sauce with rich spices.',
      category: subCategories[0]._id, // BALTI DISHES
      basePricePence: 999,
      vatRate: 20,
      modifierGroups: [curryAddonsGroup._id],
      groupAssignments: assignGroups([curryAddonsGroup._id]),
      isFeatured: true,
      sortOrder: 1,
      backgroundColor: '#b91c1c',
      textColor: '#ffffff',
      images: ['https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&auto=format&fit=crop&q=60']
    },
    {
      tenant: tenantId,
      name: 'MEAT BALTI',
      menuCode: 'CUR-02',
      description: 'Tender meat chunks simmered in aromatic Balti spices.',
      category: subCategories[0]._id, // BALTI DISHES
      basePricePence: 1099,
      vatRate: 20,
      modifierGroups: [curryAddonsGroup._id],
      groupAssignments: assignGroups([curryAddonsGroup._id]),
      isFeatured: true,
      sortOrder: 2,
      backgroundColor: '#b91c1c',
      textColor: '#ffffff',
      images: ['https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=60']
    },
    {
      tenant: tenantId,
      name: 'Margarita',
      menuCode: 'PIZ-01',
      description: 'Cheddar & Mozzarella Cheese.',
      category: pizzasCategory._id,
      basePricePence: 750,
      vatRate: 20,
      modifierGroups: [sizeGroup._id, crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
      groupAssignments: assignGroups([sizeGroup._id, crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
      isFeatured: true,
      sortOrder: 1,
      backgroundColor: '#f59e0b',
      textColor: '#ffffff',
      images: ['https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60']
    },
    {
      tenant: tenantId,
      name: 'Pepperoni Passion',
      menuCode: 'PIZ-02',
      description: 'Double helpings of pepperoni and extra mozzarella.',
      category: pizzasCategory._id,
      basePricePence: 1199,
      vatRate: 20,
      modifierGroups: [sizeGroup._id, pizzaToppingsGroup._id],
      groupAssignments: assignGroups([sizeGroup._id, pizzaToppingsGroup._id]),
      isFeatured: true,
      sortOrder: 2,
      backgroundColor: '#f59e0b',
      textColor: '#ffffff',
      images: ['https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&auto=format&fit=crop&q=60']
    },
    {
      tenant: tenantId,
      name: 'Garlic Pizza Bread',
      menuCode: 'SID-01',
      description: 'Freshly baked garlic pizza bread with mozzarella cheese.',
      category: sidesCategory._id,
      basePricePence: 499,
      vatRate: 20,
      sortOrder: 1,
      backgroundColor: '#10b981',
      textColor: '#ffffff',
      images: ['https://images.unsplash.com/photo-1573145959986-a152586a5183?w=500&auto=format&fit=crop&q=60']
    },
    {
      tenant: tenantId,
      name: 'Coca-Cola Can',
      menuCode: 'DRK-01',
      description: '330ml can of cold Coca-Cola Classic.',
      category: drinksCategory._id,
      basePricePence: 120,
      vatRate: 20,
      sortOrder: 1,
      backgroundColor: '#3b82f6',
      textColor: '#ffffff',
      images: ['https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60']
    }
  ]);

  console.log('🌱 Setting up Variations, Burgers, and Meal Deals...');
  
  const apnaStylePizza = await MenuItem.create({
    tenant: tenantId,
    name: 'Apna Style Pizza',
    menuCode: 'PIZ-APNA',
    description: 'Chicken tikka, onions, mixed peppers, sweetcorn, green chilli and spicy Asian sauce.',
    category: pizzasCategory._id,
    department: dept.PIZZA,
    basePricePence: 799,
    vatRate: 20,
    modifierGroups: [crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id],
    groupAssignments: assignGroups([crustGroup._id, pizzaToppingsGroup._id, drizzleGroup._id, dipGroup._id]),
    channels: { pos: true, website: true, mobile: true },
    publishStatus: 'published',
    isFeatured: true,
    sortOrder: 3,
    kitchenStationId: 'PIZZA_LINE',
    backgroundColor: '#f59e0b',
    textColor: '#ffffff',
    images: ['https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500&auto=format&fit=crop&q=60']
  });

  // Set kitchenStationId for Balti Curries
  const chickenBalti = menuItems[0];
  chickenBalti.kitchenStationId = 'CURRY_LINE';
  await chickenBalti.save();

  const meatBalti = menuItems[1];
  meatBalti.kitchenStationId = 'CURRY_LINE';
  await meatBalti.save();

  // Update Margarita Pizza
  const margheritaItem = menuItems[2];
  margheritaItem.kitchenStationId = 'PIZZA_LINE';
  margheritaItem.basePricePence = 699; // starting price for 7"
  await margheritaItem.save();

  // Create Variations for Margarita
  await Variation.create([
    { tenant: tenantId, menuItem: margheritaItem._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-MARG-07' },
    { tenant: tenantId, menuItem: margheritaItem._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-MARG-09' },
    { tenant: tenantId, menuItem: margheritaItem._id, name: '11" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-MARG-11' },
    { tenant: tenantId, menuItem: margheritaItem._id, name: '13" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-MARG-13' },
  ]);

  // Update Pepperoni Pizza
  const pepperoniItem = menuItems[3];
  pepperoniItem.kitchenStationId = 'PIZZA_LINE';
  pepperoniItem.basePricePence = 899; // starting price for 7"
  await pepperoniItem.save();

  // Create Variations for Pepperoni
  await Variation.create([
    { tenant: tenantId, menuItem: pepperoniItem._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-PEP-07' },
    { tenant: tenantId, menuItem: pepperoniItem._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-PEP-09' },
    { tenant: tenantId, menuItem: pepperoniItem._id, name: '11" Medium', priceDeltaPence: 400, isDefault: false, sku: 'PZ-PEP-11' },
    { tenant: tenantId, menuItem: pepperoniItem._id, name: '13" Large', priceDeltaPence: 700, isDefault: false, sku: 'PZ-PEP-13' },
  ]);

  await Variation.create([
    { tenant: tenantId, menuItem: apnaStylePizza._id, name: '7" Personal', priceDeltaPence: 0, isDefault: true, sku: 'PZ-APNA-07', sortOrder: 0 },
    { tenant: tenantId, menuItem: apnaStylePizza._id, name: '9" Small', priceDeltaPence: 200, isDefault: false, sku: 'PZ-APNA-09', sortOrder: 1 },
    { tenant: tenantId, menuItem: apnaStylePizza._id, name: '12" Medium', priceDeltaPence: 500, isDefault: false, sku: 'PZ-APNA-12', sortOrder: 2 },
    { tenant: tenantId, menuItem: apnaStylePizza._id, name: '14" Large', priceDeltaPence: 800, isDefault: false, sku: 'PZ-APNA-14', sortOrder: 3 },
  ]);

  // Update Coke Drink
  const cokeItem = menuItems[5];
  cokeItem.basePricePence = 120;
  await cokeItem.save();

  // Create Variations for Coke
  await Variation.create([
    { tenant: tenantId, menuItem: cokeItem._id, name: '330ml Can', priceDeltaPence: 0, isDefault: true, sku: 'DK-COKE-330' },
    { tenant: tenantId, menuItem: cokeItem._id, name: '1.5L Bottle', priceDeltaPence: 180, isDefault: false, sku: 'DK-COKE-1.5L' },
  ]);

  // Create BURGERS Category
  const burgersCategory = await Category.create({
    tenant: tenantId,
    name: 'BURGERS',
    slug: 'burgers',
    displayOrder: 5,
    color: '#10b981',
    backgroundColor: '#10b981',
    department: dept.BURGERS
  });

  // Create Traditional Chips item
  const chipsItem = await MenuItem.create({
    tenant: tenantId,
    name: 'Traditional Chips',
    menuCode: 'SID-02',
    description: 'Crispy golden fried chips.',
    category: sidesCategory._id,
    basePricePence: 250,
    vatRate: 20,
    kitchenStationId: 'HOT_GRILL_LINE',
    sortOrder: 2,
    backgroundColor: '#10b981',
    textColor: '#ffffff',
    images: ['https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=60']
  });

  // Create Variations for Chips
  await Variation.create([
    { tenant: tenantId, menuItem: chipsItem._id, name: 'Regular Portion', priceDeltaPence: 0, isDefault: true, sku: 'SD-CHP-REG' },
    { tenant: tenantId, menuItem: chipsItem._id, name: 'Large Portion', priceDeltaPence: 100, isDefault: false, sku: 'SD-CHP-LRG' }
  ]);

  // Create Burger Item
  const burgerItem = await MenuItem.create({
    tenant: tenantId,
    name: 'Classic Chicken Burger',
    menuCode: 'BGR-01',
    description: 'Crispy fried chicken breast fillet in a toasted bun.',
    category: burgersCategory._id,
    basePricePence: 699,
    vatRate: 20,
    kitchenStationId: 'HOT_GRILL_LINE',
    sortOrder: 1,
    backgroundColor: '#10b981',
    textColor: '#ffffff',
    images: ['https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60']
  });

  // Create Variations for Burger
  await Variation.create([
    { tenant: tenantId, menuItem: burgerItem._id, name: 'Single Patty Build', priceDeltaPence: 0, isDefault: true, sku: 'BG-CHIK-SGL' },
    { tenant: tenantId, menuItem: burgerItem._id, name: 'Double Patty Build', priceDeltaPence: 200, isDefault: false, sku: 'BG-CHIK-DBL' }
  ]);

  // Create Burger Meal Deal Bundle
  await Bundle.create({
    tenant: tenantId,
    name: 'Burger Meal Deal',
    description: 'Your choice of Burger, Side and Drink at a discounted price.',
    bundlePricePence: 1099,
    isActive: true,
    components: [
      {
        label: 'Burger Selection',
        allowedCategoryIds: [burgersCategory._id],
        minChoices: 1,
        maxChoices: 1,
        required: true
      },
      {
        label: 'Side Selection',
        allowedCategoryIds: [sidesCategory._id],
        minChoices: 1,
        maxChoices: 1,
        required: true
      },
      {
        label: 'Drink Selection',
        allowedCategoryIds: [drinksCategory._id],
        minChoices: 1,
        maxChoices: 1,
        required: true
      }
    ]
  });

  console.log('✍️ Creating shorthands...');
  await ShortHand.create([
    { tenant: tenantId, menuItem: menuItems[0]._id, shorthandCode: 'Chic Balt', printOnReceipt: true, printOnTicket: true },
    { tenant: tenantId, menuItem: menuItems[2]._id, shorthandCode: 'Marg', printOnReceipt: false, printOnTicket: true },
    { tenant: tenantId, menuItem: menuItems[3]._id, shorthandCode: 'Pep Pass', printOnReceipt: false, printOnTicket: true },
  ]);
  console.log('✅ Variations, Burgers, and Meal Deals seeded.');

  console.log('🚗 Creating delivery zones...');
  await DeliveryZone.create([
    {
      tenant: tenantId,
      name: 'Zone 1 — Tunstall Central',
      postcodePrefix: ['ST6'],
      radiusMiles: 2.0,
      storeCoords: { lat: 53.06469, lng: -2.21445 },
      deliveryChargePence: 150, // £1.50
      minimumOrderPence: 1000,  // £10.00
      estimatedDeliveryMinutes: 30,
    },
    {
      tenant: tenantId,
      name: 'Zone 2 — Stoke Outskirts',
      postcodePrefix: ['ST1', 'ST5'],
      radiusMiles: 4.5,
      storeCoords: { lat: 53.06469, lng: -2.21445 },
      deliveryChargePence: 300, // £3.00
      minimumOrderPence: 1500,  // £15.00
      estimatedDeliveryMinutes: 45,
    },
  ]);
  console.log('✅ Delivery zones seeded.');

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
    maxItemsPerOrder: 50,
    allowSpecialInstructions: true,
    autoConfirmOrders: true,
    printerEnabled: false,
    printerHost: '192.168.1.200',
    printerPort: 9100,
    printKitchenTicket: true,
    printCustomerReceipt: true,
  });
  console.log('✅ Settings seeded.');

  console.log('\n🎉 DEMO DATABASE SEED COMPLETED SUCCESSFULLY!');
  console.log('----------------------------------------------------');
  // SECURITY (Phase A): only echo default credentials in non-production, and never
  // print literal passwords/PINs — they may be captured in CI or deploy logs.
  if (process.env.NODE_ENV !== 'production') {
    console.log('Default users created: admin, manager, cashier, kitchen, driver.');
    console.log('Default credentials are documented in the project README/docs — change them immediately in production.');
    console.log('Default PINs are documented in docs/ — never commit real PINs to logs.');
  } else {
    console.log('Default demo users created. Rotate all default credentials before going live.');
  }
  console.log('----------------------------------------------------');
  console.log(`Please copy this Tenant ID to set your DEFAULT_TENANT_ID in .env:\n${tenantId}\n`);
}

if (process.argv[1]?.endsWith('seed.js')) {
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
  // Verify if the target tenant exists and has users
  const [targetTenantExists, userCount] = await Promise.all([
    Tenant.findById(TARGET_TENANT_ID).select('_id').lean(),
    User.countDocuments({ tenant: TARGET_TENANT_ID })
  ]);

  if (targetTenantExists && userCount > 0) {
    return;
  }

  console.log(`🌱 Target tenant ${TARGET_TENANT_ID} not found or users missing. Re-seeding database...`);
  await seed();
}

/**
 * One-time repair: forcibly reset the PINs for default users to their correct values.
 * This is needed because a previous bug in ensureAdminExists would compare a PIN against
 * the *default* and reset it if it didn't match — causing valid custom PINs to be wiped.
 * More critically, the old code ran bcrypt.hash on every startup and stored fresh hashes,
 * but the verifyPin comparison could fail due to bcrypt salt differences.
 *
 * This function resets all default user PINs to their correct defaults ONCE at startup.
 * After applying this fix, ensureAdminExists no longer overwrites PINs, so this is safe.
 */
export async function repairDefaultUserPins() {
  try {
    const tenant = await Tenant.findOne();
    if (!tenant) return;
    const tenantId = tenant._id;

    const defaultUsers = [
      { username: 'admin',   pin: '1111' },
      { username: 'manager', pin: '2222' },
      { username: 'cashier', pin: '3333' },
      { username: 'kitchen', pin: '4444' },
      { username: 'driver',  pin: '5555' },
    ];

    for (const { username, pin } of defaultUsers) {
      const user = await User.findOne({ tenant: tenantId, username });
      if (!user) continue;

      // Verify if the current stored PIN actually works
      const pinWorks = await user.verifyPin(pin);
      if (!pinWorks) {
        // PIN is corrupted — reset it to the correct default
        user.pin = await User.hashPin(pin);
        await user.save();
      }
    }
  } catch (err) {
    console.error('Error repairing default user PINs:', err);
  }
}

export async function ensureAdminExists() {
  try {
    const tenant = await Tenant.findOne();
    if (!tenant) return;

    const tenantId = tenant._id;

    const ensureUser = async (username, name, role, defaultPin, defaultPass) => {
      let user = await User.findOne({ tenant: tenantId, username });

      if (!user) {
        // User doesn't exist at all — create with default credentials
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
          isActive: true
        });
        return;
      }

      // User exists — only fix role/isActive/missing-PIN. NEVER overwrite an existing PIN.
      let needsUpdate = false;

      if (user.role !== role) {
        user.role = role;
        needsUpdate = true;
      }

      if (user.isActive !== true) {
        user.isActive = true;
        needsUpdate = true;
      }

      // Only set a PIN if the user has none at all (null/undefined/empty string).
      // Never reset an existing PIN — that would wipe any PIN the user has set.
      if (!user.pin || (typeof user.pin === 'string' && user.pin.trim() === '')) {
        // Pin set silently — no log output to avoid leaking user credential state.
        user.pin = await User.hashPin(defaultPin);
        needsUpdate = true;
      }

      // Only set a password hash if none exists
      if (!user.passwordHash) {
        user.passwordHash = await User.hashPassword(defaultPass);
        needsUpdate = true;
      }

      if (needsUpdate) {
        await user.save();
      }
    };

    await ensureUser('admin', 'Owner Admin', 'admin', '1111', 'Admin123!');
    await ensureUser('manager', 'Shift Manager', 'manager', '2222', 'Manager123!');
    await ensureUser('cashier', 'Cashier Staff', 'cashier', '3333', 'Cashier123!');
    await ensureUser('kitchen', 'Kitchen Chef', 'kitchen', '4444', 'Kitchen123!');
    await ensureUser('driver', 'Delivery Driver', 'driver', '5555', 'Driver123!');
  } catch (err) {
    console.error('Error ensuring default users exist:', err);
  }
}


