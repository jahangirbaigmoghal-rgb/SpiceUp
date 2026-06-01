import User from '../models/User.js';
import Customer from '../models/Customer.js';

export async function listUsers(req, res, next) {
  try {
    const users = await User.find({ tenant: req.tenantId })
      .select('-passwordHash -pin')
      .sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const { name, username, email, password, pin, role } = req.body;
    if (!name || !username) {
      return res.status(400).json({ error: 'Name and username are required' });
    }

    const existing = await User.findOne({
      tenant: req.tenantId,
      username: username.toLowerCase().trim(),
    });

    if (existing) {
      return res.status(409).json({ error: 'Username already exists for this tenant' });
    }

    let passwordHash = undefined;
    if (password) {
      passwordHash = await User.hashPassword(password);
    }

    let pinHash = undefined;
    if (pin) {
      pinHash = await User.hashPin(pin);
    }

    const user = await User.create({
      tenant: req.tenantId,
      name,
      username: username.toLowerCase().trim(),
      email,
      passwordHash,
      pin: pinHash,
      role: role || 'cashier',
      createdBy: req.userId,
    });

    const userResponse = user.toObject();
    delete userResponse.passwordHash;
    delete userResponse.pin;

    res.status(201).json({ user: userResponse });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, password, pin, role, isActive } = req.body;

    const user = await User.findOne({ _id: id, tenant: req.tenantId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;

    if (password) {
      user.passwordHash = await User.hashPassword(password);
    }

    if (pin) {
      user.pin = await User.hashPin(pin);
    }

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.passwordHash;
    delete userResponse.pin;

    res.json({ user: userResponse });
  } catch (err) {
    next(err);
  }
}

export async function listCustomers(req, res, next) {
  try {
    const customers = await Customer.find({ tenant: req.tenantId }).sort({ createdAt: -1 });
    res.json({ customers });
  } catch (err) {
    next(err);
  }
}

export async function anonymiseCustomer(req, res, next) {
  try {
    const { id } = req.params;
    const customer = await Customer.findOne({ _id: id, tenant: req.tenantId });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // GDPR anonymisation: strip all personal data but preserve record for reporting
    customer.name = `GDPR Anonymised User (${id})`;
    customer.email = `anonymised-${id}@gdpr-forgotten.co.uk`;
    customer.phone = '00000000000';
    customer.passwordHash = undefined;
    customer.addresses = [];
    customer.loyaltyPoints = 0;
    customer.stripeCustomerId = undefined;
    customer.oneSignalPlayerId = undefined;
    customer.notes = 'Account anonymised upon customer request.';

    await customer.save();

    res.json({ success: true, customer });
  } catch (err) {
    next(err);
  }
}
