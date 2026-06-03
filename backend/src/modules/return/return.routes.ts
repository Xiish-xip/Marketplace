import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as returnController from './return.controller';

const router = Router();

// Customer routes
router.post('/', authenticate, returnController.create);
router.get('/my-returns', authenticate, returnController.getMyReturns);
router.get('/:id', authenticate, returnController.getById);

// Admin routes
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), returnController.getAll);
router.patch('/:id/status', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), returnController.updateStatus);
router.patch('/:id/approve', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), returnController.approve);
router.patch('/:id/reject', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), returnController.reject);
router.post('/:id/refund', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), returnController.refund);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), returnController.updateStatus);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), returnController.remove);

export default router;
