import Setting from '../models/Setting.js';

export async function getSettings(req, res, next) {
  try {
    let setting = await Setting.findOne({ tenant: req.tenantId });
    if (!setting) {
      // Seed default settings for the tenant
      setting = await Setting.create({
        tenant: req.tenantId,
        receiptHeader: 'TakeawayPOS Pro',
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
    let setting = await Setting.findOneAndUpdate(
      { tenant: req.tenantId },
      updateData,
      { new: true, runValidators: true, upsert: true }
    );

    res.json({ settings: setting });
  } catch (err) {
    next(err);
  }
}
