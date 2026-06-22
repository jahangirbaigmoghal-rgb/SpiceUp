import MenuItem from '../models/MenuItem.js';
import Variation from '../models/Variation.js';
import DeliveryZone from '../models/DeliveryZone.js';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import VoiceCallLog from '../models/VoiceCallLog.js';
import Setting from '../models/Setting.js';
import { emitNewOrder, emitOrderStatusUpdate } from '../config/socket.js';
import stripePackage from 'stripe';
import twilio from 'twilio';
import { env } from '../config/env.js';
import { compileKitchenTickets } from './orderController.js';
import { nextOrderReference } from '../services/sequenceService.js';
import { withTransaction } from '../services/transactionRunner.js';
import { refundPayment } from '../services/refundService.js';
import { checkIdempotency, setIdempotency } from '../config/redis.js';

const stripe = env.stripeSecretKey ? stripePackage(env.stripeSecretKey) : null;
const twilioClient = env.twilioAccountSid && env.twilioAuthToken ? twilio(env.twilioAccountSid, env.twilioAuthToken) : null;

function isNowInSchedule(schedule, now = new Date()) {
  if (!schedule || !schedule.startTime || !schedule.endTime) return true;
  if (Array.isArray(schedule.days) && schedule.days.length > 0 && !schedule.days.includes(now.getDay())) {
    return false;
  }
  const current = now.getHours() * 60 + now.getMinutes();
  const [startHour, startMinute] = String(schedule.startTime).split(':').map(Number);
  const [endHour, endMinute] = String(schedule.endTime).split(':').map(Number);
  const start = (startHour || 0) * 60 + (startMinute || 0);
  const end = (endHour || 0) * 60 + (endMinute || 0);
  return start <= end ? current >= start && current <= end : current >= start || current <= end;
}

function componentVisibleOnVoice(option) {
  if (!option?.component || typeof option.component === 'string') return true;
  return option.component.isActive !== false && option.component.channels?.voice !== false;
}

function voiceGroupsForItem(item) {
  const assignments = (item.groupAssignments || [])
    .filter(assignment => assignment.isEnabled !== false)
    .filter(assignment => assignment.showOnVoice !== false)
    .filter(assignment => assignment.group?.isActive !== false)
    .sort((a, b) => (a.voiceOrder || 0) - (b.voiceOrder || 0))
    .map(assignment => {
      const group = assignment.group;
      const requiredOverride = assignment.requiredOverride;
      const minSelections = requiredOverride === true && !group.minSelections ? 1 : (group.minSelections || 0);
      return {
        ...group,
        type: requiredOverride === true ? 'required' : requiredOverride === false ? 'optional' : group.type,
        minSelections,
      };
    });

  if (assignments.length > 0) return assignments;
  return (item.modifierGroups || [])
    .filter(group => group?.isActive !== false)
    .filter(group => group?.showOnVoice !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

function formatVoiceGroup(group) {
  return {
    groupId: group._id.toString(),
    name: group.name,
    displayName: group.displayName || group.name,
    type: group.type,
    selectionType: group.selectionType,
    minSelections: group.minSelections || 0,
    maxSelections: group.maxSelections || 1,
    labelsEnabled: group.staticLabelsEnabled !== false,
    allowedLabels: (group.allowedLabelIds || []).map(label => ({
      labelId: label._id?.toString?.() || String(label),
      name: label.name || '',
      kitchenText: label.kitchenText || label.name || '',
    })).filter(label => label.name),
    options: (group.options || [])
      .filter(option => option.isAvailable !== false)
      .filter(componentVisibleOnVoice)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map(option => {
        const priceDeltaPence = group.samePrice ? (group.samePricePence || 0) : (option.priceDeltaPence || 0);
        return {
          optionId: option._id.toString(),
          name: option.name,
          kitchenName: option.component?.kitchenName || option.name,
          priceDeltaPence,
        };
      }),
  };
}

export async function getVoiceMenu(req, res, next) {
  try {
    const items = await MenuItem.find({
      tenant: req.tenantId,
      isAvailable: true,
      holdStatus: { $ne: true },
      publishStatus: 'published',
      'channels.voice': { $ne: false },
    })
      .populate({ path: 'category', populate: [{ path: 'parent' }, { path: 'department' }] })
      .populate('department')
      .populate({ path: 'variations' })
      .populate({ path: 'modifierGroups', populate: [{ path: 'allowedLabelIds' }, { path: 'options.component' }] })
      .populate({ path: 'groupAssignments.group', populate: [{ path: 'allowedLabelIds' }, { path: 'options.component' }] })
      .lean();

    const formattedMenu = items
      .filter(item => item.category?.isActive !== false)
      .filter(item => item.category?.channels?.voice !== false)
      .filter(item => item.category?.parent?.isActive !== false)
      .filter(item => item.category?.parent?.channels?.voice !== false)
      .filter(item => isNowInSchedule(item.availabilitySchedule) && isNowInSchedule(item.category?.availabilitySchedule))
      .map(item => {
        const groups = voiceGroupsForItem(item).map(formatVoiceGroup).filter(group => group.options.length > 0);
        const variations = (item.variations || [])
          .filter(variation => variation.isActive !== false)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || (a.priceDeltaPence || 0) - (b.priceDeltaPence || 0))
          .map(variation => ({
            variationId: variation._id.toString(),
            name: variation.name,
            sku: variation.sku,
            priceDeltaPence: variation.priceDeltaPence || 0,
            isDefault: variation.isDefault === true,
          }));

        return {
          itemId: item._id.toString(),
          name: item.name,
          shortName: item.shortName || item.menuCode || item.name,
          kitchenName: item.kitchenName || item.shortName || item.name,
          menuCode: item.menuCode || '',
          category: item.category?.name || 'General',
          parentCategory: item.category?.parent?.name || null,
          department: item.department?.name || item.category?.department?.name || null,
          pricePence: item.basePricePence,
          description: item.description || '',
          dietaryTags: item.dietaryTags || [],
          allergens: item.allergens || [],
          variations,
          modifierGroups: groups,
        };
      });

    const setting = await Setting.findOne({ tenant: req.tenantId }).lean();
    const voiceAgent = {
      enabled: setting?.voiceAgentEnabled !== false,
      voice: setting?.voiceAgentVoice || 'Aoede',
      model: setting?.voiceAgentModel || 'gemini-3.1-flash-live-preview',
      language: setting?.voiceAgentLanguage || 'en-GB',
      greeting: setting?.voiceAgentGreeting || '',
      prompt: setting?.voiceAgentPrompt || '',
      handoffPhone: setting?.voiceAgentHandoffPhone || '',
      maxCallMinutes: setting?.voiceAgentMaxCallMinutes ?? 8,
      testMode: !!setting?.voiceAgentTestMode,
      targetLatencyMs: setting?.voiceAgentTargetLatencyMs ?? 900,
      maxSilenceSeconds: setting?.voiceAgentMaxSilenceSeconds ?? 6,
      bargeInEnabled: setting?.voiceAgentBargeInEnabled !== false,
      recordCalls: setting?.voiceAgentRecordCalls !== false,
      transcriptEnabled: setting?.voiceAgentTranscriptEnabled !== false,
      paymentLinkEnabled: setting?.voiceAgentPaymentLinkEnabled !== false,
      allergyHandoff: setting?.voiceAgentAllergyHandoff !== false,
      complaintHandoff: setting?.voiceAgentComplaintHandoff !== false,
      menuRefreshSeconds: setting?.voiceAgentMenuRefreshSeconds ?? 60,
    };

    res.json({ menu: formattedMenu, voiceAgent });
  } catch (err) {
    next(err);
  }
}

export async function validateVoiceZone(req, res, next) {
  try {
    const { postcode } = req.body;
    if (!postcode) {
      return res.status(400).json({ error: 'Postcode is required' });
    }

    const cleaned = postcode.replace(/\s+/g, '').toUpperCase();
    if (cleaned.length < 3) {
      return res.status(400).json({ error: 'Invalid postcode format' });
    }

    const outwardCode = cleaned.slice(0, -3);

    const zone = await DeliveryZone.findOne({
      tenant: req.tenantId,
      postcodePrefix: outwardCode,
      isActive: true,
    });

    if (!zone) {
      return res.json({ valid: false, message: `Delivery not available to ${outwardCode}.` });
    }

    res.json({
      valid: true,
      deliveryChargePence: zone.deliveryChargePence,
      minimumOrderPence: zone.minimumOrderPence,
      estimatedDeliveryMinutes: zone.estimatedDeliveryMinutes,
    });
  } catch (err) {
    next(err);
  }
}

export async function placeVoiceOrder(req, res, next) {
  try {
    const {
      order_type,
      customer_name,
      customer_phone,
      delivery_address,
      delivery_postcode,
      items,
      payment_method,
      notes,
      call_sid,
    } = req.body;

    if (!order_type || !customer_name || !customer_phone || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Order type, customer details, and items array are required' });
    }

    // --- Idempotency: derive key from header or call_sid ---
    const idempotencyKey = req.headers['x-idempotency-key'] || (call_sid ? `voice:${call_sid}` : null);
    if (idempotencyKey) {
      const existingOrderId = await checkIdempotency(idempotencyKey);
      if (existingOrderId) {
        const existing = await Order.findOne({ _id: existingOrderId, tenant: req.tenantId });
        if (existing) {
          console.log(`🔄 Voice idempotency hit — returning existing order: ${existing.reference}`);
          return res.json({
            success: true,
            orderReference: existing.reference,
            totalPence: existing.totalPence,
            orderId: existing._id.toString(),
            duplicate: true,
          });
        }
      }
    }

    // 1. Calculate and map items to database lines
    let subtotalPence = 0;
    const processedLines = [];
    const vatBreakdown = { 0: { netPence: 0, vatPence: 0, grossPence: 0 }, 5: { netPence: 0, vatPence: 0, grossPence: 0 }, 20: { netPence: 0, vatPence: 0, grossPence: 0 } };

    for (const item of items) {
      const dbItem = await MenuItem.findOne({
        _id: item.menu_item_id,
        tenant: req.tenantId,
        isAvailable: true,
        holdStatus: { $ne: true },
        publishStatus: 'published',
        'channels.voice': { $ne: false },
      })
        .populate({ path: 'category', populate: [{ path: 'parent' }, { path: 'department' }] })
        .populate({ path: 'modifierGroups', populate: [{ path: 'allowedLabelIds' }, { path: 'options.component' }] })
        .populate({ path: 'groupAssignments.group', populate: [{ path: 'allowedLabelIds' }, { path: 'options.component' }] })
        .lean();
      if (!dbItem) {
        return res.status(400).json({ error: `Menu item not found: ${item.name || item.menu_item_id}` });
      }
      if (dbItem.category?.isActive === false || dbItem.category?.channels?.voice === false || dbItem.category?.parent?.channels?.voice === false) {
        return res.status(400).json({ error: `${dbItem.name} is not currently available for voice ordering` });
      }

      let modifierDeltaPence = 0;
      const processedModifiers = [];
      let variationDeltaPence = 0;
      let processedVariation = null;

      const requestedVariationId = item.variation_id || item.variationId || item.selected_variation_id;
      if (requestedVariationId) {
        const variation = await Variation.findOne({
          _id: requestedVariationId,
          tenant: req.tenantId,
          menuItem: dbItem._id,
          isActive: true,
        });
        if (!variation) {
          return res.status(400).json({ error: `Variation is not available for ${dbItem.name}` });
        }
        variationDeltaPence = variation.priceDeltaPence || 0;
        processedVariation = {
          variationId: variation._id,
          name: variation.name,
          priceDeltaPence: variation.priceDeltaPence || 0,
          sku: variation.sku,
        };
      }

      if (item.modifiers && Array.isArray(item.modifiers)) {
        const voiceGroups = voiceGroupsForItem(dbItem);
        for (const mod of item.modifiers) {
          const modGroup = voiceGroups.find(g => g._id.toString() === mod.groupId || g.name === mod.groupName);
          if (!modGroup) continue;

          const opt = modGroup.options.find(o => o._id.toString() === mod.optionId || o.name === mod.optionName);
          if (!opt || opt.isAvailable === false || !componentVisibleOnVoice(opt)) continue;

          const priceDeltaPence = modGroup.samePrice ? (modGroup.samePricePence || 0) : (opt.priceDeltaPence || 0);
          modifierDeltaPence += priceDeltaPence;
          processedModifiers.push({
            groupName: modGroup.name,
            groupId: modGroup._id,
            optionName: opt.name,
            optionId: opt._id,
            labelId: mod.labelId || mod.selectedLabelId,
            labelName: mod.labelName,
            priceDeltaPence,
          });
        }
      }

      const lineTotalPence = (dbItem.basePricePence + variationDeltaPence + modifierDeltaPence) * (item.quantity || 1);
      subtotalPence += lineTotalPence;

      const vatRate = dbItem.vatRate || 20;
      const vatPence = Math.round(lineTotalPence - (lineTotalPence * 100) / (100 + vatRate));
      const netPence = lineTotalPence - vatPence;

      if (!vatBreakdown[vatRate]) {
        vatBreakdown[vatRate] = { rate: vatRate, netPence: 0, vatPence: 0, grossPence: 0 };
      }
      vatBreakdown[vatRate].netPence += netPence;
      vatBreakdown[vatRate].vatPence += vatPence;
      vatBreakdown[vatRate].grossPence += lineTotalPence;

      processedLines.push({
        menuItem: dbItem._id,
        menuItemSnapshot: {
          name: dbItem.name,
          menuCode: dbItem.menuCode,
          basePricePence: dbItem.basePricePence,
          vatRate,
        },
        quantity: item.quantity || 1,
        variation: processedVariation,
        modifiers: processedModifiers,
        lineTotalPence,
      });
    }

    // 2. Validate Delivery Zone
    let deliveryChargePence = 0;
    let deliveryZoneId = null;

    if (order_type === 'delivery') {
      if (!delivery_postcode) {
        return res.status(400).json({ error: 'Postcode required for delivery' });
      }
      const cleaned = delivery_postcode.replace(/\s+/g, '').toUpperCase();
      const postcodeOutward = cleaned.length >= 3 ? cleaned.slice(0, -3) : cleaned;
      const zone = await DeliveryZone.findOne({
        tenant: req.tenantId,
        postcodePrefix: postcodeOutward,
        isActive: true,
      });

      if (!zone) {
        return res.status(400).json({ error: `Delivery unavailable to postcode prefix: ${postcodeOutward}` });
      }

      deliveryChargePence = zone.deliveryChargePence;
      deliveryZoneId = zone._id;
    }

    const totalPence = subtotalPence + deliveryChargePence;

    // Recalculate VAT
    let vatPence = 0;
    for (const rate of Object.keys(vatBreakdown)) {
      vatPence += vatBreakdown[rate].vatPence;
    }

    // 3. Create Unique Order Sequence reference (atomic, race-safe)
    const reference = await nextOrderReference(req.tenantId);

    // 4. Initial payment record
    const paymentMethodMap = {
      card_link: 'payment_link',
      cash_on_delivery: 'cash',
    };
    const mappedPayment = paymentMethodMap[payment_method] || 'payment_link';

    const payments = [{
      method: mappedPayment,
      amountPence: totalPence,
      status: 'pending',
    }];

    // --- Atomic persistence span: Customer upsert + Order.create + VoiceCallLog ---
    const order = await withTransaction(async (session) => {
      // Customer resolution
      let customerId = null;
      let dbCust = await Customer.findOne({ tenant: req.tenantId, phone: customer_phone.trim() }).session(session);
      if (!dbCust) {
        dbCust = await Customer.create([{
          tenant: req.tenantId,
          name: customer_name.trim(),
          phone: customer_phone.trim(),
          addresses: order_type === 'delivery' ? [{
            line1: delivery_address,
            postcode: delivery_postcode,
            isDefault: true,
          }] : [],
        }], { session });
        dbCust = dbCust[0];
      }
      customerId = dbCust._id;

      // Create Order
      const createdOrder = (await Order.create([{
        tenant: req.tenantId,
        reference,
        idempotencyKey: idempotencyKey || undefined,
        channel: 'voice-agent',
        orderType: order_type,
        status: 'placed',
        customer: {
          name: customer_name,
          phone: customer_phone,
          customerId,
          address: order_type === 'delivery' ? {
            line1: delivery_address,
            postcode: delivery_postcode,
          } : undefined,
        },
        estimatedReadyAt: new Date(Date.now() + 25 * 60_000),
        lines: processedLines,
        payments,
        deliveryZoneId,
        deliveryChargePence,
        subtotalPence,
        vatBreakdown,
        vatPence,
        totalPence,
        voiceCallSid: call_sid,
        notes,
        statusHistory: [{ status: 'placed' }],
      }], { session }))[0];

      // Log Voice Call
      if (call_sid) {
        await VoiceCallLog.create([{
          tenant: req.tenantId,
          callSid: call_sid,
          callerNumber: customer_phone,
          status: 'completed',
          orderId: createdOrder._id,
          orderReference: createdOrder.reference,
        }], { session });
      }

      return createdOrder;
    });
    // --- End persistence span ---

    // Set idempotency key in Redis for future fast lookups
    if (idempotencyKey) {
      await setIdempotency(idempotencyKey, order._id.toString(), 86400);
    }

    // --- Post-commit side effects (non-critical, fire-and-forget where possible) ---
    const ticketText = compileKitchenTickets(order, 'AI_VOICE_AGENT');
    console.log('--- KITCHEN TICKET FOR VOICE ORDER ---');
    console.log(ticketText);

    // Broadcast new order to POS/KDS
    emitNewOrder(req.tenantId, order);

    // Send SMS receipt confirmation to the customer
    const tenantSettings = await Setting.findOne({ tenant: req.tenantId }).lean();
    const placementMsg = compileTextReceipt(order, tenantSettings);
    
    if (twilioClient && customer_phone) {
      try {
        await twilioClient.messages.create({
          body: placementMsg,
          to: customer_phone,
          from: env.twilioPhoneNumber || 'TakeawayPOS',
        });
      } catch (smsErr) {
        console.error('SMS confirmation failed:', smsErr);
      }
    } else {
      console.log(`⚠️ SMS Confirmation: ${placementMsg}`);
    }

    res.status(201).json({
      success: true,
      orderReference: order.reference,
      totalPence: order.totalPence,
      orderId: order._id.toString(),
    });
  } catch (err) {
    // E11000 on idempotencyKey unique index — duplicate slipped through Redis check
    if (err.code === 11000 && idempotencyKey) {
      const existing = await Order.findOne({ tenant: req.tenantId, idempotencyKey });
      if (existing) {
        await setIdempotency(idempotencyKey, existing._id.toString(), 86400);
        return res.json({
          success: true,
          orderReference: existing.reference,
          totalPence: existing.totalPence,
          orderId: existing._id.toString(),
          duplicate: true,
        });
      }
    }
    next(err);
  }
}

export async function sendVoicePaymentLink(req, res, next) {
  try {
    const { order_reference, amount_pence, phone_number } = req.body;

    if (!order_reference || !amount_pence || !phone_number) {
      return res.status(400).json({ error: 'order_reference, amount_pence, and phone_number are required' });
    }

    const order = await Order.findOne({ tenant: req.tenantId, reference: order_reference });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    let checkoutUrl = '';
    let linkId = '';

    // Create payment session
    if (!stripe) {
      console.log('⚠️ Stripe key missing — generating mocked link');
      linkId = `plink_mock_${Math.random().toString(36).slice(2, 9)}`;
      checkoutUrl = `https://checkout.stripe.dev/pay/${linkId}`;
    } else {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: `Food Order ${order_reference}`,
              },
              unit_amount: amount_pence,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${env.clientUrl}/track/${order_reference}?success=true`,
        cancel_url: `${env.clientUrl}/track/${order_reference}?cancelled=true`,
        metadata: {
          orderId: order._id.toString(),
          reference: order_reference,
          tenantId: req.tenantId,
        },
      });
      checkoutUrl = session.url;
      linkId = session.id;
    }

    // Update payment record in order
    const linkPayment = order.payments.find(p => p.method === 'payment_link');
    if (linkPayment) {
      linkPayment.stripePaymentLinkId = linkId;
    } else {
      order.payments.push({
        method: 'payment_link',
        amountPence: amount_pence,
        stripePaymentLinkId: linkId,
        status: 'pending',
      });
    }
    await order.save();

    // Send SMS
    const smsMessage = `Thank you for your order at TakeawayPOS Pro. Please complete your card payment of £${(amount_pence / 100).toFixed(2)} here: ${checkoutUrl}`;
    let smsSent = false;

    if (twilioClient) {
      try {
        await twilioClient.messages.create({
          body: smsMessage,
          to: phone_number,
          from: env.twilioPhoneNumber || 'TakeawayPOS',
        });
        smsSent = true;

        // Log payment link sent in call logs
        if (order.voiceCallSid) {
          await VoiceCallLog.findOneAndUpdate(
            { tenant: req.tenantId, callSid: order.voiceCallSid },
            { paymentLinkSent: true }
          );
        }
      } catch (smsErr) {
        console.error('Twilio SMS sending failed:', smsErr);
      }
    } else {
      console.log(`⚠️ Twilio unconfigured — Simulated SMS to ${phone_number}: "${smsMessage}"`);
      smsSent = true;
    }

    res.json({ success: true, paymentLink: checkoutUrl, smsSent });
  } catch (err) {
    next(err);
  }
}

export async function getVoiceOrder(req, res, next) {
  try {
    const { reference } = req.params;
    const order = await Order.findOne({
      tenant: req.tenantId,
      reference: reference.toUpperCase().trim(),
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      success: true,
      order: {
        id: order._id.toString(),
        reference: order.reference,
        status: order.status,
        orderType: order.orderType,
        customerName: order.customer.name,
        customerPhone: order.customer.phone,
        totalPence: order.totalPence,
        subtotalPence: order.subtotalPence,
        deliveryChargePence: order.deliveryChargePence,
        paymentStatus: order.payments[0]?.status || 'pending',
        paymentMethod: order.payments[0]?.method || 'cash',
        lines: order.lines.map(line => ({
          menu_item_id: line.menuItem?.toString() || '',
          name: line.menuItemSnapshot.name,
          quantity: line.quantity,
          lineTotalPence: line.lineTotalPence,
          modifiers: line.modifiers.map(m => ({
            groupId: m.groupId?.toString() || '',
            groupName: m.groupName,
            optionId: m.optionId?.toString() || '',
            optionName: m.optionName,
            priceDeltaPence: m.priceDeltaPence
          }))
        }))
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelVoiceOrder(req, res, next) {
  try {
    const { reference } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({
      tenant: req.tenantId,
      reference: reference.toUpperCase().trim(),
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check modification lockout (preparing or later is blocked)
    if (order.status !== 'placed' && order.status !== 'confirmed') {
      return res.status(400).json({
        error: `Order cannot be cancelled because it is in status: ${order.status}`
      });
    }

    order.status = 'cancelled';
    order.statusHistory.push({ status: 'cancelled', changedBy: null });
    order.notes = `${order.notes || ''} [Voice Cancelled: ${reason || 'No reason given'}]`;

    // Process refunds via shared service — full refund on each paid payment
    for (const p of order.payments) {
      if (p.status === 'paid' || p.status === 'partially_refunded') {
        const refundable = p.amountPence - (p.refundedPence || 0);
        if (refundable > 0) {
          try {
            await refundPayment(order, p, refundable, {
              reason: `Voice Cancellation refund: ${reason || 'Requested by customer via voice'}`,
              stripe,
            });
          } catch (sErr) {
            console.error('Refund failed during voice cancel:', sErr.message);
          }
        }
      }
    }

    await order.save();
    emitOrderStatusUpdate(req.tenantId, order._id.toString(), 'cancelled');

    // Notify customer via Twilio SMS
    const cancelMsg = `Your order ${order.reference} at TakeawayPOS Pro has been cancelled successfully.`;
    if (twilioClient && order.customer.phone) {
      try {
        await twilioClient.messages.create({
          body: cancelMsg,
          to: order.customer.phone,
          from: env.twilioPhoneNumber || 'TakeawayPOS',
        });
      } catch (smsErr) {
        console.error('SMS notification failed:', smsErr);
      }
    } else {
      console.log(`⚠️ SMS Notification: ${cancelMsg}`);
    }

    res.json({ success: true, message: 'Order cancelled successfully', orderReference: order.reference });
  } catch (err) {
    next(err);
  }
}

export async function modifyVoiceOrder(req, res, next) {
  try {
    const { reference } = req.params;
    const { items, notes } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required for modification' });
    }

    const order = await Order.findOne({
      tenant: req.tenantId,
      reference: reference.toUpperCase().trim(),
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check modification lockout (preparing or later is blocked)
    if (order.status !== 'placed' && order.status !== 'confirmed') {
      return res.status(400).json({
        error: `Order cannot be modified because it is in status: ${order.status}`
      });
    }

    const originalTotalPence = order.totalPence;

    // Calculate and map items to database lines
    let subtotalPence = 0;
    const processedLines = [];
    const vatBreakdown = { 
      0: { rate: 0, netPence: 0, vatPence: 0, grossPence: 0 }, 
      5: { rate: 5, netPence: 0, vatPence: 0, grossPence: 0 }, 
      20: { rate: 20, netPence: 0, vatPence: 0, grossPence: 0 } 
    };

    for (const item of items) {
      const dbItem = await MenuItem.findOne({ _id: item.menu_item_id, tenant: req.tenantId }).populate('modifierGroups');
      if (!dbItem) {
        return res.status(400).json({ error: `Menu item not found: ${item.name || item.menu_item_id}` });
      }

      let modifierDeltaPence = 0;
      const processedModifiers = [];

      if (item.modifiers && Array.isArray(item.modifiers)) {
        for (const mod of item.modifiers) {
          const modGroup = dbItem.modifierGroups.find(g => g._id.toString() === mod.groupId || g.name === mod.groupName);
          if (!modGroup) continue;

          const opt = modGroup.options.find(o => o._id.toString() === mod.optionId || o.name === mod.optionName);
          if (!opt) continue;

          modifierDeltaPence += opt.priceDeltaPence;
          processedModifiers.push({
            groupName: modGroup.name,
            groupId: modGroup._id,
            optionName: opt.name,
            optionId: opt._id,
            priceDeltaPence: opt.priceDeltaPence,
          });
        }
      }

      const lineTotalPence = (dbItem.basePricePence + modifierDeltaPence) * (item.quantity || 1);
      subtotalPence += lineTotalPence;

      const vatRate = dbItem.vatRate || 20;
      const vatPence = Math.round(lineTotalPence - (lineTotalPence * 100) / (100 + vatRate));
      const netPence = lineTotalPence - vatPence;

      vatBreakdown[vatRate].netPence += netPence;
      vatBreakdown[vatRate].vatPence += vatPence;
      vatBreakdown[vatRate].grossPence += lineTotalPence;

      processedLines.push({
        menuItem: dbItem._id,
        menuItemSnapshot: {
          name: dbItem.name,
          menuCode: dbItem.menuCode,
          basePricePence: dbItem.basePricePence,
          vatRate,
        },
        quantity: item.quantity || 1,
        modifiers: processedModifiers,
        lineTotalPence,
      });
    }

    const deliveryChargePence = order.deliveryChargePence || 0;
    const totalPence = subtotalPence + deliveryChargePence;

    // Recalculate VAT
    let vatPence = 0;
    for (const rate of Object.keys(vatBreakdown)) {
      vatPence += vatBreakdown[rate].vatPence;
    }

    const priceDelta = totalPence - originalTotalPence;
    let paymentLinkUrl = null;

    if (priceDelta > 0) {
      const originalPayment = order.payments[0];
      if (originalPayment && originalPayment.method === 'payment_link') {
        if (!stripe) {
          console.log('⚠️ Stripe key missing — generating mocked link for delta');
          const linkId = `plink_mock_delta_${Math.random().toString(36).slice(2, 9)}`;
          paymentLinkUrl = `https://checkout.stripe.dev/pay/${linkId}`;
        } else {
          try {
            const session = await stripe.checkout.sessions.create({
              payment_method_types: ['card'],
              line_items: [
                {
                  price_data: {
                    currency: 'gbp',
                    product_data: {
                      name: `Order Adjustment Delta: ${order.reference}`,
                    },
                    unit_amount: priceDelta,
                  },
                  quantity: 1,
                },
              ],
              mode: 'payment',
              success_url: `${env.clientUrl}/track/${order.reference}?success=true`,
              cancel_url: `${env.clientUrl}/track/${order.reference}?cancelled=true`,
              metadata: {
                orderId: order._id.toString(),
                reference: order.reference,
                tenantId: req.tenantId,
                isDelta: 'true',
                deltaAmountPence: String(priceDelta),
              },
            });
            paymentLinkUrl = session.url;
            
            // Add secondary payment record for delta
            order.payments.push({
              method: 'payment_link',
              amountPence: priceDelta,
              stripePaymentLinkId: session.id,
              status: 'pending',
            });
          } catch (stripeErr) {
            console.error('Failed to create delta stripe session:', stripeErr);
          }
        }
      } else {
        if (originalPayment) {
          originalPayment.amountPence = totalPence;
        }
      }
    } else {
      const originalPayment = order.payments[0];
      if (originalPayment) {
        originalPayment.amountPence = totalPence;
      }
    }

    // Update order fields
    order.lines = processedLines;
    order.subtotalPence = subtotalPence;
    order.vatBreakdown = vatBreakdown;
    order.vatPence = vatPence;
    order.totalPence = totalPence;
    if (notes) {
      order.notes = `${order.notes || ''} [Voice Modified: ${notes}]`;
    } else {
      order.notes = `${order.notes || ''} [Voice Modified]`;
    }
    order.statusHistory.push({ status: order.status, changedBy: null });

    await order.save();

    // Regenerate kitchen tickets
    const ticketText = compileKitchenTickets(order, 'AI_VOICE_AGENT');
    console.log('--- REGENERATED KITCHEN TICKET FOR MODIFIED ORDER ---');
    console.log(ticketText);

    // Broadcast modified order state
    emitOrderStatusUpdate(req.tenantId, order._id.toString(), order.status, {
      estimatedReadyAt: order.estimatedReadyAt,
      totalPence: order.totalPence,
      lines: order.lines,
    });

    // Send SMS receipt summary/modification update
    let smsMessage = `Your order ${order.reference} has been modified successfully. New total: £${(totalPence / 100).toFixed(2)}.`;
    if (priceDelta > 0 && paymentLinkUrl) {
      smsMessage += ` Please pay the difference of £${(priceDelta / 100).toFixed(2)} here: ${paymentLinkUrl}`;
    } else if (priceDelta < 0) {
      smsMessage += ` You will be refunded £${(Math.abs(priceDelta) / 100).toFixed(2)} in cash upon delivery/collection.`;
    }

    if (twilioClient && order.customer.phone) {
      try {
        await twilioClient.messages.create({
          body: smsMessage,
          to: order.customer.phone,
          from: env.twilioPhoneNumber || 'TakeawayPOS',
        });
      } catch (smsErr) {
        console.error('SMS notification failed:', smsErr);
      }
    } else {
      console.log(`⚠️ SMS Notification: ${smsMessage}`);
    }

    res.json({
      success: true,
      orderReference: order.reference,
      totalPence: order.totalPence,
      priceDeltaPence: priceDelta,
      paymentLink: paymentLinkUrl,
      orderId: order._id.toString(),
    });
  } catch (err) {
    next(err);
  }
}

function padLine(left, right, width = 36) {
  const spaceNeeded = width - left.length - right.length;
  if (spaceNeeded <= 0) {
    const maxLeftLen = width - right.length - 3;
    if (maxLeftLen > 5) {
      return left.substring(0, maxLeftLen) + '... ' + right;
    }
    return left + ' ' + right;
  }
  return left + ' '.repeat(spaceNeeded) + right;
}

export function compileTextReceipt(order, settings = {}) {
  const border = '------------------------------------';
  
  let text = '';
  text += `🧾 ${settings.storeName?.toUpperCase() || "TAKEAWAYPOS"}\n`;
  if (settings.storeAddress) text += `${settings.storeAddress}\n`;
  if (settings.storePhone) text += `Tel: ${settings.storePhone}\n`;
  text += `${border}\n`;
  text += `Ref: ${order.reference}\n`;
  text += `Date: ${new Date(order.createdAt || Date.now()).toLocaleString('en-GB')}\n`;
  text += `Type: ${order.orderType ? order.orderType.toUpperCase() : 'COLLECTION'} (${order.channel ? order.channel.toUpperCase() : 'VOICE'})\n`;
  text += `${border}\n`;

  const phone = order.customer?.phone || order.callerNumber || '';
  const customerName = order.customer?.name || 'Customer';
  text += `Customer: ${customerName}\n`;
  if (phone) text += `Phone: ${phone}\n`;
  if (order.customer?.address && order.customer.address.line1) {
    text += `Address: ${order.customer.address.line1}\n`;
    if (order.customer.address.postcode) {
      text += `Postcode: ${order.customer.address.postcode}\n`;
    }
  }
  text += `${border}\n\n`;

  text += `ITEMS:\n`;
  text += `Qty  Item                     Price\n`;
  text += `${border}\n`;
  if (order.lines && order.lines.length > 0) {
    for (const line of order.lines) {
      if (line.isBundle) {
        const priceVal = `£${((line.lineTotalPence || 0) / 100).toFixed(2)}`;
        const itemLabel = `${line.quantity}x [DEAL] ${line.bundleSnapshot?.name || 'Bundle'}`;
        text += `${padLine(itemLabel, priceVal, 36)}\n`;
        if (line.bundleItems) {
          for (const bi of line.bundleItems) {
            text += `  - ${bi.menuItemSnapshot?.name || 'Item'}\n`;
            if (bi.variation) {
              text += `    Size: ${bi.variation.name}\n`;
            }
            if (bi.modifiers) {
              for (const m of bi.modifiers) {
                if (m.isManual && m.printOnReceipt === false) continue;
                const priceText = m.priceDeltaPence > 0 ? `£${(m.priceDeltaPence / 100).toFixed(2)}` : '';
                const modLabel = `    + ${m.optionName}`;
                if (priceText) {
                  text += `${padLine(modLabel, priceText, 36)}\n`;
                } else {
                  text += `${modLabel}\n`;
                }
              }
            }
          }
        }
      } else {
        const priceVal = `£${((line.lineTotalPence || 0) / 100).toFixed(2)}`;
        const itemLabel = `${line.quantity}x ${line.menuItemSnapshot?.name || 'Item'}`;
        text += `${padLine(itemLabel, priceVal, 36)}\n`;
        if (line.variation) {
          text += `  Size: ${line.variation.name}\n`;
        }
        if (line.modifiers) {
          for (const m of line.modifiers) {
            if (m.isManual && m.printOnReceipt === false) continue;
            const priceText = m.priceDeltaPence > 0 ? `£${(m.priceDeltaPence / 100).toFixed(2)}` : '';
            const modLabel = `  + ${m.optionName}`;
            if (priceText) {
              text += `${padLine(modLabel, priceText, 36)}\n`;
            } else {
              text += `${modLabel}\n`;
            }
          }
        }
      }
      if (line.itemNote) {
        text += `  *Note: ${line.itemNote}\n`;
      }
    }
  }

  text += `\n${border}\n`;
  text += `${padLine("Subtotal", `£${((order.subtotalPence || 0) / 100).toFixed(2)}`, 36)}\n`;
  if (order.discountPence > 0) {
    text += `${padLine(`Discount (${order.discountReason || 'Promo'})`, `-£${(order.discountPence / 100).toFixed(2)}`, 36)}\n`;
  }
  if (order.deliveryChargePence > 0) {
    text += `${padLine("Delivery Charge", `£${(order.deliveryChargePence / 100).toFixed(2)}`, 36)}\n`;
  }
  text += `${padLine("TOTAL", `£${((order.totalPence || 0) / 100).toFixed(2)}`, 36)}\n`;
  text += `${border}\n\n`;

  // Bifurcated VAT Breakdown Table
  text += `BIFURCATED VAT BREAKDOWN:\n`;
  text += `Rate    Net       VAT       Gross\n`;
  text += `${border}\n`;
  const breakdown = order.vatBreakdown || {};
  let totalNet = 0;
  let totalVat = 0;
  let totalGross = 0;
  for (const rate of Object.keys(breakdown)) {
    const b = breakdown[rate];
    const rStr = `${rate}%`.padEnd(8);
    const netStr = `£${((b.netPence || 0) / 100).toFixed(2)}`.padEnd(10);
    const vatStr = `£${((b.vatPence || 0) / 100).toFixed(2)}`.padEnd(10);
    const grossStr = `£${((b.grossPence || 0) / 100).toFixed(2)}`;
    text += `${rStr}${netStr}${vatStr}${grossStr}\n`;
    totalNet += (b.netPence || 0);
    totalVat += (b.vatPence || 0);
    totalGross += (b.grossPence || 0);
  }
  text += `${border}\n`;
  const totLabel = `Total`.padEnd(8);
  const totNetStr = `£${(totalNet / 100).toFixed(2)}`.padEnd(10);
  const totVatStr = `£${(totalVat / 100).toFixed(2)}`.padEnd(10);
  const totGrossStr = `£${(totalGross / 100).toFixed(2)}`;
  text += `${totLabel}${totNetStr}${totVatStr}${totGrossStr}\n`;
  text += `${border}\n\n`;
  
  const payMethod = order.payments?.[0]?.method || 'unpaid';
  const payStatus = order.payments?.[0]?.status || 'pending';
  text += `Payment: ${payMethod.toUpperCase()} (${payStatus.toUpperCase()})\n`;
  text += `${border}\n`;
  
  // Clean receipt footer: remove any line containing VAT/GB123456789 (case-insensitive)
  let footer = settings.receiptFooter || "Thank you for your custom!";
  footer = footer.split('\n')
    .filter(line => {
      const lower = line.toLowerCase();
      return !lower.includes('vat') && !lower.includes('gb123456789');
    })
    .join('\n');
  
  text += `${footer}\n`;
  text += `Powered by TakeAwayPOS`;
  
  return text;
}

export async function sendVoiceBillSms(req, res, next) {
  try {
    const { order_reference } = req.body;
    const order = await Order.findOne({ reference: order_reference, tenant: req.tenantId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const tenantSettings = await Setting.findOne({ tenant: req.tenantId }).lean();
    const smsMessage = compileTextReceipt(order, tenantSettings);
    
    let smsSent = false;
    const phone = order.customer?.phone || order.callerNumber;
    if (twilioClient && phone) {
      try {
        await twilioClient.messages.create({
          body: smsMessage,
          to: phone,
          from: env.twilioPhoneNumber || 'TakeawayPOS',
        });
        smsSent = true;
      } catch (smsErr) {
        console.error('SMS sending failed:', smsErr);
      }
    } else {
      console.log(`⚠️ SMS Bill (Simulated) to ${phone}: \n${smsMessage}`);
      smsSent = true;
    }
    
    res.json({ success: true, smsSent });
  } catch (err) {
    next(err);
  }
}

export async function calculateVoicePrice(req, res, next) {
  try {
    const {
      order_type,
      delivery_postcode,
      items,
    } = req.body;

    if (!order_type || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Order type and items array are required' });
    }

    let subtotalPence = 0;
    const processedLines = [];

    for (const item of items) {
      const dbItem = await MenuItem.findOne({
        _id: item.menu_item_id,
        tenant: req.tenantId,
        isAvailable: true,
        holdStatus: { $ne: true },
        publishStatus: 'published',
        'channels.voice': { $ne: false },
      })
        .populate({ path: 'category', populate: [{ path: 'parent' }, { path: 'department' }] })
        .populate({ path: 'modifierGroups', populate: [{ path: 'allowedLabelIds' }, { path: 'options.component' }] })
        .populate({ path: 'groupAssignments.group', populate: [{ path: 'allowedLabelIds' }, { path: 'options.component' }] })
        .lean();

      if (!dbItem) {
        return res.status(400).json({ error: `Menu item not found: ${item.name || item.menu_item_id}` });
      }

      let modifierDeltaPence = 0;
      const processedModifiers = [];
      let variationDeltaPence = 0;
      let processedVariation = null;

      const requestedVariationId = item.variation_id || item.variationId || item.selected_variation_id;
      if (requestedVariationId) {
        const variation = await Variation.findOne({
          _id: requestedVariationId,
          tenant: req.tenantId,
          menuItem: dbItem._id,
          isActive: true,
        });
        if (!variation) {
          return res.status(400).json({ error: `Variation is not available for ${dbItem.name}` });
        }
        variationDeltaPence = variation.priceDeltaPence || 0;
        processedVariation = {
          variationId: variation._id,
          name: variation.name,
          priceDeltaPence: variation.priceDeltaPence || 0,
          sku: variation.sku,
        };
      }

      if (item.modifiers && Array.isArray(item.modifiers)) {
        const voiceGroups = voiceGroupsForItem(dbItem);
        for (const mod of item.modifiers) {
          const modGroup = voiceGroups.find(g => g._id.toString() === mod.groupId || g.name === mod.groupName);
          if (!modGroup) continue;

          const opt = modGroup.options.find(o => o._id.toString() === mod.optionId || o.name === mod.optionName);
          if (!opt || opt.isAvailable === false || !componentVisibleOnVoice(opt)) continue;

          const priceDeltaPence = modGroup.samePrice ? (modGroup.samePricePence || 0) : (opt.priceDeltaPence || 0);
          modifierDeltaPence += priceDeltaPence;
          processedModifiers.push({
            groupName: modGroup.name,
            groupId: modGroup._id,
            optionName: opt.name,
            optionId: opt._id,
            labelId: mod.labelId || mod.selectedLabelId,
            labelName: mod.labelName,
            priceDeltaPence,
          });
        }
      }

      const lineTotalPence = (dbItem.basePricePence + variationDeltaPence + modifierDeltaPence) * (item.quantity || 1);
      subtotalPence += lineTotalPence;

      processedLines.push({
        menu_item_id: dbItem._id.toString(),
        name: dbItem.name,
        quantity: item.quantity || 1,
        basePricePence: dbItem.basePricePence,
        variation: processedVariation,
        modifiers: processedModifiers,
        lineTotalPence,
      });
    }

    let deliveryChargePence = 0;
    if (order_type === 'delivery') {
      if (!delivery_postcode) {
        return res.status(400).json({ error: 'Postcode required for delivery' });
      }
      const cleaned = delivery_postcode.replace(/\s+/g, '').toUpperCase();
      const postcodeOutward = cleaned.length >= 3 ? cleaned.slice(0, -3) : cleaned;
      const zone = await DeliveryZone.findOne({
        tenant: req.tenantId,
        postcodePrefix: postcodeOutward,
        isActive: true,
      });

      if (!zone) {
        return res.status(400).json({ error: `Delivery unavailable to postcode prefix: ${postcodeOutward}` });
      }
      deliveryChargePence = zone.deliveryChargePence;
    }

    const totalPence = subtotalPence + deliveryChargePence;

    res.json({
      success: true,
      subtotalPence,
      deliveryChargePence,
      totalPence,
      items: processedLines,
    });
  } catch (err) {
    next(err);
  }
}


