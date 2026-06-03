import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as pagesController from './pages.controller';

const router = Router();
const adminAuth = [authenticate, authorize('ADMIN', 'SUPER_ADMIN')];

// Public routes
router.get('/slug/:slug', pagesController.getPage);
router.get('/category/:category', pagesController.getPagesByCategory);

// Admin routes
router.get('/', ...adminAuth, pagesController.listPages);
router.post('/', ...adminAuth, pagesController.createPage);
router.get('/:id', ...adminAuth, pagesController.getPageById);
router.put('/:id', ...adminAuth, pagesController.updatePage);
router.patch('/:id/publish', ...adminAuth, pagesController.publishPage);
router.patch('/:id/unpublish', ...adminAuth, pagesController.unpublishPage);
router.delete('/:id', ...adminAuth, pagesController.deletePage);

export default router;
