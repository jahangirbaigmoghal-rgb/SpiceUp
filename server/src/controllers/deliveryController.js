import DeliveryZone from '../models/DeliveryZone.js';

export async function validatePostcodeZone(req, res, next) {
  try {
    const { postcode } = req.body;
    if (!postcode) {
      return res.status(400).json({ error: 'Postcode is required' });
    }

    // Normalise postcode: strip spaces, convert to uppercase, extract outward code
    const cleaned = postcode.replace(/\s+/g, '').toUpperCase();
    if (cleaned.length < 3) {
      return res.status(400).json({ error: 'Invalid postcode format' });
    }

    // Extract outward code: e.g. 'WN1 1AA' -> 'WN1', or 'WN11AA' -> 'WN1' (last 3 chars are inward)
    const outwardCode = cleaned.slice(0, -3);

    const zone = await DeliveryZone.findOne({
      tenant: req.tenantId,
      postcodePrefix: outwardCode,
      isActive: true,
    });

    if (!zone) {
      return res.json({ valid: false, message: `We do not deliver to ${outwardCode}.` });
    }

    res.json({
      valid: true,
      zone: {
        id: zone._id,
        name: zone.name,
        deliveryChargePence: zone.deliveryChargePence,
        minimumOrderPence: zone.minimumOrderPence,
        estimatedDeliveryMinutes: zone.estimatedDeliveryMinutes,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listDeliveryZones(req, res, next) {
  try {
    const zones = await DeliveryZone.find({ tenant: req.tenantId }).sort({ name: 1 });
    res.json({ zones });
  } catch (err) {
    next(err);
  }
}

export async function createDeliveryZone(req, res, next) {
  try {
    const { name, postcodePrefix, radiusMiles, storeCoords, deliveryChargePence, minimumOrderPence, estimatedDeliveryMinutes } = req.body;

    if (!name || !postcodePrefix || !Array.isArray(postcodePrefix) || postcodePrefix.length === 0) {
      return res.status(400).json({ error: 'Name and at least one postcode prefix are required' });
    }

    const uppercasePrefixes = postcodePrefix.map(p => p.trim().toUpperCase());

    const zone = await DeliveryZone.create({
      tenant: req.tenantId,
      name,
      postcodePrefix: uppercasePrefixes,
      radiusMiles,
      storeCoords,
      deliveryChargePence: deliveryChargePence || 0,
      minimumOrderPence: minimumOrderPence || 1000,
      estimatedDeliveryMinutes: estimatedDeliveryMinutes || 45,
    });

    res.status(201).json({ zone });
  } catch (err) {
    next(err);
  }
}

export async function updateDeliveryZone(req, res, next) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.postcodePrefix && Array.isArray(updateData.postcodePrefix)) {
      updateData.postcodePrefix = updateData.postcodePrefix.map(p => p.trim().toUpperCase());
    }

    const zone = await DeliveryZone.findOneAndUpdate(
      { _id: id, tenant: req.tenantId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!zone) {
      return res.status(404).json({ error: 'Delivery zone not found' });
    }

    res.json({ zone });
  } catch (err) {
    next(err);
  }
}

export async function deleteDeliveryZone(req, res, next) {
  try {
    const { id } = req.params;
    const zone = await DeliveryZone.findOneAndDelete({ _id: id, tenant: req.tenantId });

    if (!zone) {
      return res.status(404).json({ error: 'Delivery zone not found' });
    }

    res.json({ success: true, message: 'Delivery zone deleted' });
  } catch (err) {
    next(err);
  }
}
