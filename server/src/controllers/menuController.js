import mongoose from 'mongoose';
import Category from '../models/Category.js';
import MenuItem from '../models/MenuItem.js';
import ModifierGroup from '../models/ModifierGroup.js';
import Component from '../models/Component.js';
import Label from '../models/Label.js';
import Department from '../models/Department.js';
import ManualProduct from '../models/ManualProduct.js';
import ShortHand from '../models/ShortHand.js';
import ProductTime from '../models/ProductTime.js';
import Variation from '../models/Variation.js';
import Bundle from '../models/Bundle.js';
import { emitMenuAvailabilityChange, emitMenuChanged } from '../config/socket.js';
import { audit } from '../utils/audit.js';

function isNowInSchedule(schedule, now = new Date()) {
  if (!schedule || !schedule.startTime || !schedule.endTime) return true;
  if (Array.isArray(schedule.days) && schedule.days.length > 0 && !schedule.days.includes(now.getDay())) {
    return false;
  }
  const current = now.getHours() * 60 + now.getMinutes();
  const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
  const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
  const start = (startHour || 0) * 60 + (startMinute || 0);
  const end = (endHour || 0) * 60 + (endMinute || 0);
  return start <= end ? current >= start && current <= end : current >= start || current <= end;
}

function normalizeChannel(channel = 'pos') {
  if (channel === 'online') return 'website';
  if (channel === 'voice-agent') return 'voice';
  return ['pos', 'website', 'mobile', 'voice'].includes(channel) ? channel : 'pos';
}

function normalizeModifierOption(option, group = {}) {
  const plain = option.toObject ? option.toObject({ virtuals: true }) : option;
  const priceDeltaPence = group.samePrice ? (group.samePricePence || 0) : (plain.priceDeltaPence || 0);
  return { ...plain, priceDeltaPence, pricePence: priceDeltaPence };
}

function normalizeModifierGroup(group, assignment = null, channel = 'pos') {
  if (!group) return null;
  const plain = group.toObject ? group.toObject({ virtuals: true }) : group;
  if (plain.isActive === false) return null;
  if (channel === 'website' && plain.showOnWebsite === false) return null;
  if (channel === 'voice' && plain.showOnVoice === false) return null;
  if (channel === 'pos' && plain.showOnPos === false) return null;
  const requiredOverride = assignment?.requiredOverride;
  const type = requiredOverride === true ? 'required' : requiredOverride === false ? 'optional' : plain.type;
  const minSelections = requiredOverride === true && !plain.minSelections ? 1 : (plain.minSelections ?? 0);
  const allowedLabels = plain.staticLabelsEnabled === false ? [] : (plain.allowedLabelIds || []);
  return {
    ...plain,
    type,
    minSelections,
    minSelection: minSelections,
    maxSelections: plain.maxSelections ?? plain.maxSelection ?? 1,
    maxSelection: plain.maxSelections ?? plain.maxSelection ?? 1,
    labelsEnabled: plain.staticLabelsEnabled !== false,
    allowedLabelIds: allowedLabels,
    allowedLabels,
    options: (plain.options || [])
      .filter(option => option.isAvailable !== false)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map(option => normalizeModifierOption(option, plain)),
  };
}

function normalizeMenuItem(item, channel = 'pos') {
  const menuSurface = normalizeChannel(channel);
  const plain = item.toObject ? item.toObject({ virtuals: true }) : item;
  const category = plain.category || null;
  const inheritedDepartment = plain.department || category?.department || null;
  const effectiveKitchenStationId =
    (plain.kitchenStationId && plain.kitchenStationId !== 'OTHER' ? plain.kitchenStationId : null) ||
    inheritedDepartment?.kitchenStationId ||
    'OTHER';
  const assignments = (plain.groupAssignments || [])
    .filter(assignment => assignment.isEnabled !== false)
    .filter(assignment => assignment.group?.isActive !== false)
    .filter(assignment => {
      if (menuSurface === 'website') return assignment.showOnWebsite !== false;
      if (menuSurface === 'voice') return assignment.showOnVoice !== false;
      return assignment.showOnPos !== false;
    })
    .sort((a, b) => {
      const key = menuSurface === 'website' ? 'websiteOrder' : menuSurface === 'voice' ? 'voiceOrder' : 'posOrder';
      const aOrder = a[key] || 0;
      const bOrder = b[key] || 0;
      return aOrder - bOrder;
    });
  const groupsFromAssignments = assignments.map(a => normalizeModifierGroup(a.group, a, menuSurface)).filter(Boolean);
  const fallbackGroups = (plain.modifierGroups || []).map(g => normalizeModifierGroup(g, null, menuSurface)).filter(Boolean);
  return {
    ...plain,
    category,
    department: plain.department || null,
    effectiveDepartment: inheritedDepartment,
    effectiveKitchenStationId,
    kitchenStationId: effectiveKitchenStationId,
    pricePence: plain.pricePence ?? plain.basePricePence,
    shortName: plain.shortName || plain.menuCode || plain.name,
    isAvailableNow:
      plain.isAvailable !== false &&
      plain.holdStatus !== true &&
      isNowInSchedule(plain.availabilitySchedule) &&
      isNowInSchedule(plain.productTime) &&
      isNowInSchedule(category?.availabilitySchedule),
    variations: (plain.variations || [])
      .filter(variation => variation.isActive !== false)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || (a.priceDeltaPence || 0) - (b.priceDeltaPence || 0)),
    modifierGroups: groupsFromAssignments.length > 0 ? groupsFromAssignments : fallbackGroups,
  };
}

function buildDefaultAssignments(modifierGroups = []) {
  return modifierGroups.map((group, index) => ({
    group,
    isEnabled: true,
    requiredOverride: null,
    posOrder: index,
    websiteOrder: index,
    voiceOrder: index,
    showOnPos: true,
    showOnWebsite: true,
    showOnVoice: true,
  }));
}

function broadcastMenuChanged(req, entity, action, extra = {}) {
  emitMenuChanged(req.tenantId, { entity, action, ...extra });
}

export async function getCategories(req, res, next) {
  try {
    const channel = normalizeChannel(req.query.channel);
    const query = { tenant: req.tenantId };
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    } else if (req.query.channel) {
      query.isActive = true;
      query[`channels.${channel}`] = { $ne: false };
    }
    const categories = await Category.find(query)
      .populate('parent')
      .populate('department')
      .sort({ displayOrder: 1 });

    let visibleCategories = req.query.channel
      ? categories.filter(category => isNowInSchedule(category.availabilitySchedule))
      : categories;

    // When filtering by channel: also exclude sub-categories whose parent is inactive/hidden.
    // e.g. if "CURRIES" is disabled, "BALTI DISHES" (child of CURRIES) should also be hidden.
    if (req.query.channel) {
      // Build a Set of active top-level category IDs
      const activeTopLevelIds = new Set(
        visibleCategories
          .filter(c => !c.parent)
          .map(c => c._id.toString())
      );
      visibleCategories = visibleCategories.filter(category => {
        if (!category.parent) return true; // top-level: already filtered above
        // Sub-category: only include if its parent is in the active top-level set
        const parentId = typeof category.parent === 'object'
          ? (category.parent._id || category.parent).toString()
          : category.parent.toString();
        return activeTopLevelIds.has(parentId);
      });
    }

    res.json({ categories: visibleCategories });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req, res, next) {
  try {
    const { name, slug, description, imageUrl, displayOrder, availabilitySchedule, channels, color, parent, department, backgroundColor, textColor } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const category = await Category.create({
      tenant: req.tenantId,
      name,
      slug: generatedSlug,
      description,
      imageUrl,
      displayOrder: displayOrder || 0,
      availabilitySchedule,
      channels: channels || {},
      color,
      parent: parent || null,
      department: department || null,
      backgroundColor: backgroundColor || '#f59e0b',
      textColor: textColor || '#ffffff',
    });

    broadcastMenuChanged(req, 'category', 'created', { id: category._id?.toString() });
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const before = await Category.findOne({ _id: id, tenant: req.tenantId });
    const category = await Category.findOneAndUpdate(
      { _id: id, tenant: req.tenantId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await audit(req, 'update_category', 'Category', category._id, { before, after: category });

    broadcastMenuChanged(req, 'category', 'updated', { id: category._id?.toString() });
    res.json({ category });
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;

    // Check if there are menu items inside this category
    const hasItems = await MenuItem.exists({ tenant: req.tenantId, category: id });
    if (hasItems) {
      return res.status(400).json({ error: 'Cannot delete category containing menu items' });
    }

    const category = await Category.findOneAndDelete({ _id: id, tenant: req.tenantId });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    broadcastMenuChanged(req, 'category', 'deleted', { id });
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// ΓöÇΓöÇΓöÇ Menu Items ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export async function getMenuItems(req, res, next) {
  try {
    const { categoryId, isAvailable, search, isFeatured, channel } = req.query;
    const menuSurface = normalizeChannel(channel);
    const query = { tenant: req.tenantId };

    if (categoryId) query.category = categoryId;
    if (isFeatured !== undefined) query.isFeatured = isFeatured === 'true';
    if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true';
    if (channel && ['pos', 'website', 'mobile', 'voice', 'online', 'voice-agent'].includes(channel)) {
      query[`channels.${menuSurface}`] = { $ne: false };
      query.publishStatus = 'published';
      query.isAvailable = true;
      query.holdStatus = { $ne: true };
    }

    if (search) {
      query.$text = { $search: search };
    }

    const items = await MenuItem.find(query)
      .populate({ path: 'category', populate: [{ path: 'department' }, { path: 'parent' }] })
      .populate('department')
      .populate({ path: 'modifierGroups', populate: [{ path: 'allowedLabelIds' }, { path: 'options.component' }] })
      .populate({ path: 'groupAssignments.group', populate: [{ path: 'allowedLabelIds' }, { path: 'options.component' }] })
      .populate('productTime')
      .populate('variations')
      .sort({ sortOrder: 1 });

    const normalized = items
      .map(item => normalizeMenuItem(item, menuSurface))
      .filter(item => {
        if (!channel) return true;
        if (!item.isAvailableNow) return false;
        if (item.category?.isActive === false) return false;
        if (item.category?.channels?.[menuSurface] === false) return false;
        // Also exclude items whose category's parent is inactive (e.g. BALTI DISHES under disabled CURRIES)
        if (item.category?.parent?.isActive === false) return false;
        if (item.category?.parent?.channels?.[menuSurface] === false) return false;
        return true;
      });

    res.json({ items: normalized });
  } catch (err) {
    next(err);
  }
}

export async function getMenuItem(req, res, next) {
  try {
    const { id } = req.params;
    const item = await MenuItem.findOne({ _id: id, tenant: req.tenantId })
      .populate({ path: 'category', populate: [{ path: 'department' }, { path: 'parent' }] })
      .populate('department')
      .populate({ path: 'modifierGroups', populate: [{ path: 'allowedLabelIds' }, { path: 'options.component' }] })
      .populate({ path: 'groupAssignments.group', populate: [{ path: 'allowedLabelIds' }, { path: 'options.component' }] })
      .populate('productTime')
      .populate('variations');

    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json({ item: normalizeMenuItem(item, req.query.channel || 'pos') });
  } catch (err) {
    next(err);
  }
}

export async function createMenuItem(req, res, next) {
  try {
    const {
      name,
      shortName,
      kitchenName,
      menuCode,
      description,
      category,
      department,
      basePricePence,
      images,
      dietaryTags,
      allergens,
      calories,
      vatRate,
      modifierGroups,
      groupAssignments,
      channels,
      publishStatus,
      isAvailable,
      holdStatus,
      isFeatured,
      productTime,
      availabilitySchedule,
      sortOrder,
      backgroundColor,
      textColor,
      printOption,
      shorthand,
      isManual,
    } = req.body;

    if (!name || !category || typeof basePricePence !== 'number') {
      return res.status(400).json({ error: 'Name, category, and base price in pence are required' });
    }

    const item = await MenuItem.create({
      tenant: req.tenantId,
      name,
      shortName,
      kitchenName,
      menuCode,
      description,
      category,
      department: department || null,
      basePricePence,
      images,
      dietaryTags,
      allergens,
      calories,
      vatRate: vatRate !== undefined ? vatRate : 20,
      modifierGroups,
      groupAssignments: Array.isArray(groupAssignments)
        ? groupAssignments
        : buildDefaultAssignments(modifierGroups || []),
      channels: channels || {},
      publishStatus: publishStatus || 'published',
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      holdStatus: holdStatus !== undefined ? holdStatus : false,
      isFeatured: isFeatured !== undefined ? isFeatured : false,
      productTime: productTime || null,
      availabilitySchedule,
      sortOrder: sortOrder || 0,
      backgroundColor,
      textColor,
      printOption,
      shorthand,
      isManual,
    });

    await audit(req, 'create_menu_item', 'MenuItem', item._id, { after: item });
    broadcastMenuChanged(req, 'product', 'created', { id: item._id?.toString() });
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
}

export async function updateMenuItem(req, res, next) {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    if (Array.isArray(updateData.modifierGroups) && !Array.isArray(updateData.groupAssignments)) {
      updateData.groupAssignments = buildDefaultAssignments(updateData.modifierGroups);
    }

    const before = await MenuItem.findOne({ _id: id, tenant: req.tenantId });
    if (!before) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const item = await MenuItem.findOneAndUpdate(
      { _id: id, tenant: req.tenantId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await audit(req, 'update_menu_item', 'MenuItem', item._id, { before, after: item });
    broadcastMenuChanged(req, 'product', 'updated', { id: item._id?.toString() });
    res.json({ item });
  } catch (err) {
    next(err);
  }
}

export async function deleteMenuItem(req, res, next) {
  try {
    const { id } = req.params;
    const item = await MenuItem.findOneAndDelete({ _id: id, tenant: req.tenantId });

    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await audit(req, 'delete_menu_item', 'MenuItem', id, { before: item });
    broadcastMenuChanged(req, 'product', 'deleted', { id });
    res.json({ success: true, message: 'Menu item deleted' });
  } catch (err) {
    next(err);
  }
}

export async function toggleAvailability(req, res, next) {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({ error: 'isAvailable must be a boolean' });
    }

    const item = await MenuItem.findOneAndUpdate(
      { _id: id, tenant: req.tenantId },
      { isAvailable },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Broadcast menu availability change in real-time
    emitMenuAvailabilityChange(req.tenantId, id, isAvailable);
    broadcastMenuChanged(req, 'product-availability', 'updated', { id, isAvailable });

    res.json({ item });
  } catch (err) {
    next(err);
  }
}

export async function bulkToggleAvailability(req, res, next) {
  try {
    const { itemIds, isAvailable } = req.body;

    if (!Array.isArray(itemIds) || typeof isAvailable !== 'boolean') {
      return res.status(400).json({ error: 'itemIds (array) and isAvailable (boolean) are required' });
    }

    await MenuItem.updateMany(
      { _id: { $in: itemIds }, tenant: req.tenantId },
      { isAvailable }
    );

    // Broadcast change for each item
    for (const id of itemIds) {
      emitMenuAvailabilityChange(req.tenantId, id, isAvailable);
    }
    broadcastMenuChanged(req, 'product-availability', 'bulk-updated', { ids: itemIds, isAvailable });

    res.json({ success: true, count: itemIds.length });
  } catch (err) {
    next(err);
  }
}

// ΓöÇΓöÇΓöÇ Modifier Groups ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export async function getModifierGroups(req, res, next) {
  try {
    const query = { tenant: req.tenantId };
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }
    const modifiers = await ModifierGroup.find(query)
      .populate('allowedLabelIds')
      .populate('options.component')
      .sort({ sortOrder: 1, createdAt: -1 });
    res.json({ modifiers, modifierGroups: modifiers });
  } catch (err) {
    next(err);
  }
}

export async function createModifierGroup(req, res, next) {
  try {
    const {
      name,
      displayName,
      dashboardHeading,
      staticLabelsEnabled,
      allowedLabelIds,
      samePrice,
      samePricePence,
      sortOrder,
      showOnPos,
      showOnWebsite,
      showOnVoice,
      type,
      selectionType,
      minSelections,
      maxSelections,
      options
    } = req.body;

    if (!name || !options || !Array.isArray(options)) {
      return res.status(400).json({ error: 'Name and options array are required' });
    }

    const group = await ModifierGroup.create({
      tenant: req.tenantId,
      name,
      displayName,
      dashboardHeading,
      staticLabelsEnabled: staticLabelsEnabled !== undefined ? staticLabelsEnabled : true,
      allowedLabelIds: Array.isArray(allowedLabelIds) ? allowedLabelIds : [],
      samePrice: samePrice !== undefined ? samePrice : false,
      samePricePence: samePricePence || 0,
      sortOrder: sortOrder || 0,
      showOnPos: showOnPos !== undefined ? showOnPos : true,
      showOnWebsite: showOnWebsite !== undefined ? showOnWebsite : true,
      showOnVoice: showOnVoice !== undefined ? showOnVoice : true,
      type: type || 'optional',
      selectionType: selectionType || 'single',
      minSelections: minSelections || 0,
      maxSelections: maxSelections || 1,
      options,
    });

    broadcastMenuChanged(req, 'group', 'created', { id: group._id?.toString() });
    res.status(201).json({ modifierGroup: group });
  } catch (err) {
    next(err);
  }
}

export async function updateModifierGroup(req, res, next) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const group = await ModifierGroup.findOneAndUpdate(
      { _id: id, tenant: req.tenantId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!group) {
      return res.status(404).json({ error: 'Modifier group not found' });
    }

    broadcastMenuChanged(req, 'group', 'updated', { id: group._id?.toString() });
    res.json({ modifierGroup: group });
  } catch (err) {
    next(err);
  }
}

export async function deleteModifierGroup(req, res, next) {
  try {
    const { id } = req.params;

    // Check if any MenuItem references this ModifierGroup
    const referenced = await MenuItem.exists({
      tenant: req.tenantId,
      $or: [{ modifierGroups: id }, { 'groupAssignments.group': id }],
    });
    if (referenced) {
      return res.status(400).json({ error: 'Cannot delete modifier group that is attached to menu items' });
    }

    const group = await ModifierGroup.findOneAndDelete({ _id: id, tenant: req.tenantId });
    if (!group) {
      return res.status(404).json({ error: 'Modifier group not found' });
    }

    broadcastMenuChanged(req, 'group', 'deleted', { id });
    res.json({ success: true, message: 'Modifier group deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// ΓöÇΓöÇΓöÇ Components ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export async function getComponents(req, res, next) {
  try {
    const components = await Component.find({ tenant: req.tenantId }).sort({ sortOrder: 1, name: 1 });
    res.json({ components });
  } catch (err) {
    next(err);
  }
}

export async function createComponent(req, res, next) {
  try {
    const component = await Component.create({ tenant: req.tenantId, ...req.body });
    broadcastMenuChanged(req, 'component', 'created', { id: component._id?.toString() });
    res.status(201).json({ component });
  } catch (err) {
    next(err);
  }
}

export async function updateComponent(req, res, next) {
  try {
    const { id } = req.params;
    const component = await Component.findOneAndUpdate(
      { _id: id, tenant: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!component) return res.status(404).json({ error: 'Component not found' });
    broadcastMenuChanged(req, 'component', 'updated', { id: component._id?.toString() });
    res.json({ component });
  } catch (err) {
    next(err);
  }
}

export async function deleteComponent(req, res, next) {
  try {
    const { id } = req.params;
    const referenced = await ModifierGroup.exists({ tenant: req.tenantId, 'options.component': id });
    if (referenced) {
      return res.status(400).json({ error: 'Cannot delete component linked in modifier groups' });
    }
    const component = await Component.findOneAndDelete({ _id: id, tenant: req.tenantId });
    if (!component) return res.status(404).json({ error: 'Component not found' });
    broadcastMenuChanged(req, 'component', 'deleted', { id });
    res.json({ success: true, message: 'Component deleted' });
  } catch (err) {
    next(err);
  }
}

// ΓöÇΓöÇΓöÇ Labels ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export async function getLabels(req, res, next) {
  try {
    const labels = await Label.find({ tenant: req.tenantId }).sort({ sortOrder: 1, name: 1 });
    res.json({ labels });
  } catch (err) {
    next(err);
  }
}

export async function createLabel(req, res, next) {
  try {
    const label = await Label.create({ tenant: req.tenantId, ...req.body });
    broadcastMenuChanged(req, 'label', 'created', { id: label._id?.toString() });
    res.status(201).json({ label });
  } catch (err) {
    next(err);
  }
}

export async function updateLabel(req, res, next) {
  try {
    const { id } = req.params;
    const label = await Label.findOneAndUpdate(
      { _id: id, tenant: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!label) return res.status(404).json({ error: 'Label not found' });
    broadcastMenuChanged(req, 'label', 'updated', { id: label._id?.toString() });
    res.json({ label });
  } catch (err) {
    next(err);
  }
}

export async function deleteLabel(req, res, next) {
  try {
    const { id } = req.params;
    const referenced = await ModifierGroup.exists({ tenant: req.tenantId, allowedLabelIds: id });
    if (referenced) {
      return res.status(400).json({ error: 'Cannot delete label linked to modifier groups' });
    }
    const label = await Label.findOneAndDelete({ _id: id, tenant: req.tenantId });
    if (!label) return res.status(404).json({ error: 'Label not found' });
    broadcastMenuChanged(req, 'label', 'deleted', { id });
    res.json({ success: true, message: 'Label deleted' });
  } catch (err) {
    next(err);
  }
}

// ΓöÇΓöÇΓöÇ Departments ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export async function getDepartments(req, res, next) {
  try {
    const query = { tenant: req.tenantId };
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }
    const departments = await Department.find(query).sort({ sortOrder: 1, name: 1 });
    res.json({ departments });
  } catch (err) {
    next(err);
  }
}

export async function createDepartment(req, res, next) {
  try {
    const department = await Department.create({ tenant: req.tenantId, ...req.body });
    broadcastMenuChanged(req, 'department', 'created', { id: department._id?.toString() });
    res.status(201).json({ department });
  } catch (err) {
    next(err);
  }
}

export async function updateDepartment(req, res, next) {
  try {
    const { id } = req.params;
    const department = await Department.findOneAndUpdate(
      { _id: id, tenant: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!department) return res.status(404).json({ error: 'Department not found' });
    broadcastMenuChanged(req, 'department', 'updated', { id: department._id?.toString() });
    res.json({ department });
  } catch (err) {
    next(err);
  }
}

export async function deleteDepartment(req, res, next) {
  try {
    const { id } = req.params;
    const referencedByCategory = await Category.exists({ tenant: req.tenantId, department: id });
    const referencedByProduct = await MenuItem.exists({ tenant: req.tenantId, department: id });
    if (referencedByCategory || referencedByProduct) {
      return res.status(400).json({ error: 'Cannot delete department linked to categories or products' });
    }
    const department = await Department.findOneAndDelete({ _id: id, tenant: req.tenantId });
    if (!department) return res.status(404).json({ error: 'Department not found' });
    broadcastMenuChanged(req, 'department', 'deleted', { id });
    res.json({ success: true, message: 'Department deleted' });
  } catch (err) {
    next(err);
  }
}

// ΓöÇΓöÇΓöÇ Manual Products ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export async function getManualProducts(req, res, next) {
  try {
    const query = { tenant: req.tenantId };
    const channel = normalizeChannel(req.query.channel);
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }
    if (req.query.channel) {
      query.isActive = true;
      query[`channels.${channel}`] = { $ne: false };
    }
    const manualProducts = await ManualProduct.find(query)
      .populate('category')
      .populate('department')
      .sort({ sortOrder: 1, name: 1 });
    res.json({ manualProducts });
  } catch (err) {
    next(err);
  }
}

export async function createManualProduct(req, res, next) {
  try {
    const manualProduct = await ManualProduct.create({ tenant: req.tenantId, ...req.body });
    await audit(req, 'create_manual_product', 'ManualProduct', manualProduct._id, { after: manualProduct });
    broadcastMenuChanged(req, 'manual-product', 'created', { id: manualProduct._id?.toString() });
    res.status(201).json({ manualProduct });
  } catch (err) {
    next(err);
  }
}

export async function updateManualProduct(req, res, next) {
  try {
    const { id } = req.params;
    const before = await ManualProduct.findOne({ _id: id, tenant: req.tenantId });
    if (!before) return res.status(404).json({ error: 'Manual product not found' });

    const manualProduct = await ManualProduct.findOneAndUpdate(
      { _id: id, tenant: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!manualProduct) return res.status(404).json({ error: 'Manual product not found' });

    await audit(req, 'update_manual_product', 'ManualProduct', manualProduct._id, { before, after: manualProduct });
    broadcastMenuChanged(req, 'manual-product', 'updated', { id: manualProduct._id?.toString() });
    res.json({ manualProduct });
  } catch (err) {
    next(err);
  }
}

export async function deleteManualProduct(req, res, next) {
  try {
    const { id } = req.params;
    const manualProduct = await ManualProduct.findOneAndDelete({ _id: id, tenant: req.tenantId });
    if (!manualProduct) return res.status(404).json({ error: 'Manual product not found' });

    await audit(req, 'delete_manual_product', 'ManualProduct', id, { before: manualProduct });
    broadcastMenuChanged(req, 'manual-product', 'deleted', { id });
    res.json({ success: true, message: 'Manual product deleted' });
  } catch (err) {
    next(err);
  }
}

// ΓöÇΓöÇΓöÇ Short Hands ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export async function getShortHands(req, res, next) {
  try {
    const shorthands = await ShortHand.find({ tenant: req.tenantId }).populate('menuItem').sort({ shorthandCode: 1 });
    res.json({ shorthands });
  } catch (err) {
    next(err);
  }
}

export async function createShortHand(req, res, next) {
  try {
    const shorthand = await ShortHand.create({ tenant: req.tenantId, ...req.body });
    broadcastMenuChanged(req, 'shorthand', 'created', { id: shorthand._id?.toString() });
    res.status(201).json({ shorthand });
  } catch (err) {
    next(err);
  }
}

export async function updateShortHand(req, res, next) {
  try {
    const { id } = req.params;
    const shorthand = await ShortHand.findOneAndUpdate(
      { _id: id, tenant: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!shorthand) return res.status(404).json({ error: 'ShortHand not found' });
    broadcastMenuChanged(req, 'shorthand', 'updated', { id: shorthand._id?.toString() });
    res.json({ shorthand });
  } catch (err) {
    next(err);
  }
}

export async function deleteShortHand(req, res, next) {
  try {
    const { id } = req.params;
    const shorthand = await ShortHand.findOneAndDelete({ _id: id, tenant: req.tenantId });
    if (!shorthand) return res.status(404).json({ error: 'ShortHand not found' });
    broadcastMenuChanged(req, 'shorthand', 'deleted', { id });
    res.json({ success: true, message: 'ShortHand deleted' });
  } catch (err) {
    next(err);
  }
}

// ΓöÇΓöÇΓöÇ Product Times ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export async function getProductTimes(req, res, next) {
  try {
    const productTimes = await ProductTime.find({ tenant: req.tenantId }).sort({ name: 1 });
    res.json({ productTimes });
  } catch (err) {
    next(err);
  }
}

export async function createProductTime(req, res, next) {
  try {
    const productTime = await ProductTime.create({ tenant: req.tenantId, ...req.body });
    broadcastMenuChanged(req, 'product-time', 'created', { id: productTime._id?.toString() });
    res.status(201).json({ productTime });
  } catch (err) {
    next(err);
  }
}

export async function updateProductTime(req, res, next) {
  try {
    const { id } = req.params;
    const productTime = await ProductTime.findOneAndUpdate(
      { _id: id, tenant: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!productTime) return res.status(404).json({ error: 'ProductTime not found' });
    broadcastMenuChanged(req, 'product-time', 'updated', { id: productTime._id?.toString() });
    res.json({ productTime });
  } catch (err) {
    next(err);
  }
}

export async function deleteProductTime(req, res, next) {
  try {
    const { id } = req.params;
    const productTime = await ProductTime.findOneAndDelete({ _id: id, tenant: req.tenantId });
    if (!productTime) return res.status(404).json({ error: 'ProductTime not found' });
    broadcastMenuChanged(req, 'product-time', 'deleted', { id });
    res.json({ success: true, message: 'ProductTime deleted' });
  } catch (err) {
    next(err);
  }
}

// ΓöÇΓöÇΓöÇ Variations ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export async function getVariations(req, res, next) {
  try {
    const { menuItemId, isActive } = req.query;
    const query = { tenant: req.tenantId };
    if (menuItemId) query.menuItem = menuItemId;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const variations = await Variation.find(query).sort({ sortOrder: 1, priceDeltaPence: 1 });
    res.json({ variations });
  } catch (err) {
    next(err);
  }
}

export async function createVariation(req, res, next) {
  try {
    const variation = await Variation.create({ tenant: req.tenantId, ...req.body });
    await audit(req, 'create_variation', 'Variation', variation._id, { after: variation });
    broadcastMenuChanged(req, 'variation', 'created', { id: variation._id?.toString() });
    res.status(201).json({ variation });
  } catch (err) {
    next(err);
  }
}

export async function updateVariation(req, res, next) {
  try {
    const { id } = req.params;
    const before = await Variation.findOne({ _id: id, tenant: req.tenantId });
    if (!before) return res.status(404).json({ error: 'Variation not found' });

    const variation = await Variation.findOneAndUpdate(
      { _id: id, tenant: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!variation) return res.status(404).json({ error: 'Variation not found' });

    await audit(req, 'update_variation', 'Variation', variation._id, { before, after: variation });
    broadcastMenuChanged(req, 'variation', 'updated', { id: variation._id?.toString() });
    res.json({ variation });
  } catch (err) {
    next(err);
  }
}

export async function deleteVariation(req, res, next) {
  try {
    const { id } = req.params;
    const variation = await Variation.findOneAndDelete({ _id: id, tenant: req.tenantId });
    if (!variation) return res.status(404).json({ error: 'Variation not found' });
    broadcastMenuChanged(req, 'variation', 'deleted', { id });
    res.json({ success: true, message: 'Variation deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// ΓöÇΓöÇΓöÇ Bundles / Meal Deals ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export async function getBundles(req, res, next) {
  try {
    const query = { tenant: req.tenantId };
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }
    const bundles = await Bundle.find(query).populate('components.allowedCategoryIds').sort({ name: 1 });
    res.json({ bundles });
  } catch (err) {
    next(err);
  }
}

export async function createBundle(req, res, next) {
  try {
    const bundle = await Bundle.create({ tenant: req.tenantId, ...req.body });
    broadcastMenuChanged(req, 'bundle', 'created', { id: bundle._id?.toString() });
    res.status(201).json({ bundle });
  } catch (err) {
    next(err);
  }
}

export async function updateBundle(req, res, next) {
  try {
    const { id } = req.params;
    const bundle = await Bundle.findOneAndUpdate(
      { _id: id, tenant: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
    broadcastMenuChanged(req, 'bundle', 'updated', { id: bundle._id?.toString() });
    res.json({ bundle });
  } catch (err) {
    next(err);
  }
}

export async function deleteBundle(req, res, next) {
  try {
    const { id } = req.params;
    const bundle = await Bundle.findOneAndDelete({ _id: id, tenant: req.tenantId });
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
    broadcastMenuChanged(req, 'bundle', 'deleted', { id });
    res.json({ success: true, message: 'Bundle deleted successfully' });
  } catch (err) {
    next(err);
  }
}
