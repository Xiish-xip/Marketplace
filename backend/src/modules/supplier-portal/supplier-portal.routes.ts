import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import * as controller from './supplier-portal.controller';

const router = Router();
const supplier = [authenticate, authorize('SELLER', 'ADMIN', 'SUPER_ADMIN')];

router.get('/dashboard', ...supplier, controller.dashboard);
router.get('/products', ...supplier, controller.listProducts);
router.post('/products', ...supplier, controller.createProduct);
router.put('/products/:id', ...supplier, controller.updateProduct);
router.delete('/products/:id', ...supplier, controller.deleteProduct);
router.post('/products/bulk-upload', ...supplier, controller.bulkUpload);

router.get('/orders', ...supplier, controller.listOrders);
router.post('/orders/:id/accept', ...supplier, controller.acceptOrder);
router.post('/orders/:id/reject', ...supplier, controller.rejectOrder);
router.post('/orders/:id/ship', ...supplier, controller.shipOrder);
router.post('/orders/:id/label', ...supplier, controller.generateLabel);

router.get('/shipping', ...supplier, controller.listOrders);
router.get('/payouts', ...supplier, controller.payouts);
router.get('/analytics', ...supplier, controller.analytics);
router.get('/messages', ...supplier, controller.messages);
router.get('/settings', ...supplier, controller.settings);
router.put('/settings', ...supplier, controller.updateSettings);

export default router;
