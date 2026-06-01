import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
  // Receipt settings
  receiptHeader: String,
  receiptFooter: { type: String, default: 'Thank you for your order!' },
  receiptShowLogo: { type: Boolean, default: true },
  receiptShowVat: { type: Boolean, default: true },
  // Notification settings
  smsConfirmationEnabled: { type: Boolean, default: true },
  emailConfirmationEnabled: { type: Boolean, default: true },
  pushNotificationsEnabled: { type: Boolean, default: false },
  // Payment settings
  cashEnabled: { type: Boolean, default: true },
  cardEnabled: { type: Boolean, default: true },
  // Ordering settings  
  maxItemsPerOrder: { type: Number, default: 50 },
  allowSpecialInstructions: { type: Boolean, default: true },
  autoConfirmOrders: { type: Boolean, default: false },
  // Printer settings
  printerEnabled: { type: Boolean, default: false },
  printerHost: String,
  printerPort: { type: Number, default: 9100 },
  printKitchenTicket: { type: Boolean, default: true },
  printCustomerReceipt: { type: Boolean, default: true },
  // Website PWA CMS Settings
  storeName: { type: String, default: 'Rupeyal Express' },
  storePhone: { type: String, default: '01782 811112' },
  storeEmail: { type: String, default: 'orders@rupeyalexpress.co.uk' },
  storeAddress: { type: String, default: '123 High Street, Tunstall, Stoke-on-Trent, ST6 5EP' },
  storeOpenTime: { type: String, default: '16:00' },
  storeCloseTime: { type: String, default: '23:30' },
  storeIsOpen: { type: Boolean, default: true },
  deliveryFeePence: { type: Number, default: 250 },
  minDeliveryOrderPence: { type: Number, default: 1500 },
  freeDeliveryThresholdPence: { type: Number, default: 1500 },
  estimatedDeliveryMinutes: { type: Number, default: 45 },
  estimatedCollectionMinutes: { type: Number, default: 15 },
  pwaThemeColor: { type: String, default: '#f97316' },
  pwaBannerTitle: { type: String, default: 'Rupeyal Express' },
  pwaBannerSub: { type: String, default: 'Authentic Taste of Tunstall' },
  pwaBannerDescription: { type: String, default: "Indulge in Stoke's finest stonebaked pizzas, balti curries, and authentic flame-grilled kebabs. Freshly prepared to order." },
  pwaBannerImage: { type: String, default: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1600&auto=format&fit=crop' },
}, { timestamps: true });

export default mongoose.model('Setting', settingSchema);
