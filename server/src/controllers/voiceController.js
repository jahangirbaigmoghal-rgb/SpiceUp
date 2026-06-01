import MenuItem from '../models/MenuItem.js';
import Category from '../models/Category.js';
import DeliveryZone from '../models/DeliveryZone.js';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import VoiceCallLog from '../models/VoiceCallLog.js';
import { emitNewOrder, emitOrderStatusUpdate } from '../config/socket.js';
import stripePackage from 'stripe';
import twilio from 'twilio';
import { env } from '../config/env.js';
import { compileKitchenTickets } from './orderController.js';

const stripe = env.stripeSecretKey ? stripePackage(env.stripeSecretKey) : null;
const twilioClient = env.twilioAccountSid && env.twilioAuthToken ? twilio(env.twilioAccountSid, env.twilioAuthToken) : null;

export async function getVoiceMenu(req, res, next) {
  try {
    const items = await MenuItem.find({ tenant: req.tenantId, isAvailable: true })
      .populate('category')
      .populate('modifierGroups')
      .lean();

    // Flatten menu items for easy LLM parsing
    const formattedMenu = items.map(item => ({
      itemId: item._id.toString(),
      name: item.name,
      menuCode: item.menuCode || '',
      category: item.category?.name || 'General',
      pricePence: item.basePricePence,
      description: item.description || '',
      dietaryTags: item.dietaryTags || [],
      allergens: item.allergens || [],
      modifierGroups: (item.modifierGroups || [])
        .filter(g => g.isActive)
        .map(g => ({
          groupId: g._id.toString(),
          name: g.name,
          displayName: g.displayName || g.name,
          type: g.type, // required / optional
          selectionType: g.selectionType, // single / multiple
          minSelections: g.minSelections,
          maxSelections: g.maxSelections,
          options: g.options
            .filter(o => o.isAvailable)
            .map(o => ({
              optionId: o._id.toString(),
              name: o.name,
              priceDeltaPence: o.priceDeltaPence,
            })),
        })),
    }));

    res.json({ menu: formattedMenu });
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

    // 1. Calculate and map items to database lines
    let subtotalPence = 0;
    const processedLines = [];
    const vatBreakdown = { 0: { netPence: 0, vatPence: 0, grossPence: 0 }, 5: { netPence: 0, vatPence: 0, grossPence: 0 }, 20: { netPence: 0, vatPence: 0, grossPence: 0 } };

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
      const postcodeOutward = delivery_postcode.trim().toUpperCase().split(' ')[0];
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

    // 3. Create Unique Order Sequence reference
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = await Order.countDocuments({
      tenant: req.tenantId,
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });
    const reference = `ORD-${todayStr}-${String(countToday + 1).padStart(4, '0')}`;

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

    // 5. Customer resolution
    let customerId = null;
    let dbCust = await Customer.findOne({ tenant: req.tenantId, phone: customer_phone.trim() });
    if (!dbCust) {
      dbCust = await Customer.create({
        tenant: req.tenantId,
        name: customer_name.trim(),
        phone: customer_phone.trim(),
        addresses: order_type === 'delivery' ? [{
          line1: delivery_address,
          postcode: delivery_postcode,
          isDefault: true,
        }] : [],
      });
    }
    customerId = dbCust._id;

    // 6. Create Order
    const order = await Order.create({
      tenant: req.tenantId,
      reference,
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
    });

    // 7. Log Voice Call
    if (call_sid) {
      await VoiceCallLog.create({
        tenant: req.tenantId,
        callSid: call_sid,
        callerNumber: customer_phone,
        status: 'completed',
        orderId: order._id,
        orderReference: order.reference,
      });
    }

    // Compile and print kitchen ticket
    const ticketText = compileKitchenTickets(order, 'AI_VOICE_AGENT');
    console.log('--- KITCHEN TICKET FOR VOICE ORDER ---');
    console.log(ticketText);

    // Broadcast new order to POS/KDS
    emitNewOrder(req.tenantId, order);

    // Send SMS receipt confirmation to the customer
    const orderTypeLabel = order_type === 'delivery' ? 'Delivery' : 'Collection';
    const placementMsg = `Thank you for your order at Papa's Pizza & Grill! Your order ref is ${order.reference}. Total: £${(totalPence / 100).toFixed(2)}. Method: ${orderTypeLabel}.`;
    
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

    // Process refunds for stripe payment
    for (const p of order.payments) {
      if (p.status === 'paid' && p.method === 'stripe' && p.stripePaymentIntentId && stripe) {
        try {
          const refund = await stripe.refunds.create({
            payment_intent: p.stripePaymentIntentId,
            reason: 'requested_by_customer',
          });
          order.refundHistory.push({
            amountPence: p.amountPence,
            reason: `Voice Cancellation refund: ${reason || 'Requested by customer via voice'}`,
            stripeRefundId: refund.id,
          });
          p.status = 'refunded';
        } catch (sErr) {
          console.error('Stripe refund failed:', sErr);
        }
      } else if (p.status === 'paid') {
        p.status = 'refunded';
        order.refundHistory.push({
          amountPence: p.amountPence,
          reason: `Voice Cancellation refund: ${reason || 'Order cancelled'}`,
        });
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

export async function searchVoiceMenu(req, res, next) {
  try {
    const query = req.query.q || '';
    if (!query) {
      return res.json({ success: true, results: [], count: 0 });
    }

    const items = await MenuItem.find({
      tenant: req.tenantId,
      isAvailable: true,
      name: { $regex: query, $options: 'i' }
    })
    .populate('category')
    .populate('modifierGroups')
    .lean();

    const results = items.map(item => ({
      itemId: item._id.toString(),
      name: item.name,
      menuCode: item.menuCode || '',
      category: item.category?.name || 'General',
      pricePence: item.basePricePence,
      description: item.description || '',
      dietaryTags: item.dietaryTags || [],
      allergens: item.allergens || [],
      modifierGroups: (item.modifierGroups || [])
        .filter(g => g.isActive)
        .map(g => ({
          groupId: g._id.toString(),
          name: g.name,
          displayName: g.displayName || g.name,
          type: g.type,
          selectionType: g.selectionType,
          minSelections: g.minSelections,
          maxSelections: g.maxSelections,
          options: g.options
            .filter(o => o.isAvailable)
            .map(o => ({
              optionId: o._id.toString(),
              name: o.name,
              priceDeltaPence: o.priceDeltaPence,
            })),
        })),
    }));

    res.json({
      success: true,
      results,
      count: results.length
    });
  } catch (err) {
    next(err);
  }
}

