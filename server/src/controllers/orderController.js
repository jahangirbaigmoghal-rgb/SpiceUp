import Order from '../models/Order.js';
import MenuItem from '../models/MenuItem.js';
import ModifierGroup from '../models/ModifierGroup.js';
import Promotion from '../models/Promotion.js';
import DeliveryZone from '../models/DeliveryZone.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Category from '../models/Category.js';
import Variation from '../models/Variation.js';
import Bundle from '../models/Bundle.js';
import { emitNewOrder, emitOrderStatusUpdate } from '../config/socket.js';
import stripePackage from 'stripe';
import PDFDocument from 'pdfkit';
import { env } from '../config/env.js';

const stripe = env.stripeSecretKey ? stripePackage(env.stripeSecretKey) : null;

// FSM allowed transitions definition
const ALLOWED_TRANSITIONS = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready: ['dispatched', 'collected', 'cancelled'],
  dispatched: ['delivered', 'cancelled'],
  delivered: [],
  collected: [],
  cancelled: [],
};

function isPremiumTopping(optionName) {
  const name = optionName.toLowerCase();
  const premiumKeywords = ['pepperoni', 'chicken', 'beef', 'lamb', 'prawn', 'meat', 'donner', 'ham', 'bacon', 'salami', 'keema', 'tuna', 'turkey', 'anchovies', 'steak'];
  return premiumKeywords.some(keyword => name.includes(keyword));
}

async function processMenuItemAndModifiers(tenantId, menuItemId, selectedVariationId, selectedModifiers, quantity) {
  const dbItem = await MenuItem.findOne({ _id: menuItemId, tenant: tenantId })
    .populate('modifierGroups')
    .populate('groupAssignments.group');
  if (!dbItem || !dbItem.isAvailable) {
    throw new Error(`Menu item not found or unavailable: ${menuItemId}`);
  }
  const activeModifierGroups = dbItem.groupAssignments?.length
    ? dbItem.groupAssignments
      .filter(assignment => assignment.isEnabled !== false && assignment.showOnPos !== false)
      .map(assignment => assignment.group)
      .filter(Boolean)
    : dbItem.modifierGroups;

  // 1. Fetch category and check if Pizza
  let isPizzaCategory = false;
  if (dbItem.category) {
    const dbCategory = await Category.findOne({ _id: dbItem.category, tenant: tenantId });
    if (dbCategory && (dbCategory.name.toLowerCase() === 'pizza' || dbCategory.name.toLowerCase().includes('pizza'))) {
      isPizzaCategory = true;
    }
  }

  // 2. Fetch Variation
  let variationObj = null;
  if (selectedVariationId) {
    const dbVar = await Variation.findOne({ _id: selectedVariationId, menuItem: dbItem._id, tenant: tenantId });
    if (dbVar) {
      variationObj = {
        variationId: dbVar._id,
        name: dbVar.name,
        priceDeltaPence: dbVar.priceDeltaPence,
        sku: dbVar.sku
      };
    }
  }
  if (!variationObj) {
    const defaultVar = await Variation.findOne({ menuItem: dbItem._id, tenant: tenantId, isDefault: true }) || await Variation.findOne({ menuItem: dbItem._id, tenant: tenantId });
    if (defaultVar) {
      variationObj = {
        variationId: defaultVar._id,
        name: defaultVar.name,
        priceDeltaPence: defaultVar.priceDeltaPence,
        sku: defaultVar.sku
      };
    }
  }

  // 3. Modifiers
  let modifierDeltaPence = 0;
  const processedModifiers = [];

  if (selectedModifiers && Array.isArray(selectedModifiers)) {
    const toppingsGroupMods = [];
    const otherMods = [];

    for (const mod of selectedModifiers) {
      const modGroup = activeModifierGroups.find(g => g._id.toString() === (mod.groupId || mod.modifierGroupId)?.toString());
      if (!modGroup) continue;

      const opt = modGroup.options.find(o => o._id.toString() === (mod.optionId || mod.id)?.toString());
      if (!opt || !opt.isAvailable) continue;

      const isToppingsGroup = isPizzaCategory && modGroup.name.toLowerCase().includes('topping');
      if (isToppingsGroup) {
        toppingsGroupMods.push({ modGroup, opt });
      } else {
        otherMods.push({ modGroup, opt });
      }
    }

    for (const m of otherMods) {
      modifierDeltaPence += m.opt.priceDeltaPence;
      processedModifiers.push({
        groupName: m.modGroup.name,
        groupId: m.modGroup._id,
        optionName: m.opt.name,
        optionId: m.opt._id,
        priceDeltaPence: m.opt.priceDeltaPence,
      });
    }

    if (toppingsGroupMods.length > 0) {
      let vegCount = 0;
      const resolvedToppings = [];

      for (const m of toppingsGroupMods) {
        const isPremium = isPremiumTopping(m.opt.name);
        if (isPremium) {
          resolvedToppings.push({
            groupName: m.modGroup.name,
            groupId: m.modGroup._id,
            optionName: m.opt.name,
            optionId: m.opt._id,
            isPremium: true,
            priceDeltaPence: 100,
          });
        } else {
          vegCount++;
          resolvedToppings.push({
            groupName: m.modGroup.name,
            groupId: m.modGroup._id,
            optionName: m.opt.name,
            optionId: m.opt._id,
            isPremium: false,
            vegIndex: vegCount,
            priceDeltaPence: 0,
          });
        }
      }

      for (const top of resolvedToppings) {
        if (!top.isPremium) {
          top.priceDeltaPence = top.vegIndex > 5 ? 80 : 0;
        }
        modifierDeltaPence += top.priceDeltaPence;
        processedModifiers.push({
          groupName: top.groupName,
          groupId: top.groupId,
          optionName: top.optionName,
          optionId: top.optionId,
          priceDeltaPence: top.priceDeltaPence,
        });
      }
    }
  }

  const basePrice = dbItem.basePricePence;
  const variationPriceDelta = variationObj ? variationObj.priceDeltaPence : 0;
  const itemTotalPence = basePrice + variationPriceDelta + modifierDeltaPence;

  return {
    dbItem,
    variationObj,
    processedModifiers,
    itemTotalPence,
    vatRate: dbItem.vatRate || 20,
    kitchenStationId: dbItem.kitchenStationId || 'OTHER',
  };
}

export function compileKitchenTickets(order, staffUsername = 'STAFF') {
  const border = '────────────────────────────────────────────────';
  const timestamp = new Date(order.createdAt || Date.now()).toISOString().replace('T', ' ').slice(0, 19);
  
  let header = `${border}\nORDER #${order.reference.slice(-4)} | ${order.channel.toUpperCase()} ENTRY | SERVED BY: ${staffUsername.toUpperCase()}\nTIMESTAMP: ${timestamp} | TERMINAL: ${order.terminalId || 'MAIN'}\n${border}`;
  
  const stationGroups = {
    PIZZA_LINE: [],
    HOT_GRILL_LINE: [],
    CURRY_LINE: [],
    OTHER: []
  };

  const getStationLabel = (id) => {
    switch (id) {
      case 'PIZZA_LINE': return 'PIZZA LINE (KDS_ROOM_01)';
      case 'HOT_GRILL_LINE': return 'HOT GRILL LINE (KDS_ROOM_02)';
      case 'CURRY_LINE': return 'CURRY LINE (KDS_ROOM_03)';
      default: return 'OTHER / SIDES LINE';
    }
  };

  const addLineToStation = (line, isInsideBundle = false, bundleQty = 1) => {
    const qty = isInsideBundle ? bundleQty : line.quantity;
    const snap = line.menuItemSnapshot;
    const stationId = snap.kitchenStationId || 'OTHER';
    
    let text = `${qty}x ${snap.name.toUpperCase()}`;
    if (line.variation) {
      text += `\n   → SIZE/PORTION: ${line.variation.name}   [SKU: ${line.variation.sku || 'N/A'}]`;
    }
    
    if (line.modifiers && line.modifiers.length > 0) {
      for (const m of line.modifiers) {
        const sign = m.priceDeltaPence >= 0 ? '+' : '';
        const priceText = m.priceDeltaPence === 0 ? 'FREE allowance' : `${sign}£${(m.priceDeltaPence / 100).toFixed(2)}`;
        text += `\n   → ${m.groupName.toUpperCase()}: ${m.optionName}   [${priceText}]`;
      }
    }
    
    if (line.itemNote) {
      text += `\n   → NOTE: "${line.itemNote}"`;
    }
    
    stationGroups[stationId].push(text);
  };

  for (const line of order.lines) {
    if (line.isBundle) {
      for (const bItem of line.bundleItems) {
        addLineToStation(bItem, true, line.quantity);
      }
    } else {
      addLineToStation(line, false);
    }
  }

  let body = '';
  for (const [stationId, items] of Object.entries(stationGroups)) {
    if (items.length > 0) {
      body += `\nSTATION TARGET: ${getStationLabel(stationId)}\n`;
      body += items.join('\n');
      body += `\n${border}`;
    }
  }

  return header + body;
}

export async function listOrders(req, res, next) {
  try {
    const { status, type, channel, startDate, endDate } = req.query;
    const query = { tenant: req.tenantId };

    if (status) query.status = status;
    if (type) query.orderType = type;
    if (channel) query.channel = channel;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

export async function createOrder(req, res, next) {
  try {
    const {
      channel,
      tableNumber,
      scheduledFor,
      paymentMethod,
      promoCode,
      notes,
      terminalId,
      voiceCallSid,
    } = req.body;

    let orderType = req.body.orderType;
    if (orderType === 'takeaway') {
      orderType = 'collection';
    }

    let customer = req.body.customer || req.body.customerDetails;
    if (customer) {
      let addr = customer.address;
      if (typeof addr === 'string') {
        addr = {
          line1: addr,
          postcode: customer.postcode || ''
        };
      }
      customer = {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: addr
      };
    }

    let lines = req.body.lines || req.body.items;
    if (lines && Array.isArray(lines)) {
      lines = lines.map(line => {
        const menuItem = line.menuItem || line.menuItemId;
        const variationId = line.variationId || (line.variation && (line.variation.variationId || line.variation._id));
        const quantity = line.quantity || 1;
        const itemNote = line.itemNote || line.notes;
        const modifiers = (line.modifiers || []).map(m => ({
          groupId: m.modifierGroupId || m.groupId,
          optionId: m.optionId || m.id || m._id,
          optionName: m.name || m.optionName,
          priceDeltaPence: m.pricePence !== undefined ? m.pricePence : (m.priceDeltaPence || 0)
        }));
        
        let bundleItems = line.bundleItems;
        if (bundleItems && Array.isArray(bundleItems)) {
          bundleItems = bundleItems.map(bi => {
            const biMenuItem = bi.menuItem || bi.menuItemId;
            const biVariationId = bi.variationId || (bi.variation && (bi.variation.variationId || bi.variation._id));
            const biModifiers = (bi.modifiers || []).map(m => ({
              groupId: m.modifierGroupId || m.groupId,
              optionId: m.optionId || m.id || m._id,
              optionName: m.name || m.optionName,
              priceDeltaPence: m.pricePence !== undefined ? m.pricePence : (m.priceDeltaPence || 0)
            }));
            return {
              menuItem: biMenuItem,
              variationId: biVariationId,
              modifiers: biModifiers,
              itemNote: bi.itemNote || bi.notes,
              slotLabel: bi.slotLabel
            };
          });
        }

        return {
          menuItem,
          quantity,
          modifiers,
          itemNote,
          variationId,
          isBundle: !!line.isBundle,
          bundleId: line.bundleId,
          bundleItems
        };
      });
    }

    const idempotencyKey = req.headers['x-idempotency-key'];

    if (idempotencyKey) {
      const existing = await Order.findOne({ tenant: req.tenantId, idempotencyKey });
      if (existing) {
        console.log(`♻️ Idempotency triggered — returning existing order: ${existing.reference}`);
        return res.json({ order: existing, duplicate: true });
      }
    }

    if (!orderType || !customer || !lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'Order type, customer details, and at least one order line are required' });
    }

    let subtotalPence = 0;
    const processedLines = [];
    const vatBreakdown = { 0: { rate: 0, netPence: 0, vatPence: 0, grossPence: 0 }, 5: { rate: 5, netPence: 0, vatPence: 0, grossPence: 0 }, 20: { rate: 20, netPence: 0, vatPence: 0, grossPence: 0 } };

    for (const line of lines) {
      if (line.isBundle) {
        const bundle = await Bundle.findOne({ _id: line.bundleId, tenant: req.tenantId });
        if (!bundle || !bundle.isActive) {
          return res.status(400).json({ error: `Bundle not found or inactive: ${line.bundleId}` });
        }

        let totalSurcharges = 0;
        const processedBundleItems = [];

        for (const slot of bundle.components) {
          const matchingItems = (line.bundleItems || []).filter(item => item.slotLabel === slot.label);
          if (matchingItems.length < slot.minChoices || matchingItems.length > slot.maxChoices) {
            return res.status(400).json({ error: `Slot '${slot.label}' in bundle '${bundle.name}' requires between ${slot.minChoices} and ${slot.maxChoices} choices.` });
          }

          for (const matchingItem of matchingItems) {
            const dbItem = await MenuItem.findOne({ _id: matchingItem.menuItem, tenant: req.tenantId });
            if (!dbItem || !dbItem.isAvailable) {
              return res.status(400).json({ error: `Menu item in bundle slot '${slot.label}' not found or unavailable: ${matchingItem.menuItem}` });
            }

            const categoryMatched = slot.allowedCategoryIds.some(cid => cid.toString() === dbItem.category.toString());
            if (!categoryMatched) {
              return res.status(400).json({ error: `Item '${dbItem.name}' is not allowed in slot '${slot.label}'` });
            }

            const processedChild = await processMenuItemAndModifiers(
              req.tenantId,
              matchingItem.menuItem,
              matchingItem.variationId,
              matchingItem.modifiers,
              1
            );

            const childSurcharge = (processedChild.variationObj ? processedChild.variationObj.priceDeltaPence : 0) +
              processedChild.processedModifiers.reduce((sum, m) => sum + m.priceDeltaPence, 0);

            totalSurcharges += childSurcharge;

            processedBundleItems.push({
              menuItem: dbItem._id,
              menuItemSnapshot: {
                name: dbItem.name,
                menuCode: dbItem.menuCode,
                basePricePence: dbItem.basePricePence,
                vatRate: dbItem.vatRate || 20,
                kitchenStationId: dbItem.kitchenStationId,
              },
              variation: processedChild.variationObj ? {
                variationId: processedChild.variationObj.variationId,
                name: processedChild.variationObj.name,
                priceDeltaPence: processedChild.variationObj.priceDeltaPence,
                sku: processedChild.variationObj.sku,
              } : undefined,
              modifiers: processedChild.processedModifiers,
              itemNote: matchingItem.itemNote,
              slotLabel: slot.label,
            });
          }
        }

        const lineTotalPence = (bundle.bundlePricePence + totalSurcharges) * line.quantity;
        subtotalPence += lineTotalPence;

        const vatRate = 20;
        const vatPence = Math.round(lineTotalPence - (lineTotalPence * 100) / (100 + vatRate));
        const netPence = lineTotalPence - vatPence;

        vatBreakdown[vatRate].netPence += netPence;
        vatBreakdown[vatRate].vatPence += vatPence;
        vatBreakdown[vatRate].grossPence += lineTotalPence;

        processedLines.push({
          isBundle: true,
          bundleId: bundle._id,
          bundleSnapshot: {
            name: bundle.name,
            bundlePricePence: bundle.bundlePricePence,
          },
          quantity: line.quantity,
          bundleItems: processedBundleItems,
          lineTotalPence,
        });

      } else {
        const processedChild = await processMenuItemAndModifiers(
          req.tenantId,
          line.menuItem,
          line.variationId,
          line.modifiers,
          line.quantity
        );

        const lineTotalPence = processedChild.itemTotalPence * line.quantity;
        subtotalPence += lineTotalPence;

        const vatRate = processedChild.vatRate;
        const vatPence = Math.round(lineTotalPence - (lineTotalPence * 100) / (100 + vatRate));
        const netPence = lineTotalPence - vatPence;

        vatBreakdown[vatRate].netPence += netPence;
        vatBreakdown[vatRate].vatPence += vatPence;
        vatBreakdown[vatRate].grossPence += lineTotalPence;

        processedLines.push({
          menuItem: processedChild.dbItem._id,
          menuItemSnapshot: {
            name: processedChild.dbItem.name,
            menuCode: processedChild.dbItem.menuCode,
            basePricePence: processedChild.dbItem.basePricePence,
            vatRate,
            kitchenStationId: processedChild.kitchenStationId,
          },
          variation: processedChild.variationObj ? {
            variationId: processedChild.variationObj.variationId,
            name: processedChild.variationObj.name,
            priceDeltaPence: processedChild.variationObj.priceDeltaPence,
            sku: processedChild.variationObj.sku,
          } : undefined,
          quantity: line.quantity,
          modifiers: processedChild.processedModifiers,
          itemNote: line.itemNote,
          lineTotalPence,
        });
      }
    }

    let discountPence = 0;
    let appliedPromo = null;
    if (promoCode) {
      appliedPromo = await Promotion.findOne({
        tenant: req.tenantId,
        code: promoCode.toUpperCase().trim(),
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      });

      if (appliedPromo) {
        if (subtotalPence >= (appliedPromo.minOrderSubtotalPence || 0)) {
          if (appliedPromo.discountType === 'percentage') {
            discountPence = Math.round((subtotalPence * appliedPromo.discountValue) / 100);
          } else {
            discountPence = appliedPromo.discountValue;
          }
          if (discountPence > subtotalPence) discountPence = subtotalPence;
        }
      }
    }

    let deliveryChargePence = 0;
    let deliveryZoneId = null;

    if (orderType === 'delivery') {
      if (!customer.address || !customer.address.postcode) {
        return res.status(400).json({ error: 'Postcode is required for delivery orders' });
      }
      const postcodeOutward = customer.address.postcode.trim().toUpperCase().split(' ')[0];
      const zone = await DeliveryZone.findOne({
        tenant: req.tenantId,
        postcodePrefix: postcodeOutward,
        isActive: true,
      });

      if (!zone) {
        return res.status(400).json({ error: `Delivery not available to postcode: ${customer.address.postcode}` });
      }

      if (subtotalPence < zone.minimumOrderPence) {
        return res.status(400).json({
          error: `Minimum order for delivery is £${(zone.minimumOrderPence / 100).toFixed(2)}. Subtotal: £${(subtotalPence / 100).toFixed(2)}`,
        });
      }

      deliveryChargePence = zone.deliveryChargePence;
      deliveryZoneId = zone._id;
    }

    const totalPence = subtotalPence - discountPence + deliveryChargePence;

    let vatPence = 0;
    if (discountPence > 0) {
      const discountRatio = (subtotalPence - discountPence) / subtotalPence;
      for (const rate of Object.keys(vatBreakdown)) {
        const bucket = vatBreakdown[rate];
        bucket.grossPence = Math.round(bucket.grossPence * discountRatio);
        bucket.vatPence = Math.round(bucket.grossPence - (bucket.grossPence * 100) / (100 + parseInt(rate, 10)));
        bucket.netPence = bucket.grossPence - bucket.vatPence;
        vatPence += bucket.vatPence;
      }
    } else {
      for (const rate of Object.keys(vatBreakdown)) {
        vatPence += vatBreakdown[rate].vatPence;
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = await Order.countDocuments({
      tenant: req.tenantId,
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });
    const reference = `ORD-${todayStr}-${String(countToday + 1).padStart(4, '0')}`;

    const initialPayments = [];
    if (paymentMethod) {
      initialPayments.push({
        method: paymentMethod,
        amountPence: totalPence,
        status: paymentMethod === 'stripe' || paymentMethod === 'payment_link' ? 'pending' : 'paid',
        paidAt: paymentMethod === 'stripe' || paymentMethod === 'payment_link' ? null : new Date(),
      });
    }

    let customerId = null;
    if (customer.phone) {
      let dbCust = await Customer.findOne({ tenant: req.tenantId, phone: customer.phone.trim() });
      if (!dbCust) {
        dbCust = await Customer.create({
          tenant: req.tenantId,
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          email: customer.email ? customer.email.toLowerCase().trim() : undefined,
          addresses: customer.address ? [{ ...customer.address, isDefault: true }] : [],
        });
      }
      customerId = dbCust._id;
    }

    let staffUsername = 'Cashier';
    if (req.userId) {
      const user = await User.findById(req.userId);
      if (user) staffUsername = user.username;
    }

    const order = await Order.create({
      tenant: req.tenantId,
      reference,
      idempotencyKey,
      channel: channel || 'pos-walkin',
      orderType,
      status: 'placed',
      customer: {
        ...customer,
        customerId,
      },
      tableNumber,
      scheduledFor,
      estimatedReadyAt: scheduledFor || new Date(Date.now() + 25 * 60_000),
      lines: processedLines,
      payments: initialPayments,
      promoCode,
      discountPence,
      discountReason: appliedPromo ? appliedPromo.name : undefined,
      deliveryZoneId,
      deliveryChargePence,
      subtotalPence,
      vatBreakdown,
      vatPence,
      totalPence,
      staffId: req.userId,
      terminalId,
      voiceCallSid,
      notes,
      statusHistory: [{ status: 'placed', changedBy: req.userId }],
    });

    const ticketText = compileKitchenTickets(order, staffUsername);
    console.log(ticketText);

    emitNewOrder(req.tenantId, order);

    res.status(201).json({ order, kitchenTicket: ticketText });
  } catch (err) {
    next(err);
  }
}

export async function getOrderDetails(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, tenant: req.tenantId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function advanceOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, estimatedReadyAt } = req.body;

    const order = await Order.findOne({ _id: id, tenant: req.tenantId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const currentStatus = order.status;
    const allowed = ALLOWED_TRANSITIONS[currentStatus];

    if (!allowed || !allowed.includes(status)) {
      return res.status(400).json({
        error: `Invalid status transition: cannot change order in status '${currentStatus}' to '${status}'`,
      });
    }

    order.status = status;
    order.statusHistory.push({ status, changedBy: req.userId });

    if (estimatedReadyAt) {
      order.estimatedReadyAt = new Date(estimatedReadyAt);
    }

    // Auto-mark payment as paid if driver delivers/collected on cash
    if ((status === 'collected' || status === 'delivered') && order.payments.length > 0) {
      for (const p of order.payments) {
        if (p.method === 'cash' && p.status === 'pending') {
          p.status = 'paid';
          p.paidAt = new Date();
        }
      }
    }

    await order.save();

    // Broadcast status change
    emitOrderStatusUpdate(req.tenantId, id, status, { estimatedReadyAt: order.estimatedReadyAt });

    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function cancelOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ _id: id, tenant: req.tenantId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = 'cancelled';
    order.statusHistory.push({ status: 'cancelled', changedBy: req.userId });
    order.notes = `${order.notes || ''} [Cancelled: ${reason || 'No reason given'}]`;

    // Process Stripe refund if paid online
    for (const p of order.payments) {
      if (p.status === 'paid' && p.method === 'stripe' && p.stripePaymentIntentId && stripe) {
        try {
          const refund = await stripe.refunds.create({
            payment_intent: p.stripePaymentIntentId,
            reason: 'requested_by_customer',
          });
          order.refundHistory.push({
            amountPence: p.amountPence,
            reason: `Cancellation refund: ${reason || 'Order cancelled by staff'}`,
            stripeRefundId: refund.id,
            refundedBy: req.userId,
          });
          p.status = 'refunded';
        } catch (sErr) {
          console.error('Stripe refund failed:', sErr);
        }
      } else if (p.status === 'paid') {
        // Mark cash/card local refunds as refunded
        p.status = 'refunded';
        order.refundHistory.push({
          amountPence: p.amountPence,
          reason: `Cancellation refund: ${reason || 'Order cancelled'}`,
          refundedBy: req.userId,
        });
      }
    }

    await order.save();

    emitOrderStatusUpdate(req.tenantId, id, 'cancelled');

    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function refundOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { amountPence, reason } = req.body;

    if (typeof amountPence !== 'number' || amountPence <= 0) {
      return res.status(400).json({ error: 'Valid refund amount in pence is required' });
    }

    const order = await Order.findOne({ _id: id, tenant: req.tenantId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Deduct and process refund on Stripe if possible
    const stripePayment = order.payments.find(p => p.method === 'stripe' && p.status === 'paid');
    let refundId = null;

    if (stripePayment && stripe) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: stripePayment.stripePaymentIntentId,
          amount: amountPence,
        });
        refundId = refund.id;
        stripePayment.status = 'refunded';
      } catch (stripeErr) {
        return res.status(400).json({ error: `Stripe refund failed: ${stripeErr.message}` });
      }
    } else {
      // Local payment refund
      const activePay = order.payments.find(p => p.status === 'paid');
      if (activePay) {
        activePay.status = 'refunded';
      }
    }

    order.refundHistory.push({
      amountPence,
      reason,
      stripeRefundId: refundId,
      refundedBy: req.userId,
    });

    await order.save();

    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function getOrderByRef(req, res, next) {
  try {
    const order = await Order.findOne({
      tenant: req.tenantId,
      reference: req.params.reference.toUpperCase().trim(),
    });

    if (!order) {
      return res.status(404).json({ error: 'Order reference not found' });
    }

    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerOrders(req, res, next) {
  try {
    const dbCustomer = await Customer.findOne({ tenant: req.tenantId, email: req.user.email });
    if (!dbCustomer) {
      return res.json({ orders: [] });
    }

    const orders = await Order.find({
      tenant: req.tenantId,
      'customer.customerId': dbCustomer._id,
    }).sort({ createdAt: -1 });

    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

/** Generate a thermal-receipt style PDF using pdfkit and send via HTTP response */
export async function generateReceiptPdf(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, tenant: req.tenantId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="receipt-${order.reference}.pdf"`);

    // Create PDF document (thermal layout width: 58mm/80mm, let's use a 3-inch roll width = 216pt)
    const doc = new PDFDocument({ size: [216, 600], margins: { top: 10, bottom: 10, left: 10, right: 10 } });
    doc.pipe(res);

    doc.fontSize(12).text('TAKEAWAYPOS PRO', { align: 'center' });
    doc.fontSize(8).text(`Reference: ${order.reference}`, { align: 'center' });
    doc.text(`Date: ${new Date(order.createdAt).toLocaleString('en-GB')}`, { align: 'center' });
    doc.text('-------------------------------------', { align: 'center' });

    doc.fontSize(9).text(`Type: ${order.orderType.toUpperCase()} (${order.channel})`);
    doc.text(`Customer: ${order.customer.name}`);
    doc.text(`Phone: ${order.customer.phone}`);
    if (order.orderType === 'delivery' && order.customer.address) {
      doc.text(`Address: ${order.customer.address.line1}, ${order.customer.address.postcode}`);
    }
    doc.text('-------------------------------------', { align: 'center' });

    // Lines
    doc.fontSize(8);
    for (const line of order.lines) {
      const itemPrice = (line.lineTotalPence / 100).toFixed(2);
      doc.text(`${line.quantity}x ${line.menuItemSnapshot.name} - £${itemPrice}`);
      for (const mod of line.modifiers) {
        doc.text(`  + ${mod.optionName} (+£${(mod.priceDeltaPence / 100).toFixed(2)})`, { indent: 10 });
      }
      if (line.itemNote) {
        doc.text(`  * Note: ${line.itemNote}`, { indent: 10, fill: '#ff0000' });
      }
    }

    doc.fontSize(9).text('-------------------------------------', { align: 'center' });
    doc.text(`Subtotal: £${(order.subtotalPence / 100).toFixed(2)}`);
    if (order.discountPence > 0) {
      doc.text(`Discount: -£${(order.discountPence / 100).toFixed(2)} (${order.discountReason || ''})`);
    }
    if (order.deliveryChargePence > 0) {
      doc.text(`Delivery Charge: £${(order.deliveryChargePence / 100).toFixed(2)}`);
    }
    doc.fontSize(10).text(`TOTAL: £${(order.totalPence / 100).toFixed(2)}`, { bold: true });

    // Payments
    doc.fontSize(8).text('-------------------------------------', { align: 'center' });
    for (const p of order.payments) {
      doc.text(`Payment: ${p.method.toUpperCase()} - ${p.status.toUpperCase()} (£${(p.amountPence / 100).toFixed(2)})`);
    }

    doc.fontSize(8).text('\nThank you for your business!', { align: 'center' });

    doc.end();
  } catch (err) {
    next(err);
  }
}
