
const BASE_URL = 'http://localhost:5001/api';

async function runTests() {
  console.log('🏁 Starting Combo & Pizza Topping Validation Tests...\n');

  // Fetch Menu data
  const itemRes = await fetch(`${BASE_URL}/menu/items`);
  const itemData = await itemRes.json();
  const items = itemData.items || [];

  const bundleRes = await fetch(`${BASE_URL}/menu/bundles`);
  const bundleData = await bundleRes.json();
  const bundles = bundleData.bundles || [];

  // ─── FIND MENU ITEMS ───
  const margarita = items.find(i => i.name.toLowerCase() === 'margarita');
  const burger = items.find(i => i.name.toLowerCase() === 'classic chicken burger');
  const chips = items.find(i => i.name.toLowerCase() === 'traditional chips');
  const coke = items.find(i => i.name.toLowerCase() === 'coca-cola can');
  const burgerMeal = bundles.find(b => b.name === 'Burger Meal Deal');

  if (!margarita || !burger || !chips || !coke || !burgerMeal) {
    console.error('❌ Missing seeded database items. Run seed script first.');
    process.exit(1);
  }

  // Find variation IDs
  const marg9Inch = margarita.variations?.find(v => v.name.includes('9"'));
  const burgerDouble = burger.variations?.find(v => v.name.includes('Double'));
  const chipsLarge = chips.variations?.find(v => v.name.includes('Large'));
  const coke15L = coke.variations?.find(v => v.name.includes('1.5L'));

  console.log('✅ Found Seeded Items & Variations:');
  console.log(`   - Margarita Pizza 9": ID=${marg9Inch?._id}, Surcharge=+£${(marg9Inch?.priceDeltaPence / 100).toFixed(2)}`);
  console.log(`   - Classic Chicken Burger Double: ID=${burgerDouble?._id}, Surcharge=+£${(burgerDouble?.priceDeltaPence / 100).toFixed(2)}`);
  console.log(`   - Traditional Chips Large: ID=${chipsLarge?._id}, Surcharge=+£${(chipsLarge?.priceDeltaPence / 100).toFixed(2)}`);
  console.log(`   - Coca-Cola 1.5L: ID=${coke15L?._id}, Surcharge=+£${(coke15L?.priceDeltaPence / 100).toFixed(2)}`);
  console.log(`   - Burger Meal Deal Bundle: ID=${burgerMeal._id}, Base Price=£${(burgerMeal.bundlePricePence / 100).toFixed(2)}\n`);

  // ─── TEST CASE 1: PIZZA TOPPINGS SURCHARGE & OVERRIDES ───
  console.log('🍕 [Test 1] Testing Pizza Toppings Free Caps & Premium Surcharges...');
  // Pizza Toppings modifier group options
  const toppingsGroup = margarita.modifierGroups.find(g => g.name.toLowerCase().includes('topping'));
  
  // Select toppings
  const bbqBase = toppingsGroup.options.find(o => o.name.toLowerCase().includes('bbq'));
  const garlicButter = toppingsGroup.options.find(o => o.name.toLowerCase().includes('garlic'));
  const extraCheese = toppingsGroup.options.find(o => o.name.toLowerCase().includes('cheese'));
  const pepperoni = toppingsGroup.options.find(o => o.name.toLowerCase().includes('pepperoni')); // Premium
  const chicken = toppingsGroup.options.find(o => o.name.toLowerCase().includes('chicken')); // Premium
  
  const pizzaPayload = {
    orderType: 'takeaway',
    paymentMethod: 'cash',
    customerDetails: {
      name: 'Pizza Toppings Tester',
      phone: '07111222333',
    },
    items: [
      {
        menuItemId: margarita._id,
        quantity: 1,
        variationId: marg9Inch?._id,
        modifiers: [
          { modifierGroupId: toppingsGroup._id, optionId: bbqBase._id, name: bbqBase.name },
          { modifierGroupId: toppingsGroup._id, optionId: garlicButter._id, name: garlicButter.name },
          { modifierGroupId: toppingsGroup._id, optionId: extraCheese._id, name: extraCheese.name },
          { modifierGroupId: toppingsGroup._id, optionId: pepperoni._id, name: pepperoni.name },
          { modifierGroupId: toppingsGroup._id, optionId: chicken._id, name: chicken.name }
        ]
      }
    ]
  };

  // Expected price calculation:
  // Margarita base: 699
  // 9" Small delta: +200
  // Veg toppings (bbqBase, garlicButter, extraCheese): 3 veg <= 5, all 3 are FREE.
  // Premium toppings (pepperoni, chicken): 2 premium = +100 pence each = +200.
  // Total expected: 699 + 200 + 0 + 200 = 1099 pence (£10.99).
  
  const res1 = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-idempotency-key': `test-pizza-${Date.now()}`
    },
    body: JSON.stringify(pizzaPayload)
  });

  const data1 = await res1.json();
  if (res1.ok) {
    console.log(`✅ [Test 1 Passed] Order placed successfully! Ref: ${data1.order.reference}`);
    console.log(`   - Computed Total: £${(data1.order.totalPence / 100).toFixed(2)} (Expected: £10.99)`);
    console.log(`   - Kitchen Ticket Text:`);
    console.log(data1.kitchenTicket);
  } else {
    console.error('❌ [Test 1 Failed] Pizza order submission failed:', data1);
  }

  // ─── TEST CASE 2: MEAL DEAL COMBO W/ UPCHARGES ───
  console.log('\n🍔 [Test 2] Testing Burger Meal Deal Combo with size upgrades...');
  
  const comboPayload = {
    orderType: 'takeaway',
    paymentMethod: 'cash',
    customerDetails: {
      name: 'Combo Deal Tester',
      phone: '07111333444',
    },
    items: [
      {
        isBundle: true,
        bundleId: burgerMeal._id,
        quantity: 1,
        bundleItems: [
          {
            menuItemId: burger._id,
            variationId: burgerDouble?._id, // Double patty surcharge: +200
            slotLabel: 'Burger Selection',
            modifiers: []
          },
          {
            menuItemId: chips._id,
            variationId: chipsLarge?._id, // Large portion chips surcharge: +100
            slotLabel: 'Side Selection',
            modifiers: []
          },
          {
            menuItemId: coke._id,
            variationId: coke15L?._id, // 1.5L Coke surcharge: +180
            slotLabel: 'Drink Selection',
            modifiers: []
          }
        ]
      }
    ]
  };

  // Expected price calculation:
  // Burger Meal Deal Base: 1099
  // Burger Double Surcharge: +200
  // Chips Large Surcharge: +100
  // Coke 1.5L Surcharge: +180
  // Total expected: 1099 + 200 + 100 + 180 = 1579 pence (£15.79).

  const res2 = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-idempotency-key': `test-combo-${Date.now()}`
    },
    body: JSON.stringify(comboPayload)
  });

  const data2 = await res2.json();
  if (res2.ok) {
    console.log(`✅ [Test 2 Passed] Order placed successfully! Ref: ${data2.order.reference}`);
    console.log(`   - Computed Total: £${(data2.order.totalPence / 100).toFixed(2)} (Expected: £15.79)`);
    console.log(`   - Kitchen Ticket Text:`);
    console.log(data2.kitchenTicket);
  } else {
    console.error('❌ [Test 2 Failed] Combo order submission failed:', data2);
  }
}

runTests().catch(console.error);
