import { Router } from 'express';
import { authenticate, requireManager, requireAdmin } from '../middleware/auth.js';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  bulkToggleAvailability,
  getModifierGroups,
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
  getComponents,
  createComponent,
  updateComponent,
  deleteComponent,
  getLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getManualProducts,
  createManualProduct,
  updateManualProduct,
  deleteManualProduct,
  getShortHands,
  createShortHand,
  updateShortHand,
  deleteShortHand,
  getProductTimes,
  createProductTime,
  updateProductTime,
  deleteProductTime,
  getVariations,
  createVariation,
  updateVariation,
  deleteVariation,
  getBundles,
  createBundle,
  updateBundle,
  deleteBundle
} from '../controllers/menuController.js';

export const menuRoutes = Router();

// ─── Categories ──────────────────────────────────────────────────────────────
menuRoutes.get('/categories', getCategories);                          // Public
menuRoutes.post('/categories', authenticate, requireManager, createCategory);
menuRoutes.put('/categories/:id', authenticate, requireManager, updateCategory);
menuRoutes.delete('/categories/:id', authenticate, requireManager, deleteCategory);

// ─── Menu Items ───────────────────────────────────────────────────────────────
menuRoutes.get('/items', getMenuItems);                                // Public
menuRoutes.get('/items/:id', getMenuItem);                             // Public
menuRoutes.post('/items', authenticate, requireManager, createMenuItem);
menuRoutes.put('/items/:id', authenticate, requireManager, updateMenuItem);
menuRoutes.delete('/items/:id', authenticate, requireManager, deleteMenuItem);
menuRoutes.patch('/items/:id/availability', authenticate, requireManager, toggleAvailability);
menuRoutes.post('/items/bulk-availability', authenticate, requireManager, bulkToggleAvailability);

// ─── Modifier Groups ──────────────────────────────────────────────────────────
menuRoutes.get('/modifiers', authenticate, getModifierGroups);
menuRoutes.post('/modifiers', authenticate, requireManager, createModifierGroup);
menuRoutes.put('/modifiers/:id', authenticate, requireManager, updateModifierGroup);
menuRoutes.delete('/modifiers/:id', authenticate, requireManager, deleteModifierGroup);

// ─── Components ──────────────────────────────────────────────────────────────
menuRoutes.get('/components', authenticate, getComponents);
menuRoutes.post('/components', authenticate, requireManager, createComponent);
menuRoutes.put('/components/:id', authenticate, requireManager, updateComponent);
menuRoutes.delete('/components/:id', authenticate, requireManager, deleteComponent);

// ─── Labels ──────────────────────────────────────────────────────────────────
menuRoutes.get('/labels', getLabels);
menuRoutes.post('/labels', authenticate, requireManager, createLabel);
menuRoutes.put('/labels/:id', authenticate, requireManager, updateLabel);
menuRoutes.delete('/labels/:id', authenticate, requireManager, deleteLabel);

// ─── Departments ─────────────────────────────────────────────────────────────
menuRoutes.get('/departments', authenticate, getDepartments);
menuRoutes.post('/departments', authenticate, requireManager, createDepartment);
menuRoutes.put('/departments/:id', authenticate, requireManager, updateDepartment);
menuRoutes.delete('/departments/:id', authenticate, requireManager, deleteDepartment);

// ─── Manual Products ──────────────────────────────────────────────────────────
menuRoutes.get('/manual-products', authenticate, getManualProducts);
menuRoutes.post('/manual-products', authenticate, requireManager, createManualProduct);
menuRoutes.put('/manual-products/:id', authenticate, requireManager, updateManualProduct);
menuRoutes.delete('/manual-products/:id', authenticate, requireManager, deleteManualProduct);

// ─── Short Hands ─────────────────────────────────────────────────────────────
menuRoutes.get('/shorthands', authenticate, getShortHands);
menuRoutes.post('/shorthands', authenticate, requireManager, createShortHand);
menuRoutes.put('/shorthands/:id', authenticate, requireManager, updateShortHand);
menuRoutes.delete('/shorthands/:id', authenticate, requireManager, deleteShortHand);

// ─── Product Times ────────────────────────────────────────────────────────────
menuRoutes.get('/product-times', authenticate, getProductTimes);
menuRoutes.post('/product-times', authenticate, requireManager, createProductTime);
menuRoutes.put('/product-times/:id', authenticate, requireManager, updateProductTime);
menuRoutes.delete('/product-times/:id', authenticate, requireManager, deleteProductTime);

// ─── Variations ──────────────────────────────────────────────────────────────
menuRoutes.get('/variations', getVariations);                          // Public
menuRoutes.post('/variations', authenticate, requireManager, createVariation);
menuRoutes.put('/variations/:id', authenticate, requireManager, updateVariation);
menuRoutes.delete('/variations/:id', authenticate, requireManager, deleteVariation);

// ─── Bundles ──────────────────────────────────────────────────────────────────
menuRoutes.get('/bundles', getBundles);                                // Public
menuRoutes.post('/bundles', authenticate, requireManager, createBundle);
menuRoutes.put('/bundles/:id', authenticate, requireManager, updateBundle);
menuRoutes.delete('/bundles/:id', authenticate, requireManager, deleteBundle);
