import { Router } from 'express';
import { authenticate, requireManager, requireAdmin } from '../middleware/auth.js';
import {
  getDebugDbTemp,
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
menuRoutes.get('/debug-db-temp', getDebugDbTemp);                      // Temporary Debug
menuRoutes.get('/categories', getCategories);                          // Public
menuRoutes.post('/categories', authenticate, requireAdmin, createCategory);
menuRoutes.put('/categories/:id', authenticate, requireAdmin, updateCategory);
menuRoutes.delete('/categories/:id', authenticate, requireAdmin, deleteCategory);

// ─── Menu Items ───────────────────────────────────────────────────────────────
menuRoutes.get('/items', getMenuItems);                                // Public
menuRoutes.get('/items/:id', getMenuItem);                             // Public
menuRoutes.post('/items', authenticate, requireAdmin, createMenuItem);
menuRoutes.put('/items/:id', authenticate, requireAdmin, updateMenuItem);
menuRoutes.delete('/items/:id', authenticate, requireAdmin, deleteMenuItem);
menuRoutes.patch('/items/:id/availability', authenticate, requireManager, toggleAvailability);
menuRoutes.post('/items/bulk-availability', authenticate, requireManager, bulkToggleAvailability);

// ─── Modifier Groups ──────────────────────────────────────────────────────────
menuRoutes.get('/modifiers', authenticate, getModifierGroups);
menuRoutes.post('/modifiers', authenticate, requireAdmin, createModifierGroup);
menuRoutes.put('/modifiers/:id', authenticate, requireAdmin, updateModifierGroup);
menuRoutes.delete('/modifiers/:id', authenticate, requireAdmin, deleteModifierGroup);

// ─── Components ──────────────────────────────────────────────────────────────
menuRoutes.get('/components', authenticate, getComponents);
menuRoutes.post('/components', authenticate, requireAdmin, createComponent);
menuRoutes.put('/components/:id', authenticate, requireAdmin, updateComponent);
menuRoutes.delete('/components/:id', authenticate, requireAdmin, deleteComponent);

// ─── Labels ──────────────────────────────────────────────────────────────────
menuRoutes.get('/labels', getLabels);
menuRoutes.post('/labels', authenticate, requireAdmin, createLabel);
menuRoutes.put('/labels/:id', authenticate, requireAdmin, updateLabel);
menuRoutes.delete('/labels/:id', authenticate, requireAdmin, deleteLabel);

// ─── Departments ─────────────────────────────────────────────────────────────
menuRoutes.get('/departments', authenticate, getDepartments);
menuRoutes.post('/departments', authenticate, requireAdmin, createDepartment);
menuRoutes.put('/departments/:id', authenticate, requireAdmin, updateDepartment);
menuRoutes.delete('/departments/:id', authenticate, requireAdmin, deleteDepartment);

// ─── Manual Products ──────────────────────────────────────────────────────────
menuRoutes.get('/manual-products', authenticate, getManualProducts);
menuRoutes.post('/manual-products', authenticate, requireAdmin, createManualProduct);
menuRoutes.put('/manual-products/:id', authenticate, requireAdmin, updateManualProduct);
menuRoutes.delete('/manual-products/:id', authenticate, requireAdmin, deleteManualProduct);

// ─── Short Hands ─────────────────────────────────────────────────────────────
menuRoutes.get('/shorthands', authenticate, getShortHands);
menuRoutes.post('/shorthands', authenticate, requireAdmin, createShortHand);
menuRoutes.put('/shorthands/:id', authenticate, requireAdmin, updateShortHand);
menuRoutes.delete('/shorthands/:id', authenticate, requireAdmin, deleteShortHand);

// ─── Product Times ────────────────────────────────────────────────────────────
menuRoutes.get('/product-times', authenticate, getProductTimes);
menuRoutes.post('/product-times', authenticate, requireAdmin, createProductTime);
menuRoutes.put('/product-times/:id', authenticate, requireAdmin, updateProductTime);
menuRoutes.delete('/product-times/:id', authenticate, requireAdmin, deleteProductTime);

// ─── Variations ──────────────────────────────────────────────────────────────
menuRoutes.get('/variations', getVariations);                          // Public
menuRoutes.post('/variations', authenticate, requireAdmin, createVariation);
menuRoutes.put('/variations/:id', authenticate, requireAdmin, updateVariation);
menuRoutes.delete('/variations/:id', authenticate, requireAdmin, deleteVariation);

// ─── Bundles ──────────────────────────────────────────────────────────────────
menuRoutes.get('/bundles', getBundles);                                // Public
menuRoutes.post('/bundles', authenticate, requireAdmin, createBundle);
menuRoutes.put('/bundles/:id', authenticate, requireAdmin, updateBundle);
menuRoutes.delete('/bundles/:id', authenticate, requireAdmin, deleteBundle);
