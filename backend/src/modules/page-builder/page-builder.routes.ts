import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import {
  getComponentTypes,
  getComponentType,
  seedComponents,
  createLayout,
  getAllLayouts,
  getLayoutBySlug,
  getLayoutById,
  updateLayout,
  deleteLayout,
  duplicateLayout,
  addSection,
  updateSection,
  reorderSections,
  deleteSection,
  getPublishedLayout,
  getLayoutTree,
  saveLayoutTree,
  getPublishedLayoutTree,
  getActiveHeaderTree,
  getActiveFooterTree,
  getAllTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getSiteSettings,
  updateSiteSettings,
} from './page-builder.controller';

const router = Router();

// Composable admin auth middleware - accepts both ADMIN and SUPER_ADMIN roles
const adminAuth = [authenticate, authorize('ADMIN', 'SUPER_ADMIN')];

// ── Public ──
router.get('/published/:slug', getPublishedLayout);
router.get('/published-tree/active-header', getActiveHeaderTree);
router.get('/published-tree/active-footer', getActiveFooterTree);
router.get('/published-tree/:slug', getPublishedLayoutTree);

// ── Component Definitions (admin) ──
router.get('/components', ...adminAuth, getComponentTypes);
router.get('/components/:type', ...adminAuth, getComponentType);
router.post('/components/seed', ...adminAuth, seedComponents);

// ── Layouts (admin) ──
router.get('/layouts', ...adminAuth, getAllLayouts);
router.post('/layouts', ...adminAuth, createLayout);
router.get('/layouts/slug/:slug', ...adminAuth, getLayoutBySlug);
router.get('/layouts/:id', ...adminAuth, getLayoutById);
router.put('/layouts/:id', ...adminAuth, updateLayout);
router.delete('/layouts/:id', ...adminAuth, deleteLayout);
router.post('/layouts/:id/duplicate', ...adminAuth, duplicateLayout);

// ── JSON Tree API (admin) ──
router.get('/layouts/:id/tree', ...adminAuth, getLayoutTree);
router.put('/layouts/:id/tree', ...adminAuth, saveLayoutTree);

// ── Sections (admin) ──
router.post('/layouts/:layoutId/sections', ...adminAuth, addSection);
router.put('/sections/:id', ...adminAuth, updateSection);
router.put('/layouts/:layoutId/reorder', ...adminAuth, reorderSections);
router.delete('/sections/:id', ...adminAuth, deleteSection);

// ── Templates (Header/Footer) (admin) ──
router.get('/templates', ...adminAuth, getAllTemplates);
router.post('/templates', ...adminAuth, createTemplate);
router.put('/templates/:id', ...adminAuth, updateTemplate);
router.delete('/templates/:id', ...adminAuth, deleteTemplate);

// ── Site-wide Settings (admin) ──
router.get('/site-settings', ...adminAuth, getSiteSettings);
router.put('/site-settings', ...adminAuth, updateSiteSettings);

export default router;
