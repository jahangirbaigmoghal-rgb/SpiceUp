import Order from '../models/Order.js';
import Shift from '../models/Shift.js';
import VoiceCallLog from '../models/VoiceCallLog.js';
import AuditLog from '../models/AuditLog.js';

export async function getDashboardMetrics(req, res, next) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      tenant: req.tenantId,
      createdAt: { $gte: todayStart, $lte: todayEnd },
      status: { $ne: 'cancelled' },
    }).lean();

    let totalRevenuePence = 0;
    let cashSalesPence = 0;
    let cardSalesPence = 0;
    const channelSplit = { online: 0, 'pos-walkin': 0, 'pos-phone': 0, 'pos-dinein': 0, 'voice-agent': 0 };

    for (const order of orders) {
      totalRevenuePence += order.totalPence;
      channelSplit[order.channel] = (channelSplit[order.channel] || 0) + order.totalPence;

      for (const p of order.payments) {
        if (p.status === 'paid') {
          if (p.method === 'cash') {
            cashSalesPence += p.amountPence;
          } else {
            cardSalesPence += p.amountPence;
          }
        }
      }
    }

    const orderCount = orders.length;
    const averageTicketPence = orderCount > 0 ? Math.round(totalRevenuePence / orderCount) : 0;

    res.json({
      metrics: {
        orderCount,
        totalRevenuePence,
        cashSalesPence,
        cardSalesPence,
        averageTicketPence,
        channelSplit,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getSalesReport(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const aggregation = await Order.aggregate([
      {
        $match: {
          tenant: req.tenantId,
          createdAt: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalSalesPence: { $sum: '$totalPence' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ sales: aggregation });
  } catch (err) {
    next(err);
  }
}

export async function getZReport(req, res, next) {
  try {
    const { shiftId } = req.query;
    if (!shiftId) {
      return res.status(400).json({ error: 'shiftId is required' });
    }

    const shift = await Shift.findOne({ _id: shiftId, tenant: req.tenantId }).lean();
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    if (shift.status === 'open') {
      return res.status(400).json({ error: 'Cannot view Z-report for an open shift' });
    }

    res.json({ zReport: shift.zReport });
  } catch (err) {
    next(err);
  }
}

export async function getVatReport(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    const orders = await Order.find({
      tenant: req.tenantId,
      createdAt: { $gte: start, $lte: end },
      status: { $ne: 'cancelled' },
    }).lean();

    const vatRates = { 0: { netPence: 0, vatPence: 0, grossPence: 0 }, 5: { netPence: 0, vatPence: 0, grossPence: 0 }, 20: { netPence: 0, vatPence: 0, grossPence: 0 } };

    for (const order of orders) {
      if (order.vatBreakdown) {
        for (const rateKey of Object.keys(order.vatBreakdown)) {
          const b = order.vatBreakdown[rateKey];
          if (!vatRates[rateKey]) {
            vatRates[rateKey] = { rate: parseInt(rateKey, 10), netPence: 0, vatPence: 0, grossPence: 0 };
          }
          vatRates[rateKey].netPence += b.netPence || 0;
          vatRates[rateKey].vatPence += b.vatPence || 0;
          vatRates[rateKey].grossPence += b.grossPence || 0;
        }
      }
    }

    res.json({ vatReport: Object.values(vatRates) });
  } catch (err) {
    next(err);
  }
}

export async function getVoiceAgentMetrics(req, res, next) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const totalCalls = await VoiceCallLog.countDocuments({
      tenant: req.tenantId,
      createdAt: { $gte: todayStart },
    });

    const successfulOrdersCount = await Order.countDocuments({
      tenant: req.tenantId,
      channel: 'voice-agent',
      createdAt: { $gte: todayStart },
      status: { $ne: 'cancelled' },
    });

    const voiceOrders = await Order.find({
      tenant: req.tenantId,
      channel: 'voice-agent',
      createdAt: { $gte: todayStart },
      status: { $ne: 'cancelled' },
    }).lean();

    const revenuePence = voiceOrders.reduce((sum, o) => sum + o.totalPence, 0);

    const transferredCalls = await VoiceCallLog.countDocuments({
      tenant: req.tenantId,
      status: 'transferred',
      createdAt: { $gte: todayStart },
    });

    const conversionRate = totalCalls > 0 ? (successfulOrdersCount / totalCalls) * 100 : 0;
    const humanTransferRate = totalCalls > 0 ? (transferredCalls / totalCalls) * 100 : 0;

    res.json({
      metrics: {
        totalCalls,
        successfulOrdersCount,
        revenuePence,
        transferredCalls,
        conversionRate: Math.round(conversionRate * 10) / 10,
        humanTransferRate: Math.round(humanTransferRate * 10) / 10,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getAuditLogReport(req, res, next) {
  try {
    const { action, entity, limit } = req.query;
    const query = { tenant: req.tenantId };

    if (action) query.action = action;
    if (entity) query.entity = entity;

    const limitNum = limit ? parseInt(limit, 10) : 50;

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .populate('actor', 'name role');

    res.json({ logs });
  } catch (err) {
    next(err);
  }
}

export async function getVoiceCallLogs(req, res, next) {
  try {
    const { limit } = req.query;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    const logs = await VoiceCallLog.find({ tenant: req.tenantId })
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .populate('orderId', 'reference status totalPence');

    res.json({ logs });
  } catch (err) {
    next(err);
  }
}
