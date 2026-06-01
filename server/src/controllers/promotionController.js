import Promotion from '../models/Promotion.js';
import Customer from '../models/Customer.js';

// ─── Promotions CRUD ─────────────────────────────────────────────────────────

export async function listPromotions(req, res, next) {
  try {
    const promotions = await Promotion.find({ tenant: req.tenantId }).sort({ createdAt: -1 });
    res.json({ promotions });
  } catch (err) {
    next(err);
  }
}

export async function createPromotion(req, res, next) {
  try {
    const { name, code, discountType, discountValue, startDate, endDate, minOrderSubtotalPence, isActive } = req.body;

    if (!name || !code || !discountType || typeof discountValue !== 'number') {
      return res.status(400).json({ error: 'Name, code, discountType, and discountValue are required' });
    }

    const promo = await Promotion.create({
      tenant: req.tenantId,
      name,
      code: code.toUpperCase().trim(),
      discountType,
      discountValue,
      startDate: startDate || new Date(),
      endDate: endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
      minOrderSubtotalPence: minOrderSubtotalPence || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({ promotion: promo });
  } catch (err) {
    next(err);
  }
}

export async function updatePromotion(req, res, next) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase().trim();
    }

    const promo = await Promotion.findOneAndUpdate(
      { _id: id, tenant: req.tenantId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!promo) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    res.json({ promotion: promo });
  } catch (err) {
    next(err);
  }
}

export async function deletePromotion(req, res, next) {
  try {
    const { id } = req.params;
    const promo = await Promotion.findOneAndDelete({ _id: id, tenant: req.tenantId });

    if (!promo) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    res.json({ success: true, message: 'Promotion deleted successfully' });
  } catch (err) {
    next(err);
  }
}

export async function validatePromoCode(req, res, next) {
  try {
    const { code, subtotalPence } = req.body;
    if (!code || typeof subtotalPence !== 'number') {
      return res.status(400).json({ error: 'Promo code and subtotal in pence are required' });
    }

    const promo = await Promotion.findOne({
      tenant: req.tenantId,
      code: code.toUpperCase().trim(),
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });

    if (!promo) {
      return res.json({ valid: false, message: 'Invalid or expired promotional code' });
    }

    if (subtotalPence < promo.minOrderSubtotalPence) {
      const remaining = promo.minOrderSubtotalPence - subtotalPence;
      return res.json({
        valid: false,
        message: `Add £${(remaining / 100).toFixed(2)} more to your basket to use this code (Min spend: £${(promo.minOrderSubtotalPence / 100).toFixed(2)})`,
      });
    }

    res.json({
      valid: true,
      promotion: {
        name: promo.name,
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Loyalty Engine ─────────────────────────────────────────────────────────

export async function getLoyaltyBalance(req, res, next) {
  try {
    const { customerId } = req.params;
    const customer = await Customer.findOne({ _id: customerId, tenant: req.tenantId }).select('loyaltyPoints loyaltyTier');

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ loyaltyPoints: customer.loyaltyPoints, loyaltyTier: customer.loyaltyTier });
  } catch (err) {
    next(err);
  }
}

export async function awardLoyaltyPoints(req, res, next) {
  try {
    const { customerId } = req.params;
    const { points } = req.body;

    if (typeof points !== 'number' || points <= 0) {
      return res.status(400).json({ error: 'Valid points count is required' });
    }

    const customer = await Customer.findOne({ _id: customerId, tenant: req.tenantId });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    customer.loyaltyPoints += points;

    // Advance loyalty tiers
    if (customer.loyaltyPoints >= 1000) {
      customer.loyaltyTier = 'gold';
    } else if (customer.loyaltyPoints >= 400) {
      customer.loyaltyTier = 'silver';
    } else {
      customer.loyaltyTier = 'bronze';
    }

    await customer.save();

    res.json({ success: true, points: customer.loyaltyPoints, tier: customer.loyaltyTier });
  } catch (err) {
    next(err);
  }
}

export async function redeemLoyaltyPoints(req, res, next) {
  try {
    const { customerId } = req.params;
    const { points } = req.body;

    if (typeof points !== 'number' || points <= 0) {
      return res.status(400).json({ error: 'Valid points count is required' });
    }

    const customer = await Customer.findOne({ _id: customerId, tenant: req.tenantId });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer.loyaltyPoints < points) {
      return res.status(400).json({ error: 'Insufficient loyalty points' });
    }

    customer.loyaltyPoints -= points;
    await customer.save();

    res.json({ success: true, remainingPoints: customer.loyaltyPoints });
  } catch (err) {
    next(err);
  }
}
