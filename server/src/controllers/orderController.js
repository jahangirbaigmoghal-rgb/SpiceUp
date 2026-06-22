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
import Label from '../models/Label.js';
import Setting from '../models/Setting.js';
import { audit } from '../utils/audit.js';
import { checkIdempotency, setIdempotency } from '../config/redis.js';
import { printCustomerReceipt, printKitchenTickets, printTokenReceipt } from '../services/printerService.js';
import { emitNewOrder, emitOrderStatusUpdate } from '../config/socket.js';
import { nextOrderReference } from '../services/sequenceService.js';
import { withTransaction } from '../services/transactionRunner.js';
import { refundPayment } from '../services/refundService.js';
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

function isNowInSchedule(schedule, now = new Date()) {
  if (!schedule || !schedule.startTime || !schedule.endTime) return true;
  if (Array.isArray(schedule.days) && schedule.days.length > 0 && !schedule.days.includes(now.getDay())) {
    return false;
  }
  const current = now.getHours() * 60 + now.getMinutes();
  const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
  const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
  const start = (startHour || 0) * 60 + (startMinute || 0);
  const end = (endHour || 0) * 60 + (endMinute || 0);
  return start <= end ? current >= start && current <= end : current >= start || current <= end;
}

function normalizeChannel(channel = 'pos') {
  if (channel === 'online') return 'website';
  if (channel === 'voice-agent') return 'voice';
  return ['pos', 'website', 'mobile', 'voice'].includes(channel) ? channel : 'pos';
}

async function processMenuItemAndModifiers(tenantId, menuItemId, selectedVariationId, selectedModifiers, quantity, channel = 'pos') {
  const dbItem = await MenuItem.findOne({ _id: menuItemId, tenant: tenantId })
    .populate({
      path: 'category',
      populate: { path: 'parent' }
    })
    .populate({
      path: 'groupAssignments.group',
      populate: {
        path: 'options.component'
      }
    })
    .populate({
      path: 'modifierGroups',
      populate: {
        path: 'options.component'
      }
    })
    .populate('productTime');

  if (!dbItem) {
    throw new Error(`Menu item not found: ${menuItemId}`);
  }

  // 1. Validate publishStatus is published (reject drafts)
  if (dbItem.publishStatus === 'draft') {
    throw new Error(`Product ${dbItem.name} is a draft and cannot be ordered.`);
  }

  // 2. Validate channel visibility (e.g. POS cannot order website-only items)
  const menuSurface = normalizeChannel(channel);
  if (dbItem.channels && dbItem.channels[menuSurface] === false) {
    throw new Error(`Product ${dbItem.name} is disabled for channel: ${channel}`);
  }
  if (dbItem.category) {
    if (dbItem.category.channels && dbItem.category.channels[menuSurface] === false) {
      throw new Error(`Category ${dbItem.category.name} is disabled for channel: ${channel}`);
    }
    if (dbItem.category.parent && dbItem.category.parent.channels && dbItem.category.parent.channels[menuSurface] === false) {
      throw new Error(`Parent category ${dbItem.category.parent.name} is disabled for channel: ${channel}`);
    }
  }

  // 3. Validate hold status and product timing at order creation
  if (dbItem.isAvailable === false) {
    throw new Error(`Product ${dbItem.name} is currently inactive.`);
  }
  if (dbItem.holdStatus === true) {
    throw new Error(`Product ${dbItem.name} is currently on hold.`);
  }
  if (!isNowInSchedule(dbItem.availabilitySchedule)) {
    throw new Error(`Product ${dbItem.name} is not available in the current schedule.`);
  }
  if (dbItem.productTime && !isNowInSchedule(dbItem.productTime)) {
    throw new Error(`Product ${dbItem.name} is outside its scheduled product timing.`);
  }
  if (dbItem.category && !isNowInSchedule(dbItem.category.availabilitySchedule)) {
    throw new Error(`Category ${dbItem.category.name} is outside its scheduled timing.`);
  }

  // 4. Validate and resolve selected variation
  let variationObj = null;
  const allVariations = await Variation.find({ menuItem: dbItem._id, tenant: tenantId });
  const activeVariations = allVariations.filter(v => v.isActive !== false);

  if (selectedVariationId) {
    const dbVar = allVariations.find(v => v._id.toString() === selectedVariationId.toString());
    if (!dbVar) {
      throw new Error(`Selected variation does not belong to product ${dbItem.name}`);
    }
    if (dbVar.isActive === false) {
      throw new Error(`Selected variation ${dbVar.name} is inactive`);
    }
    variationObj = {
      variationId: dbVar._id,
      name: dbVar.name,
      priceDeltaPence: dbVar.priceDeltaPence,
      sku: dbVar.sku
    };
  } else if (activeVariations.length > 0) {
    // If variations exist, selecting one is required. Let's look for default variation or pick the first active one.
    const defaultVar = activeVariations.find(v => v.isDefault) || activeVariations[0];
    variationObj = {
      variationId: defaultVar._id,
      name: defaultVar.name,
      priceDeltaPence: defaultVar.priceDeltaPence,
      sku: defaultVar.sku
    };
  }

  // 5. Resolve active modifier groups for the product & channel
  const assignments = (dbItem.groupAssignments || [])
    .filter(assignment => assignment.isEnabled !== false)
    .filter(assignment => assignment.group?.isActive !== false)
    .filter(assignment => {
      if (menuSurface === 'website') return assignment.showOnWebsite !== false;
      if (menuSurface === 'voice') return assignment.showOnVoice !== false;
      return assignment.showOnPos !== false;
    });

  const activeGroups = assignments.length > 0
    ? assignments.map(a => {
        const group = a.group;
        const requiredOverride = a.requiredOverride;
        const type = requiredOverride === true ? 'required' : requiredOverride === false ? 'optional' : group.type;
        const minSelections = requiredOverride === true && !group.minSelections ? 1 : (group.minSelections ?? 0);
        return {
          group,
          type,
          minSelections,
          maxSelections: group.maxSelections ?? group.maxSelection ?? 1,
        };
      })
    : (dbItem.modifierGroups || [])
        .filter(g => g.isActive !== false)
        .filter(g => {
          if (menuSurface === 'website') return g.showOnWebsite !== false;
          if (menuSurface === 'voice') return g.showOnVoice !== false;
          return g.showOnPos !== false;
        })
        .map(g => ({
          group: g,
          type: g.type,
          minSelections: g.minSelections ?? 0,
          maxSelections: g.maxSelections ?? g.maxSelection ?? 1,
        }));

  // 6. Validate selected modifier choices
  const selectedModifiersList = selectedModifiers || [];

  for (const mod of selectedModifiersList) {
    const groupIdStr = (mod.groupId || mod.modifierGroupId)?.toString();
    const optIdStr = (mod.optionId || mod.id)?.toString();

    // Verify group is assigned to product and active
    const activeGroupRecord = activeGroups.find(ag => ag.group._id.toString() === groupIdStr);
    if (!activeGroupRecord) {
      throw new Error(`Modifier group is not active or not assigned to product: ${groupIdStr}`);
    }

    const modGroup = activeGroupRecord.group;

    if (mod.isManual) {
      if (channel !== 'pos') {
        throw new Error(`Manual add-ons are only allowed for POS orders.`);
      }
      if (!mod.name && !mod.optionName) {
        throw new Error(`Manual add-on requires a name`);
      }
      const price = Number(mod.priceDeltaPence ?? mod.pricePence ?? 0);
      if (isNaN(price) || price < 0) {
        throw new Error(`Manual add-on requires a valid non-negative price`);
      }
      continue;
    }

    // Verify option belongs to group and is active
    const opt = modGroup.options.find(o => o._id.toString() === optIdStr);
    if (!opt) {
      throw new Error(`Option ${optIdStr} does not belong to modifier group ${modGroup.name}`);
    }
    if (opt.isAvailable === false) {
      throw new Error(`Option ${opt.name} in group ${modGroup.name} is inactive/unavailable`);
    }

    // Verify component of option is active
    if (opt.component && opt.component.isActive === false) {
      throw new Error(`Component for option ${opt.name} is inactive/unavailable`);
    }
  }

  // 7. Enforce group min/max selection bounds
  for (const ag of activeGroups) {
    const modGroup = ag.group;
    const selectionsInGroup = selectedModifiersList.filter(m => (m.groupId || m.modifierGroupId)?.toString() === modGroup._id.toString());
    const count = selectionsInGroup.length;

    const min = ag.type === 'required' ? Math.max(ag.minSelections || 0, 1) : (ag.minSelections || 0);
    if (count < min) {
      throw new Error(`Modifier group ${modGroup.name} requires at least ${min} selection(s), but only ${count} selected.`);
    }

    const max = ag.maxSelections || 1;
    if (count > max) {
      throw new Error(`Modifier group ${modGroup.name} allows at most ${max} selection(s), but ${count} selected.`);
    }
  }

  // 8. Resolve pizza category and labels
  let isPizzaCategory = false;
  if (dbItem.category) {
    if (dbItem.category.name.toLowerCase() === 'pizza' || dbItem.category.name.toLowerCase().includes('pizza')) {
      isPizzaCategory = true;
    }
  }

  const tenantLabels = await Label.find({ tenant: tenantId });
  const toppingsGroupMods = [];
  const otherMods = [];
  let modifierDeltaPence = 0;
  const processedModifiers = [];

  for (const mod of selectedModifiersList) {
    const groupIdStr = (mod.groupId || mod.modifierGroupId)?.toString();
    const optIdStr = (mod.optionId || mod.id)?.toString();

    const activeGroupRecord = activeGroups.find(ag => ag.group._id.toString() === groupIdStr);
    const modGroup = activeGroupRecord.group;

    if (mod.isManual) {
      const priceDelta = Number(mod.priceDeltaPence ?? mod.pricePence ?? 0);
      const modInfo = {
        groupName: modGroup.name,
        groupId: modGroup._id,
        optionName: mod.name || mod.optionName || 'Manual Add-on',
        optionId: optIdStr || new mongoose.Types.ObjectId().toString(),
        labelId: null,
        labelName: null,
        kitchenText: mod.kitchenText || mod.optionName || 'Manual Add-on',
        priceDeltaPence: priceDelta,
        isManual: true,
        printOnReceipt: mod.printOnReceipt !== false,
      };
      otherMods.push(modInfo);
      continue;
    }

    const opt = modGroup.options.find(o => o._id.toString() === optIdStr);

    let labelId = mod.labelId || null;
    let labelName = mod.labelName || null;
    let labelKitchenText = mod.kitchenText || null;

    // Parse label prefix if not explicitly sent
    const modName = mod.name || mod.optionName || '';
    if (!labelId && modName !== opt.name) {
      for (const lbl of tenantLabels) {
        if (lbl.isActive && modName.startsWith(`${lbl.name} `) && modName.slice(lbl.name.length + 1) === opt.name) {
          labelId = lbl._id;
          labelName = lbl.name;
          labelKitchenText = lbl.kitchenText || lbl.name;
          break;
        }
      }
    }

    // Validate label constraints
    if (labelId) {
      const dbLabel = tenantLabels.find(l => l._id.toString() === labelId.toString());
      if (!dbLabel) {
        throw new Error(`Selected label ${labelId} not found`);
      }
      if (dbLabel.isActive === false) {
        throw new Error(`Label ${dbLabel.name} is inactive`);
      }

      // Reject label usage when disabled for the group
      if (modGroup.staticLabelsEnabled === false) {
        throw new Error(`Labels are disabled for modifier group ${modGroup.name}`);
      }

      // Validate label allowed for modifier group
      if (modGroup.allowedLabelIds && modGroup.allowedLabelIds.length > 0) {
        const isAllowed = modGroup.allowedLabelIds.some(id => id.toString() === labelId.toString());
        if (!isAllowed) {
          throw new Error(`Label ${dbLabel.name} is not allowed for modifier group ${modGroup.name}`);
        }
      }

      labelName = dbLabel.name;
      labelKitchenText = dbLabel.kitchenText || dbLabel.name;
    }

    const isToppingsGroup = isPizzaCategory && modGroup.name.toLowerCase().includes('topping');

    // Surcharge rules
    let baseOptPrice = modGroup.samePrice ? (modGroup.samePricePence || 0) : (opt.priceDeltaPence || 0);
    if (labelName === 'NO') {
      baseOptPrice = 0;
    }

    const modInfo = {
      groupName: modGroup.name,
      groupId: modGroup._id,
      optionName: labelName ? `${labelName} ${opt.name}` : opt.name,
      optionId: opt._id,
      labelId,
      labelName,
      kitchenText: labelKitchenText,
      priceDeltaPence: baseOptPrice
    };

    if (isToppingsGroup) {
      toppingsGroupMods.push(modInfo);
    } else {
      otherMods.push(modInfo);
    }
  }

  // Calculate pricing for non-toppings
  for (const m of otherMods) {
    modifierDeltaPence += m.priceDeltaPence;
    processedModifiers.push(m);
  }

  // Handle pizza toppings premium / limits logic
  if (toppingsGroupMods.length > 0) {
    let vegCount = 0;
    const resolvedToppings = [];

    for (const m of toppingsGroupMods) {
      const isPremium = isPremiumTopping(m.optionName);
      if (isPremium) {
        resolvedToppings.push({
          ...m,
          isPremium: true,
          priceDeltaPence: m.labelName === 'NO' ? 0 : 100,
        });
      } else {
        vegCount++;
        resolvedToppings.push({
          ...m,
          isPremium: false,
          vegIndex: vegCount,
          priceDeltaPence: 0,
        });
      }
    }

    for (const top of resolvedToppings) {
      if (!top.isPremium && top.labelName !== 'NO') {
        top.priceDeltaPence = top.vegIndex > 5 ? 80 : 0;
      }
      modifierDeltaPence += top.priceDeltaPence;
      processedModifiers.push({
        groupName: top.groupName,
        groupId: top.groupId,
        optionName: top.optionName,
        optionId: top.optionId,
        labelId: top.labelId,
        labelName: top.labelName,
        kitchenText: top.kitchenText,
        priceDeltaPence: top.priceDeltaPence,
      });
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
  const border = 'ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ';
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
    const stationId = (snap.kitchenStationId && stationGroups[snap.kitchenStationId]) ? snap.kitchenStationId : 'OTHER';
    
    let text = `${qty}x ${snap.name.toUpperCase()}`;
    if (line.variation) {
      text += `\n   ΓåÆ SIZE/PORTION: ${line.variation.name}   [SKU: ${line.variation.sku || 'N/A'}]`;
    }
    
    if (line.modifiers && line.modifiers.length > 0) {
      for (const m of line.modifiers) {
        const sign = m.priceDeltaPence >= 0 ? '+' : '';
        const priceText = m.priceDeltaPence === 0 ? 'FREE allowance' : `${sign}┬ú${(m.priceDeltaPence / 100).toFixed(2)}`;
        text += `\n   ΓåÆ ${m.groupName.toUpperCase()}: ${m.optionName}   [${priceText}]`;
      }
    }
    
    if (line.itemNote) {
      text += `\n   ΓåÆ NOTE: "${line.itemNote}"`;
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

    const orders = await Order.find(query).populate('assignedDriver').sort({ createdAt: -1 });
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
        const modifiers = (line.modifiers || line.selectedModifiers || []).map(m => ({
          groupId: m.modifierGroupId || m.groupId,
          optionId: m.optionId || m.id || m._id,
          optionName: m.name || m.optionName,
          priceDeltaPence: m.pricePence !== undefined ? m.pricePence : (m.priceDeltaPence || 0),
          labelId: m.labelId || null,
          labelName: m.labelName || null,
          kitchenText: m.kitchenText || null,
        }));
        
        let bundleItems = line.bundleItems;
        if (bundleItems && Array.isArray(bundleItems)) {
          bundleItems = bundleItems.map(bi => {
            const biMenuItem = bi.menuItem || bi.menuItemId;
            const biVariationId = bi.variationId || (bi.variation && (bi.variation.variationId || bi.variation._id));
            const biModifiers = (bi.modifiers || bi.selectedModifiers || []).map(m => ({
              groupId: m.modifierGroupId || m.groupId,
              optionId: m.optionId || m.id || m._id,
              optionName: m.name || m.optionName,
              priceDeltaPence: m.pricePence !== undefined ? m.pricePence : (m.priceDeltaPence || 0),
              labelId: m.labelId || null,
              labelName: m.labelName || null,
              kitchenText: m.kitchenText || null,
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
      // Race-safe check: Redis SETNX (instant, no DB round-trip).
      const existingOrderId = await checkIdempotency(idempotencyKey);
      if (existingOrderId) {
        const existing = await Order.findOne({ _id: existingOrderId, tenant: req.tenantId });
        if (existing) {
          console.log(`🔄 Idempotency hit (Redis) — returning existing order: ${existing.reference}`);
          return res.json({ order: existing, duplicate: true });
        }
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
              1,
              channel
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
          line.quantity,
          channel
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
          error: `Minimum order for delivery is ┬ú${(zone.minimumOrderPence / 100).toFixed(2)}. Subtotal: ┬ú${(subtotalPence / 100).toFixed(2)}`,
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

    const reference = await nextOrderReference(req.tenantId);

    const initialPayments = [];
    if (paymentMethod) {
      initialPayments.push({
        method: paymentMethod,
        amountPence: totalPence,
        status: paymentMethod === 'stripe' || paymentMethod === 'payment_link' ? 'pending' : 'paid',
        paidAt: paymentMethod === 'stripe' || paymentMethod === 'payment_link' ? null : new Date(),
      });
    }

    // Resolve staff name (read-only, safe outside transaction)
    let staffUsername = 'Cashier';
    if (req.userId) {
      const user = await User.findById(req.userId);
      if (user) staffUsername = user.username;
    }

    // --- Atomic persistence span: Customer upsert + Order.create ---
    const order = await withTransaction(async (session) => {
      let customerId = null;
      if (customer.phone) {
        let dbCust = await Customer.findOne({ tenant: req.tenantId, phone: customer.phone.trim() }).session(session);
        if (!dbCust) {
          dbCust = await Customer.create([{
            tenant: req.tenantId,
            name: customer.name.trim(),
            phone: customer.phone.trim(),
            email: customer.email ? customer.email.toLowerCase().trim() : undefined,
            addresses: customer.address ? [{ ...customer.address, isDefault: true }] : [],
          }], { session });
          dbCust = dbCust[0];
        }
        customerId = dbCust._id;
      }

      return (await Order.create([{
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
      }], { session }))[0];
    });
    // --- End persistence span ---

    // Set idempotency key in Redis for future fast lookups
    if (idempotencyKey) {
      await setIdempotency(idempotencyKey, order._id.toString(), 86400);
    }

    // --- Post-commit side effects (non-critical, fire-and-forget where possible) ---
    const settings = await Setting.findOne({ tenant: req.tenantId });
    if (settings && settings.printerEnabled) {
      if (settings.printCustomerReceipt) {
        printCustomerReceipt(order, settings).catch(err => console.error("Customer print error:", err));
      }
      if (settings.printKitchenTicket) {
        printKitchenTickets(order, settings, true).catch(err => console.error("Kitchen print error:", err));
      }
      printTokenReceipt(order, settings).catch(err => console.error("Token print error:", err));
    }

    const ticketText = compileKitchenTickets(order, staffUsername);
    console.log(ticketText);

    emitNewOrder(req.tenantId, order);

    res.status(201).json({ order, kitchenTicket: ticketText });
  } catch (err) {
    // E11000 on idempotencyKey unique index — a duplicate slipped through the
    // Redis check (race window or Redis unavailable). Return the existing order.
    if (err.code === 11000 && idempotencyKey) {
      const existing = await Order.findOne({ tenant: req.tenantId, idempotencyKey });
      if (existing) {
        await setIdempotency(idempotencyKey, existing._id.toString(), 86400);
        return res.json({ order: existing, duplicate: true });
      }
    }
    if (err instanceof Error && !err.status && !err.statusCode) {
      err.status = 400;
    }
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
    const { status, estimatedReadyAt, assignedDriver } = req.body;

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

    if (assignedDriver !== undefined) {
      order.assignedDriver = assignedDriver || null;
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

    const before = order.toObject();

    order.status = 'cancelled';
    order.statusHistory.push({ status: 'cancelled', changedBy: req.userId });
    order.notes = `${order.notes || ''} [Cancelled: ${reason || 'No reason given'}]`;

    // Process refunds via shared service — full refund on each paid payment
    for (const p of order.payments) {
      if (p.status === 'paid' || p.status === 'partially_refunded') {
        const refundable = p.amountPence - (p.refundedPence || 0);
        if (refundable > 0) {
          try {
            await refundPayment(order, p, refundable, {
              reason: `Cancellation refund: ${reason || 'Order cancelled by staff'}`,
              stripe,
              actorId: req.userId,
            });
          } catch (sErr) {
            console.error('Refund failed during cancel:', sErr.message);
          }
        }
      }
    }

    await order.save();

    await audit(req, 'cancel_order', 'Order', order._id, { before, after: order, reason });
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

    const before = order.toObject();

    // Find the target payment — prefer Stripe-paid, then any paid payment
    const stripePayment = order.payments.find(p => (p.status === 'paid' || p.status === 'partially_refunded') && p.method === 'stripe');
    const targetPayment = stripePayment || order.payments.find(p => p.status === 'paid' || p.status === 'partially_refunded');

    if (!targetPayment) {
      return res.status(400).json({ error: 'No refundable payment found on this order' });
    }

    try {
      await refundPayment(order, targetPayment, amountPence, {
        reason,
        stripe,
        actorId: req.userId,
      });
    } catch (stripeErr) {
      return res.status(400).json({ error: `Refund failed: ${stripeErr.message}` });
    }

    await order.save();

    await audit(req, 'refund_order', 'Order', order._id, { before, after: order, amountPence, reason });

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

    doc.fontSize(12).text('SPICEUP', { align: 'center' });
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
      doc.text(`${line.quantity}x ${line.menuItemSnapshot.name} - ┬ú${itemPrice}`);
      for (const mod of line.modifiers) {
        doc.text(`  + ${mod.optionName} (+┬ú${(mod.priceDeltaPence / 100).toFixed(2)})`, { indent: 10 });
      }
      if (line.itemNote) {
        doc.text(`  * Note: ${line.itemNote}`, { indent: 10, fill: '#ff0000' });
      }
    }

    doc.fontSize(9).text('-------------------------------------', { align: 'center' });
    doc.text(`Subtotal: ┬ú${(order.subtotalPence / 100).toFixed(2)}`);
    if (order.discountPence > 0) {
      doc.text(`Discount: -┬ú${(order.discountPence / 100).toFixed(2)} (${order.discountReason || ''})`);
    }
    if (order.deliveryChargePence > 0) {
      doc.text(`Delivery Charge: ┬ú${(order.deliveryChargePence / 100).toFixed(2)}`);
    }
    doc.fontSize(10).text(`TOTAL: ┬ú${(order.totalPence / 100).toFixed(2)}`, { bold: true });

    // Payments
    doc.fontSize(8).text('-------------------------------------', { align: 'center' });
    for (const p of order.payments) {
      doc.text(`Payment: ${p.method.toUpperCase()} - ${p.status.toUpperCase()} (┬ú${(p.amountPence / 100).toFixed(2)})`);
    }

    doc.fontSize(8).text('\nThank you for your business!', { align: 'center' });

    doc.end();
  } catch (err) {
    next(err);
  }
}

export async function reprintCustomer(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, tenant: req.tenantId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const settings = await Setting.findOne({ tenant: req.tenantId });
    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    const success = await printCustomerReceipt(order, settings);
    res.json({ success, message: success ? 'Receipt printed successfully.' : 'Failed to print receipt.' });
  } catch (err) {
    next(err);
  }
}

export async function reprintKitchen(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, tenant: req.tenantId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const settings = await Setting.findOne({ tenant: req.tenantId });
    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    const success = await printKitchenTickets(order, settings, false);
    res.json({ success, message: success ? 'Kitchen tickets printed successfully.' : 'Failed to print kitchen tickets.' });
  } catch (err) {
    next(err);
  }
}

export async function reprintToken(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, tenant: req.tenantId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const settings = await Setting.findOne({ tenant: req.tenantId });
    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    const success = await printTokenReceipt(order, settings);
    res.json({ success, message: success ? 'Token printed successfully.' : 'Failed to print token.' });
  } catch (err) {
    next(err);
  }
}
