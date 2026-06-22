import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Shift from '../models/Shift.js';
import Order from '../models/Order.js';
import { env } from '../config/env.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProduction,
  signed: true,
  sameSite: env.isProduction ? 'none' : 'lax',
  maxAge: 8 * 60 * 60 * 1000, // 8 hours
};

/** Generate a JWT for a user ID. */
function generateToken(userId) {
  return jwt.sign({ userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({
      tenant: req.tenantId,
      username: username.toLowerCase().trim(),
    });

    if (!user || !user.isActive || !(await user.verifyPassword(password))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user._id.toString());
    res.cookie('accessToken', token, COOKIE_OPTIONS);

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    res.json({
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        tenant: user.tenant ? user.tenant.toString() : undefined,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function loginPin(req, res, next) {
  try {
    const { pin, terminalId } = req.body;
    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }

    // Find all active users in this tenant to verify PIN via bcrypt only.
    // Corrupted default-user PINs are repaired at boot by repairDefaultUserPins()
    // in seed_spiceup.js, so no in-request auth bypass is needed (or safe).
    const users = await User.find({ tenant: req.tenantId, isActive: true });
    let authenticatedUser = null;

    for (const u of users) {
      if (u.pin && (await u.verifyPin(pin))) {
        authenticatedUser = u;
        break;
      }
    }

    if (!authenticatedUser) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    const token = generateToken(authenticatedUser._id.toString());
    res.cookie('accessToken', token, COOKIE_OPTIONS);

    // Update terminal ID and last login
    authenticatedUser.lastLoginAt = new Date();
    if (terminalId) {
      authenticatedUser.terminalId = terminalId;
    }
    await authenticatedUser.save();

    res.json({
      user: {
        id: authenticatedUser._id,
        name: authenticatedUser.name,
        username: authenticatedUser.username,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        tenant: authenticatedUser.tenant ? authenticatedUser.tenant.toString() : undefined,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res) {
  res.clearCookie('accessToken');
  res.json({ ok: true, message: 'Logged out successfully' });
}

export async function me(req, res) {
  if (req.user) {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        username: req.user.username,
        role: req.user.role,
        tenant: req.user.tenant ? req.user.tenant.toString() : undefined,
      },
    });
  } else {
    res.json({ user: null });
  }
}

export async function verifyPin(req, res, next) {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }
    console.log(`[verifyPin] req.tenantId = ${req.tenantId}, pin = ${pin}`);

    const users = await User.find({
      tenant: req.tenantId,
      isActive: true,
      role: { $in: ['manager', 'admin', 'super_admin'] },
    });
    console.log(`[verifyPin] Found ${users.length} active managers/admins: ${users.map(u => u.username).join(', ')}`);

    let verifiedUser = null;
    for (const u of users) {
      const isMatch = u.pin && (await u.verifyPin(pin));
      console.log(`[verifyPin] Checking manager ${u.username}: matches = ${isMatch}`);
      if (isMatch) {
        verifiedUser = u;
        break;
      }
    }

    if (!verifiedUser) {
      console.log(`[verifyPin] Verification failed for manager PIN: ${pin}`);
      return res.status(403).json({ error: 'Verification failed — invalid manager PIN' });
    }

    res.json({
      ok: true,
      user: {
        id: verifiedUser._id,
        name: verifiedUser.name,
        role: verifiedUser.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function currentShift(req, res, next) {
  try {
    const shift = await Shift.findOne({
      tenant: req.tenantId,
      cashier: req.userId,
      status: 'open',
    }).lean();

    res.json({ shift: shift ?? null });
  } catch (err) {
    next(err);
  }
}

export async function openShift(req, res, next) {
  try {
    const { floatPence, terminalId } = req.body;
    if (typeof floatPence !== 'number' || floatPence < 0) {
      return res.status(400).json({ error: 'Valid opening float in pence is required' });
    }

    // Check if user already has an open shift
    const existing = await Shift.findOne({
      tenant: req.tenantId,
      cashier: req.userId,
      status: 'open',
    });

    if (existing) {
      return res.status(400).json({ error: 'You already have an open shift' });
    }

    const shift = await Shift.create({
      tenant: req.tenantId,
      cashier: req.userId,
      terminalId: terminalId || req.user.terminalId || 'TERM-01',
      openingFloatPence: floatPence,
      expectedCashPence: floatPence, // Expected cash starts with opening float
      status: 'open',
    });

    res.status(201).json({ shift });
  } catch (err) {
    next(err);
  }
}

export async function closeShift(req, res, next) {
  try {
    const { closingCashPence } = req.body;
    if (typeof closingCashPence !== 'number' || closingCashPence < 0) {
      return res.status(400).json({ error: 'Valid closing cash in pence is required' });
    }

    const shift = await Shift.findOne({
      tenant: req.tenantId,
      cashier: req.userId,
      status: 'open',
    });

    if (!shift) {
      return res.status(400).json({ error: 'No active open shift found for this user' });
    }

    // Calculate cash orders placed by this staff/terminal during this shift
    const cashOrders = await Order.find({
      tenant: req.tenantId,
      staffId: req.userId,
      createdAt: { $gte: shift.openedAt },
      status: { $ne: 'cancelled' },
      'payments.method': 'cash',
      'payments.status': 'paid',
    }).lean();

    const cashReceivedPence = cashOrders.reduce((sum, order) => {
      const cashPay = order.payments.find(p => p.method === 'cash' && p.status === 'paid');
      return sum + (cashPay ? cashPay.amountPence : 0);
    }, 0);

    const expectedCashPence = shift.openingFloatPence + cashReceivedPence;
    const cashVariancePence = closingCashPence - expectedCashPence;

    // Generate Z-Report snapshot
    const salesTotal = await Order.find({
      tenant: req.tenantId,
      staffId: req.userId,
      createdAt: { $gte: shift.openedAt },
      status: { $ne: 'cancelled' },
    }).lean();

    const channelTotals = {};
    const methodTotals = {};
    let totalSalesPence = 0;

    for (const order of salesTotal) {
      totalSalesPence += order.totalPence;
      channelTotals[order.channel] = (channelTotals[order.channel] || 0) + order.totalPence;
      for (const p of order.payments) {
        if (p.status === 'paid') {
          methodTotals[p.method] = (methodTotals[p.method] || 0) + p.amountPence;
        }
      }
    }

    const zReport = {
      openedAt: shift.openedAt,
      closedAt: new Date(),
      cashierName: req.user.name,
      terminalId: shift.terminalId,
      openingFloatPence: shift.openingFloatPence,
      closingCashPence,
      expectedCashPence,
      cashVariancePence,
      totalSalesPence,
      channelTotals,
      methodTotals,
      cashReceivedPence,
    };

    shift.closingCashPence = closingCashPence;
    shift.expectedCashPence = expectedCashPence;
    shift.cashVariancePence = cashVariancePence;
    shift.status = 'closed';
    shift.closedAt = new Date();
    shift.zReport = zReport;

    await shift.save();

    res.json({ shift });
  } catch (err) {
    next(err);
  }
}
