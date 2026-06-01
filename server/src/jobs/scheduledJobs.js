import cron from 'node-cron';
import { Product } from '../models/Product.js';
import { AuditLog } from '../models/AuditLog.js';

export function startJobs() {
  cron.schedule('0 7 * * *', async () => {
    const lowStock = await Product.find({ active: true, $expr: { $lte: ['$stockQuantity', '$reorderLevel'] } }).select('name sku stockQuantity reorderLevel');
    if (lowStock.length) {
      console.log(`Low stock alert: ${lowStock.length} products need attention`);
      await AuditLog.create({ action: 'LOW_STOCK_CRON_ALERT', entityType: 'Product', metadata: { count: lowStock.length, products: lowStock } });
    }
  });

  cron.schedule('*/10 * * * *', async () => {
    const now = new Date();
    const products = await Product.find({ 'scheduledPriceChanges.applied': false, 'scheduledPriceChanges.activateAt': { $lte: now } });
    for (const product of products) {
      for (const change of product.scheduledPriceChanges.filter((c) => !c.applied && c.activateAt <= now)) {
        product.priceHistory.push({ oldPricePence: product.pricePence, newPricePence: change.pricePence, reason: 'Scheduled price change' });
        product.pricePence = change.pricePence;
        change.applied = true;
      }
      await product.save();
    }
  });
}
