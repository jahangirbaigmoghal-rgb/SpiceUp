import test from 'node:test';
import assert from 'node:assert';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { app } from '../app.js';
import { connectDb, disconnectDb } from '../config/db.js';
import { env } from '../config/env.js';
import MenuItem from '../models/MenuItem.js';
import Category from '../models/Category.js';
import ModifierGroup from '../models/ModifierGroup.js';
import Department from '../models/Department.js';
import Variation from '../models/Variation.js';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import Label from '../models/Label.js';
import Order from '../models/Order.js';
import { seed } from '../seed.js';
import { compileKitchenTickets } from '../controllers/orderController.js';

let server;
let serverUrl;
let adminToken;
let cashierToken;
let tenantId;

const testCustomer = {
  name: 'Test Customer',
  phone: '07123456789',
  email: 'test@customer.com',
  address: {
    line1: '123 Test Street',
    postcode: 'ST6 5EP'
  }
};

test.before(async () => {
  // 1. Connect to Database (using memory DB or dev Mongo)
  await connectDb();

  // 2. Clear and Seed DB to get fresh clean state
  await Tenant.deleteMany({});
  await MenuItem.deleteMany({});
  await Category.deleteMany({});
  await ModifierGroup.deleteMany({});
  await Department.deleteMany({});
  await Variation.deleteMany({});
  await User.deleteMany({});
  await Label.deleteMany({});
  await Order.deleteMany({});

  await seed();

  // 3. Resolve seeded entities
  const dbTenant = await Tenant.findOne();
  tenantId = dbTenant._id.toString();

  const adminUser = await User.findOne({ role: 'admin' });
  const cashierUser = await User.findOne({ role: 'cashier' });

  // 4. Generate JWT tokens
  adminToken = jwt.sign({ userId: adminUser._id }, env.jwtSecret);
  cashierToken = jwt.sign({ userId: cashierUser._id }, env.jwtSecret);

  // 5. Spin up Express app on a dynamic port
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, resolve);
  });
  serverUrl = `http://localhost:${server.address().port}`;
});

test.after(async () => {
  // 1. Close Server
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  // 2. Disconnect Database
  await disconnectDb();
});

test('POS Menu returns PIZZAS with Apna Style Pizza', async () => {
  const res = await fetch(`${serverUrl}/api/menu/items?channel=pos`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  
  const pizza = data.items.find(i => i.name.toLowerCase().includes('apna style pizza'));
  assert.ok(pizza, 'Apna Style Pizza should be found in POS menu');
  assert.strictEqual(pizza.category?.name.toLowerCase(), 'pizzas');
});

test('Website menu returns published website-visible products and hides drafts', async () => {
  // Create a draft item
  const category = await Category.findOne({ tenant: tenantId });
  const draftItem = await MenuItem.create({
    tenant: tenantId,
    name: 'Draft Special Kebab',
    category: category._id,
    basePricePence: 750,
    publishStatus: 'draft',
    isAvailable: true,
    channels: { website: true, pos: true }
  });

  // Website fetch
  const webRes = await fetch(`${serverUrl}/api/menu/items?channel=website`);
  assert.strictEqual(webRes.status, 200);
  const webData = await webRes.json();

  const foundDraft = webData.items.find(i => i._id === draftItem._id.toString());
  assert.strictEqual(foundDraft, undefined, 'Draft product should be hidden from website menu');

  // Cleanup
  await MenuItem.deleteOne({ _id: draftItem._id });
});

test('Disabled modifier component or group is hidden / rejected', async () => {
  // 1. Find a modifier group and make it inactive
  const mGroup = await ModifierGroup.findOne({ name: 'Extra toppings' });
  mGroup.isActive = false;
  await mGroup.save();

  // Test placing order with inactive group should fail
  const pizzaItem = await MenuItem.findOne({ name: /apna style pizza/i });
  const crustGroup = await ModifierGroup.findOne({ name: 'Choose your Crust' });
  const crustOption = crustGroup.options[0];
  const dipGroup = await ModifierGroup.findOne({ name: 'Choose your Dip' });
  const dipOption = dipGroup.options[0];
  
  const orderPayload = {
    orderType: 'collection',
    channel: 'pos-walkin',
    paymentMethod: 'cash',
    customer: testCustomer,
    lines: [{
      menuItemId: pizzaItem._id.toString(),
      quantity: 1,
      selectedModifiers: [
        {
          groupId: crustGroup._id.toString(),
          optionId: crustOption._id.toString(),
          name: crustOption.name
        },
        {
          groupId: dipGroup._id.toString(),
          optionId: dipOption._id.toString(),
          name: dipOption.name
        },
        {
          groupId: mGroup._id.toString(),
          optionId: mGroup.options[0]._id.toString(),
          name: mGroup.options[0].name,
        }
      ]
    }]
  };

  const res = await fetch(`${serverUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cashierToken}`
    },
    body: JSON.stringify(orderPayload)
  });

  assert.strictEqual(res.status, 400, 'Ordering inactive modifier group should be rejected');
  const errData = await res.json();
  assert.match(errData.error, /Modifier group is not active/i);

  // Restore group
  mGroup.isActive = true;
  await mGroup.save();
});

test('Ordering with inactive label or disabled labels for group is rejected', async () => {
  const pizzaItem = await MenuItem.findOne({ name: /apna style pizza/i });
  const mGroup = await ModifierGroup.findOne({ name: 'Extra toppings' });
  const label = await Label.findOne({ tenant: tenantId });
  const crustGroup = await ModifierGroup.findOne({ name: 'Choose your Crust' });
  const crustOption = crustGroup.options[0];
  const dipGroup = await ModifierGroup.findOne({ name: 'Choose your Dip' });
  const dipOption = dipGroup.options[0];

  // 1. Test inactive label rejection
  label.isActive = false;
  await label.save();

  let orderPayload = {
    orderType: 'collection',
    channel: 'pos-walkin',
    paymentMethod: 'cash',
    customer: testCustomer,
    lines: [{
      menuItemId: pizzaItem._id.toString(),
      quantity: 1,
      selectedModifiers: [
        {
          groupId: crustGroup._id.toString(),
          optionId: crustOption._id.toString(),
          name: crustOption.name
        },
        {
          groupId: dipGroup._id.toString(),
          optionId: dipOption._id.toString(),
          name: dipOption.name
        },
        {
          groupId: mGroup._id.toString(),
          optionId: mGroup.options[0]._id.toString(),
          name: `${label.name} ${mGroup.options[0].name}`,
          labelId: label._id.toString(),
          labelName: label.name
        }
      ]
    }]
  };

  let res = await fetch(`${serverUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cashierToken}`
    },
    body: JSON.stringify(orderPayload)
  });

  assert.strictEqual(res.status, 400);
  let data = await res.json();
  assert.match(data.error, /is inactive/i);

  // Restore label
  label.isActive = true;
  await label.save();

  // 2. Disable labels for this group and test rejection
  mGroup.staticLabelsEnabled = false;
  await mGroup.save();

  res = await fetch(`${serverUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cashierToken}`
    },
    body: JSON.stringify(orderPayload)
  });

  assert.strictEqual(res.status, 400);
  data = await res.json();
  assert.match(data.error, /Labels are disabled for modifier group/i);

  mGroup.staticLabelsEnabled = true;
  await mGroup.save();
});

test('Required modifier group missing selection is rejected', async () => {
  // Make a modifier group required for Apna Style Pizza
  const pizzaItem = await MenuItem.findOne({ name: /apna style pizza/i });
  const crustGroup = await ModifierGroup.findOne({ name: 'Choose your Crust' });
  
  // Set group to required override
  const pizzaDoc = await MenuItem.findById(pizzaItem._id);
  const crustAssignment = pizzaDoc.groupAssignments.find(a => a.group.toString() === crustGroup._id.toString());
  if (crustAssignment) {
    crustAssignment.requiredOverride = true;
    crustAssignment.isEnabled = true;
    await pizzaDoc.save();
  }

  // Order without sending crust selection
  const orderPayload = {
    orderType: 'collection',
    channel: 'pos-walkin',
    paymentMethod: 'cash',
    customer: testCustomer,
    lines: [{
      menuItemId: pizzaItem._id.toString(),
      quantity: 1,
      selectedModifiers: [] // Empty selections
    }]
  };

  const res = await fetch(`${serverUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cashierToken}`
    },
    body: JSON.stringify(orderPayload)
  });

  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /requires at least/i);
});

test('Kitchen ticket split groups items under correct target stations', async () => {
  const pizzaItem = await MenuItem.findOne({ name: /apna style pizza/i });
  const crustGroup = await ModifierGroup.findOne({ name: 'Choose your Crust' });
  const crustOption = crustGroup.options[0];
  const dipGroup = await ModifierGroup.findOne({ name: 'Choose your Dip' });
  const dipOption = dipGroup.options[0];

  const otherItem = await MenuItem.findOne({ kitchenStationId: { $ne: 'PIZZA_LINE' }, modifierGroups: { $size: 0 } });

  const orderPayload = {
    orderType: 'collection',
    channel: 'pos-walkin',
    paymentMethod: 'cash',
    customer: testCustomer,
    lines: [
      {
        menuItemId: pizzaItem._id.toString(),
        quantity: 1,
        selectedModifiers: [
          {
            groupId: crustGroup._id.toString(),
            optionId: crustOption._id.toString(),
            name: crustOption.name
          },
          {
            groupId: dipGroup._id.toString(),
            optionId: dipOption._id.toString(),
            name: dipOption.name
          }
        ]
      },
      {
        menuItemId: otherItem._id.toString(),
        quantity: 2,
        selectedModifiers: []
      }
    ]
  };

  const res = await fetch(`${serverUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cashierToken}`
    },
    body: JSON.stringify(orderPayload)
  });

  if (res.status !== 201) {
    console.error("Ticket split test failed. Body:", await res.text());
  }
  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.ok(data.kitchenTicket, 'Response should contain compiled kitchenTicket text');
  
  assert.match(data.kitchenTicket, /STATION TARGET: PIZZA LINE/i);
  
  const otherStationLabel = otherItem.kitchenStationId === 'HOT_GRILL_LINE' ? 'HOT GRILL LINE' :
                            otherItem.kitchenStationId === 'CURRY_LINE' ? 'CURRY LINE' : 'OTHER / SIDES LINE';
  assert.match(data.kitchenTicket, new RegExp(`STATION TARGET: ${otherStationLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'));
});
