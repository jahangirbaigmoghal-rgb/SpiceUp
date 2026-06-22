import Setting from '../models/Setting.js';
import Tenant from '../models/Tenant.js';
import { emitSettingsChanged } from '../config/socket.js';
import { audit } from '../utils/audit.js';

const voiceSettingKeys = [
  'voiceAgentEnabled',
  'voiceAgentVoice',
  'voiceAgentGreeting',
  'voiceAgentPrompt',
  'voiceAgentHandoffPhone',
  'voiceAgentMaxCallMinutes',
  'voiceAgentTestMode',
  'voiceAgentModel',
  'voiceAgentLanguage',
  'voiceAgentTargetLatencyMs',
  'voiceAgentMaxSilenceSeconds',
  'voiceAgentBargeInEnabled',
  'voiceAgentRecordCalls',
  'voiceAgentTranscriptEnabled',
  'voiceAgentPaymentLinkEnabled',
  'voiceAgentAllergyHandoff',
  'voiceAgentComplaintHandoff',
  'voiceAgentMenuRefreshSeconds',
];

export async function getSettings(req, res, next) {
  try {
    let setting = await Setting.findOne({ tenant: req.tenantId });
    if (!setting) {
      // Seed default settings for the tenant
      setting = await Setting.create({
        tenant: req.tenantId,
        receiptHeader: 'SpiceUp',
        receiptFooter: 'Thank you for your order!',
        receiptShowLogo: true,
        receiptShowVat: true,
        smsConfirmationEnabled: true,
        emailConfirmationEnabled: true,
        pushNotificationsEnabled: false,
        cashEnabled: true,
        cardEnabled: true,
        maxItemsPerOrder: 50,
        allowSpecialInstructions: true,
        autoConfirmOrders: false,
        printerEnabled: false,
        printerHost: '',
        printerPort: 9100,
        printKitchenTicket: true,
        printCustomerReceipt: true,
        // Default seed PWA CMS
        storeName: 'Rupeyal Express',
        storePhone: '01782 811112',
        storeEmail: 'orders@rupeyalexpress.co.uk',
        storeAddress: '123 High Street, Tunstall, Stoke-on-Trent, ST6 5EP',
        storeOpenTime: '16:00',
        storeCloseTime: '23:30',
        storeIsOpen: true,
        deliveryFeePence: 250,
        minDeliveryOrderPence: 1500,
        freeDeliveryThresholdPence: 1500,
        estimatedDeliveryMinutes: 45,
        estimatedCollectionMinutes: 15,
        pwaThemeColor: '#f97316',
        pwaBannerTitle: 'Rupeyal Express',
        pwaBannerSub: 'Authentic Taste of Tunstall',
        pwaBannerDescription: "Indulge in Stoke's finest stonebaked pizzas, balti curries, and authentic flame-grilled kebabs. Freshly prepared to order.",
        pwaBannerImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1600&auto=format&fit=crop',
        voiceAgentEnabled: true,
        voiceAgentVoice: 'Aoede',
        voiceAgentGreeting: 'Thanks for calling Rupeyal Express. I can help with collection or delivery orders.',
        voiceAgentPrompt: 'You are an AI order-taker for Rupeyal Express. Greet customers warmly and help them order.',
        voiceAgentHandoffPhone: '01782 811112',
        voiceAgentMaxCallMinutes: 8,
        voiceAgentTestMode: false,
        voiceAgentModel: 'gemini-3.1-flash-live-preview',
        voiceAgentLanguage: 'en-GB',
        voiceAgentTargetLatencyMs: 900,
        voiceAgentMaxSilenceSeconds: 6,
        voiceAgentBargeInEnabled: true,
        voiceAgentRecordCalls: true,
        voiceAgentTranscriptEnabled: true,
        voiceAgentPaymentLinkEnabled: true,
        voiceAgentAllergyHandoff: true,
        voiceAgentComplaintHandoff: true,
        voiceAgentMenuRefreshSeconds: 60,
      });
    }
    res.json({ settings: setting });
  } catch (err) {
    next(err);
  }
}

export async function getPublicSettings(req, res, next) {
  try {
    let setting = await Setting.findOne({ tenant: req.tenantId });
    if (!setting) {
      // Return hardcoded default object as fallback if DB isn't seeded yet
      return res.json({
        settings: {
          tenant: req.tenantId,
          storeName: 'Rupeyal Express',
          storePhone: '01782 811112',
          storeEmail: 'orders@rupeyalexpress.co.uk',
          storeAddress: '123 High Street, Tunstall, Stoke-on-Trent, ST6 5EP',
          storeOpenTime: '16:00',
          storeCloseTime: '23:30',
          storeIsOpen: true,
          deliveryFeePence: 250,
          minDeliveryOrderPence: 1500,
          freeDeliveryThresholdPence: 1500,
          estimatedDeliveryMinutes: 45,
          estimatedCollectionMinutes: 15,
          pwaThemeColor: '#f97316',
          pwaBannerTitle: 'Rupeyal Express',
          pwaBannerSub: 'Authentic Taste of Tunstall',
          pwaBannerDescription: "Indulge in Stoke's finest stonebaked pizzas, balti curries, and authentic flame-grilled kebabs. Freshly prepared to order.",
          pwaBannerImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1600&auto=format&fit=crop',
        }
      });
    }
    
    // Select only public safe fields
    const publicSettings = {
      tenant: setting.tenant || req.tenantId,
      storeName: setting.storeName || 'Rupeyal Express',
      storePhone: setting.storePhone || '01782 811112',
      storeEmail: setting.storeEmail || 'orders@rupeyalexpress.co.uk',
      storeAddress: setting.storeAddress || '123 High Street, Tunstall, Stoke-on-Trent, ST6 5EP',
      storeOpenTime: setting.storeOpenTime || '16:00',
      storeCloseTime: setting.storeCloseTime || '23:30',
      storeIsOpen: setting.storeIsOpen !== false,
      deliveryFeePence: setting.deliveryFeePence ?? 250,
      minDeliveryOrderPence: setting.minDeliveryOrderPence ?? 1500,
      freeDeliveryThresholdPence: setting.freeDeliveryThresholdPence ?? 1500,
      estimatedDeliveryMinutes: setting.estimatedDeliveryMinutes ?? 45,
      estimatedCollectionMinutes: setting.estimatedCollectionMinutes ?? 15,
      pwaThemeColor: setting.pwaThemeColor || '#f97316',
      pwaBannerTitle: setting.pwaBannerTitle || 'Rupeyal Express',
      pwaBannerSub: setting.pwaBannerSub || 'Authentic Taste of Tunstall',
      pwaBannerDescription: setting.pwaBannerDescription || "Indulge in Stoke's finest stonebaked pizzas, balti curries, and authentic flame-grilled kebabs. Freshly prepared to order.",
      pwaBannerImage: setting.pwaBannerImage || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1600&auto=format&fit=crop',
    };

    res.json({ settings: publicSettings });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const updateData = req.body;
    const before = await Setting.findOne({ tenant: req.tenantId });
    let setting = await Setting.findOneAndUpdate(
      { tenant: req.tenantId },
      updateData,
      { new: true, runValidators: true, upsert: true }
    );

    const tenantVoiceUpdate = {};
    for (const key of voiceSettingKeys) {
      if (Object.prototype.hasOwnProperty.call(updateData, key)) {
        tenantVoiceUpdate[key] = updateData[key];
      }
    }
    if (Object.keys(tenantVoiceUpdate).length > 0) {
      await Tenant.findByIdAndUpdate(req.tenantId, tenantVoiceUpdate, { runValidators: true });
    }

    // Record audit log
    await audit(req, 'update_settings', 'Setting', setting._id, { before, after: setting });

    // Broadcast updated settings to all connected clients
    const publicSettings = {
      tenant: setting.tenant || req.tenantId,
      storeName: setting.storeName || 'Rupeyal Express',
      storePhone: setting.storePhone || '01782 811112',
      storeEmail: setting.storeEmail || 'orders@rupeyalexpress.co.uk',
      storeAddress: setting.storeAddress || '123 High Street, Tunstall, Stoke-on-Trent, ST6 5EP',
      storeOpenTime: setting.storeOpenTime || '16:00',
      storeCloseTime: setting.storeCloseTime || '23:30',
      storeIsOpen: setting.storeIsOpen !== false,
      deliveryFeePence: setting.deliveryFeePence ?? 250,
      minDeliveryOrderPence: setting.minDeliveryOrderPence ?? 1500,
      freeDeliveryThresholdPence: setting.freeDeliveryThresholdPence ?? 1500,
      estimatedDeliveryMinutes: setting.estimatedDeliveryMinutes ?? 45,
      estimatedCollectionMinutes: setting.estimatedCollectionMinutes ?? 15,
      pwaThemeColor: setting.pwaThemeColor || '#f97316',
      pwaBannerTitle: setting.pwaBannerTitle || 'Rupeyal Express',
      pwaBannerSub: setting.pwaBannerSub || 'Authentic Taste of Tunstall',
      pwaBannerDescription: setting.pwaBannerDescription || "Indulge in Stoke's finest stonebaked pizzas, balti curries, and authentic flame-grilled kebabs. Freshly prepared to order.",
      pwaBannerImage: setting.pwaBannerImage || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1600&auto=format&fit=crop',
    };
    emitSettingsChanged(req.tenantId, publicSettings);

    res.json({ settings: setting });
  } catch (err) {
    next(err);
  }
}

import { testPrinter } from '../services/printerService.js';
export async function testPrinterConnection(req, res, next) {
  try {
    const success = await testPrinter(req.body);
    if (success) {
      res.json({ success: true, message: 'Test print sent successfully.' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to connect to printer. Please check printer IP and port.' });
    }
  } catch (err) {
    next(err);
  }
}
