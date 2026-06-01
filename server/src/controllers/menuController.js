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
import { emitMenuAvailabilityChange } from '../config/socket.js';

function normalizeModifierOption(option) {
  const plain = option.toObject ? option.toObject({ virtuals: true }) : option;
  return { ...plain, pricePence: plain.pricePence ?? plain.priceDeltaPence ?? 0 };
}

function normalizeModifierGroup(group, assignment = null) {
  if (!group) return null;
  const plain = group.toObject ? group.toObject({ virtuals: true }) : group;
  const requiredOverride = assignment?.requiredOverride;
  const type = requiredOverride === true ? 'required' : requiredOverride === false ? 'optional' : plain.type;
  const minSelections = requiredOverride === true && !plain.minSelections ? 1 : (plain.minSelections ?? 0);
  return {
    ...plain,
    type,
    minSelections,
    minSelection: minSelections,
    maxSelection: plain.maxSelections ?? plain.maxSelection ?? 1,
    options: (plain.options || [])
      .filter(option => option.isAvailable !== false)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map(normalizeModifierOption),
  };
}

function normalizeMenuItem(item, channel = 'pos') {
  const plain = item.toObject ? item.toObject({ virtuals: true }) : item;
  const assignments = (plain.groupAssignments || [])
    .filter(assignment => assignment.isEnabled !== false)
    .filter(assignment => channel === 'website' ? assignment.showOnWebsite !== false : assignment.showOnPos !== false)
    .sort((a, b) => {
      const aOrder = channel === 'website' ? (a.websiteOrder || 0) : (a.posOrder || 0);
      const bOrder = channel === 'website' ? (b.websiteOrder || 0) : (b.posOrder || 0);
      return aOrder - bOrder;
    });
  const groupsFromAssignments = assignments.map(a => normalizeModifierGroup(a.group, a)).filter(Boolean);
  const fallbackGroups = (plain.modifierGroups || []).map(g => normalizeModifierGroup(g)).filter(Boolean);
  return {
    ...plain,
    pricePence: plain.pricePence ?? plain.basePricePence,
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
    showOnPos: true,
    showOnWebsite: true,
  }));
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function getCategories(req, res, next) {
  try {
    const query = { tenant: req.tenantId };
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }
    const categories = await Category.find(query)
      .populate('parent')
      .populate('department')
      .sort({ displayOrder: 1 });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req, res, next) {
  try {
    const { name, slug, description, imageUrl, displayOrder, availabilitySchedule, color, parent, department, backgroundColor, textColor } = req.body;
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
      color,
      parent: parent || null,
      department: department || null,
      backgroundColor: backgroundColor || '#f59e0b',
      textColor: textColor || '#ffffff',
    });

    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const category = await Category.findOneAndUpdate(
      { _id: id, tenant: req.tenantId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

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

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// ─── Menu Items ───────────────────────────────────────────────────────────────

export async function getMenuItems(req, res, next) {
  try {
    const { categoryId, isAvailable, search, isFeatured, channel } = req.query;
    const query = { tenant: req.tenantId };

    if (categoryId) query.category = categoryId;
    if (isFeatured !== undefined) query.isFeatured = isFeatured === 'true';
    if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true';
    if (channel && ['pos', 'website', 'mobile'].includes(channel)) {
      query[`channels.${channel}`] = { $ne: false };
    }

    if (search) {
      query.$text = { $search: search };
    }

    const items = await MenuItem.find(query)
      .populate({ path: 'category', populate: { path: 'department' } })
      .populate('department')
      .populate('modifierGroups')
      .populate('groupAssignments.group')
      .populate('variations')
      .sort({ sortOrder: 1 });

    res.json({ items: items.map(item => normalizeMenuItem(item, channel || 'pos')) });
  } catch (err) {
    next(err);
  }
}

export async function getMenuItem(req, res, next) {
  try {
    const { id } = req.params;
    const item = await MenuItem.findOne({ _id: id, tenant: req.tenantId })
      .populate({ path: 'category', populate: { path: 'department' } })
      .populate('department')
      .populate('modifierGroups')
      .populate('groupAssignments.group')
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
      isFeatured,
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
      isFeatured: isFeatured !== undefined ? isFeatured : false,
      availabilitySchedule,
      sortOrder: sortOrder || 0,
      backgroundColor,
      textColor,
      printOption,
      shorthand,
      isManual,
    });

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

    const item = await MenuItem.findOneAndUpdate(
      { _id: id, tenant: req.tenantId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

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

    res.json({ success: true, count: itemIds.length });
  } catch (err) {
    next(err);
  }
}

// ─── Modifier Groups ──────────────────────────────────────────────────────────

export async function getModifierGroups(req, res, next) {
  try {
    const query = { tenant: req.tenantId };
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }
    const modifiers = await ModifierGroup.find(query)
      .populate('allowedLabelIds')
      .populate('options.component')
      .sort({ createdAt: -1 });
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
      type: type || 'optional',
      selectionType: selectionType || 'single',
      minSelections: minSelections || 0,
      maxSelections: maxSelections || 1,
      options,
    });

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

    res.json({ success: true, message: 'Modifier group deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// ─── Components ──────────────────────────────────────────────────────────────

export async function getComponents(req, res, next) {
  try {
    const components = await Component.find({ tenant: req.tenantId }).sort({ name: 1 });
    res.json({ components });
  } catch (err) {
    next(err);
  }
}

export async function createComponent(req, res, next) {
  try {
    const component = await Component.create({ tenant: req.tenantId, ...req.body });
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
    res.json({ success: true, message: 'Component deleted' });
  } catch (err) {
    next(err);
  }
}

// ─── Labels ──────────────────────────────────────────────────────────────────

export async function getLabels(req, res, next) {
  try {
    const labels = await Label.find({ tenant: req.tenantId }).sort({ name: 1 });
    res.json({ labels });
  } catch (err) {
    next(err);
  }
}

export async function createLabel(req, res, next) {
  try {
    const label = await Label.create({ tenant: req.tenantId, ...req.body });
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
    res.json({ label });
  } catch (err) {
    next(err);
  }
}

export async function deleteLabel(req, res, next) {
  try {
    const { id } = req.params;
    const label = await Label.findOneAndDelete({ _id: id, tenant: req.tenantId });
    if (!label) return res.status(404).json({ error: 'Label not found' });
    res.json({ success: true, message: 'Label deleted' });
  } catch (err) {
    next(err);
  }
}

// ─── Departments ─────────────────────────────────────────────────────────────

export async function getDepartments(req, res, next) {
  try {
    const departments = await Department.find({ tenant: req.tenantId }).sort({ name: 1 });
    res.json({ departments });
  } catch (err) {
    next(err);
  }
}

export async function createDepartment(req, res, next) {
  try {
    const department = await Department.create({ tenant: req.tenantId, ...req.body });
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
    res.json({ department });
  } catch (err) {
    next(err);
  }
}

export async function deleteDepartment(req, res, next) {
  try {
    const { id } = req.params;
    const referenced = await Category.exists({ tenant: req.tenantId, department: id });
    if (referenced) {
      return res.status(400).json({ error: 'Cannot delete department linked to categories' });
    }
    const department = await Department.findOneAndDelete({ _id: id, tenant: req.tenantId });
    if (!department) return res.status(404).json({ error: 'Department not found' });
    res.json({ success: true, message: 'Department deleted' });
  } catch (err) {
    next(err);
  }
}

// ─── Manual Products ──────────────────────────────────────────────────────────

export async function getManualProducts(req, res, next) {
  try {
    const manualProducts = await ManualProduct.find({ tenant: req.tenantId }).populate('category').sort({ name: 1 });
    res.json({ manualProducts });
  } catch (err) {
    next(err);
  }
}

export async function createManualProduct(req, res, next) {
  try {
    const manualProduct = await ManualProduct.create({ tenant: req.tenantId, ...req.body });
    res.status(201).json({ manualProduct });
  } catch (err) {
    next(err);
  }
}

export async function updateManualProduct(req, res, next) {
  try {
    const { id } = req.params;
    const manualProduct = await ManualProduct.findOneAndUpdate(
      { _id: id, tenant: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!manualProduct) return res.status(404).json({ error: 'Manual product not found' });
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
    res.json({ success: true, message: 'Manual product deleted' });
  } catch (err) {
    next(err);
  }
}

// ─── Short Hands ─────────────────────────────────────────────────────────────

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
    res.json({ success: true, message: 'ShortHand deleted' });
  } catch (err) {
    next(err);
  }
}

// ─── Product Times ────────────────────────────────────────────────────────────

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
    res.json({ success: true, message: 'ProductTime deleted' });
  } catch (err) {
    next(err);
  }
}

// ─── Variations ──────────────────────────────────────────────────────────────

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
    res.status(201).json({ variation });
  } catch (err) {
    next(err);
  }
}

export async function updateVariation(req, res, next) {
  try {
    const { id } = req.params;
    const variation = await Variation.findOneAndUpdate(
      { _id: id, tenant: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!variation) return res.status(404).json({ error: 'Variation not found' });
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
    res.json({ success: true, message: 'Variation deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// ─── Bundles / Meal Deals ────────────────────────────────────────────────────

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
    res.json({ success: true, message: 'Bundle deleted successfully' });
  } catch (err) {
    next(err);
  }
}
